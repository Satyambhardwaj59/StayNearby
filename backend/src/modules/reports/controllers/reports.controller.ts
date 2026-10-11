import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ReportModel, REPORT_REASONS, REPORT_STATUSES, type ReportStatus } from '../models/report.model';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { sendSuccess, sendCreated } from '../../../shared/response';

export async function createReport(req: Request, res: Response): Promise<Response> {
  const reporterId = req.user?.userId;
  if (!reporterId) throw new BadRequestError('User required');

  const { propertyId, reportedUserId, reason, details } = req.body;

  if (!propertyId && !reportedUserId) {
    throw new BadRequestError('Either propertyId or reportedUserId is required');
  }

  if (!reason || !REPORT_REASONS.includes(reason)) {
    throw new BadRequestError(`Invalid reason. Must be one of: ${REPORT_REASONS.join(', ')}`);
  }

  if (!details || typeof details !== 'string' || details.trim().length === 0) {
    throw new BadRequestError('Details are required');
  }

  const report = await ReportModel.create({
    reporterId: new Types.ObjectId(reporterId),
    propertyId: propertyId ? new Types.ObjectId(propertyId) : null,
    reportedUserId: reportedUserId ? new Types.ObjectId(reportedUserId) : null,
    reason,
    details: details.trim(),
  });

  return sendCreated(res, report);
}

export async function listReports(req: Request, res: Response): Promise<Response> {
  const { status } = req.query as { status?: ReportStatus };
  const filter: Record<string, unknown> = {};

  if (status && REPORT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const reports = await ReportModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('reporterId', 'name email')
    .populate('propertyId', 'title slug')
    .populate('reportedUserId', 'name email')
    .lean()
    .exec();

  return sendSuccess(res, reports);
}

export async function updateReportStatus(req: Request, res: Response): Promise<Response> {
  const id = String(req.params.id);
  const { status, moderatorNotes } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid report ID');
  }

  if (!status || !REPORT_STATUSES.includes(status)) {
    throw new BadRequestError(`Invalid status. Must be one of: ${REPORT_STATUSES.join(', ')}`);
  }

  const report = await ReportModel.findByIdAndUpdate(
    id,
    {
      status,
      ...(moderatorNotes !== undefined ? { moderatorNotes: String(moderatorNotes).trim() } : {}),
    },
    { new: true },
  );

  if (!report) {
    throw new NotFoundError('Report not found');
  }

  return sendSuccess(res, report);
}
