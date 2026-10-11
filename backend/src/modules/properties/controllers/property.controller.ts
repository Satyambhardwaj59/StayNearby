import type { Request, Response } from 'express';
import { NotFoundError } from '../../../shared/errors';
import { sendSuccess, sendCreated } from '../../../shared/response';
import { buildOffsetMeta } from '../../../shared/pagination';
import * as propertyService from '../services/property.service';
import { propertyRepository } from '../repositories/property.repository';
import type { Property } from '../models/property.model';

export async function createProperty(req: Request, res: Response): Promise<void> {
  const doc = await propertyService.createDraft(
    req.user!.userId,
    req.body as Partial<Property>,
  );
  sendCreated(res, { property: doc }, 'Property draft created');
}

export async function updateProperty(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const doc = await propertyService.updateDraft(
    propertyId,
    req.user!.userId,
    req.body as Partial<Property>,
  );
  sendSuccess(res, { property: doc }, { message: 'Property updated' });
}

export async function submitForReview(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const doc = await propertyService.submitForReview(
    propertyId,
    req.user!.userId,
  );
  sendSuccess(res, { property: doc }, { message: 'Submitted for review' });
}

export async function getPropertyBySlug(req: Request, res: Response): Promise<void> {
  const slug = String(req.params.slug);
  const result = await propertyService.getPropertyDetail(slug, {
    userId: req.user?.userId,
    trackView: true,
  });
  sendSuccess(res, result);
}

export async function getPropertyById(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const property = await propertyRepository.findById(propertyId);
  if (!property) throw new NotFoundError('Property');
  sendSuccess(res, { property: property.toObject() });
}

export async function listMyProperties(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '20', listingStatus, search } = req.query as Record<string, string>;
  const p = Number(page);
  const l = Number(limit);
  const skip = (p - 1) * l;

  const [properties, total] = await propertyRepository.findByOwner(req.user!.userId, {
    listingStatus,
    search,
    skip,
    limit: l,
  });
  sendSuccess(res, { properties }, { meta: buildOffsetMeta(total, p, l) });
}

export async function getNearbyProperties(req: Request, res: Response): Promise<void> {
  const { latitude, longitude, radiusMeters = '5000', limit = '20' } = req.query as Record<
    string,
    string
  >;
  const properties = await propertyRepository.findNearby(
    [Number(longitude), Number(latitude)],
    Number(radiusMeters),
    {},
    Number(limit),
  );
  sendSuccess(res, {
    properties: properties.map((p) =>
      propertyService.toPropertyCard(p as unknown as Record<string, unknown>),
    ),
  });
}

export async function publishProperty(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const doc = await propertyService.publishProperty(
    propertyId,
    req.user!.userId,
    req.user!.role,
  );
  sendSuccess(res, { property: doc }, { message: 'Property published' });
}

export async function rejectProperty(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const { reason } = req.body as { reason?: string };
  const doc = await propertyService.rejectProperty(
    propertyId,
    reason ?? 'Policy violation',
    req.user!.role,
  );
  sendSuccess(res, { property: doc }, { message: 'Property rejected' });
}

export async function deactivateProperty(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const doc = await propertyService.deactivateProperty(
    propertyId,
    req.user!.userId,
    req.user!.role,
  );
  sendSuccess(res, { property: doc }, { message: 'Property deactivated' });
}

export async function reserveProperty(req: Request, res: Response): Promise<void> {
  const propertyId = String(req.params.propertyId);
  const property = await propertyRepository.findById(propertyId);
  if (!property || property.listingStatus !== 'PUBLISHED') throw new NotFoundError('Property');
  const updated = await propertyRepository.setListingStatus(propertyId, 'RESERVED');
  sendSuccess(res, { property: updated }, { message: 'Property reserved' });
}
