import { Types } from 'mongoose';
import { PropertyModel, type Property } from '../models/property.model';
import type { ListingStatus, VerificationStatus } from '../../../shared/constants/property';

export const propertyRepository = {
  isValidId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  },

  findById(id: string) {
    return PropertyModel.findById(id).exec();
  },

  findBySlug(slug: string) {
    return PropertyModel.findOne({ slug }).exec();
  },

  findByIdAndOwner(id: string, ownerId: string) {
    return PropertyModel.findOne({ _id: id, ownerId }).exec();
  },

  create(input: Partial<Property>) {
    return PropertyModel.create(input);
  },

  update(id: string, patch: Partial<Property>) {
    return PropertyModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).exec();
  },

  incrementViews(id: string) {
    return PropertyModel.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } }).exec();
  },

  incrementFavorites(id: string, delta: 1 | -1) {
    return PropertyModel.findByIdAndUpdate(id, { $inc: { favoritesCount: delta } }).exec();
  },

  setListingStatus(id: string, status: ListingStatus, extra: Partial<Property> = {}) {
    return PropertyModel.findByIdAndUpdate(
      id,
      { $set: { listingStatus: status, ...extra } },
      { new: true },
    ).exec();
  },

  setVerificationStatus(id: string, status: VerificationStatus, note?: string) {
    const update: Partial<Property> = { verificationStatus: status };
    if (note) update.moderationNote = note;
    return PropertyModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
  },

  /** Owner's listings with pagination */
  findByOwner(
    ownerId: string,
    filter: { listingStatus?: string; search?: string; skip: number; limit: number },
  ) {
    const query: Record<string, unknown> = { ownerId };
    if (filter.listingStatus) query.listingStatus = filter.listingStatus;
    if (filter.search) {
      query.$or = [{ title: new RegExp(filter.search, 'i') }];
    }
    return Promise.all([
      PropertyModel.find(query)
        .sort({ createdAt: -1 })
        .skip(filter.skip)
        .limit(filter.limit)
        .lean()
        .exec(),
      PropertyModel.countDocuments(query),
    ]);
  },

  /** Published properties by city/locality for SEO landing pages */
  findPublishedByLocation(
    filter: {
      citySlug?: string;
      localitySlug?: string;
      propertyType?: string;
    },
    skip = 0,
    limit = 20,
  ) {
    const query: Record<string, unknown> = { listingStatus: 'PUBLISHED' };
    if (filter.citySlug) query.citySlug = filter.citySlug;
    if (filter.localitySlug) query.localitySlug = filter.localitySlug;
    if (filter.propertyType) query.propertyType = filter.propertyType;
    return Promise.all([
      PropertyModel.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      PropertyModel.countDocuments(query),
    ]);
  },

  /** Related properties for property detail page */
  findRelated(
    options: { citySlug: string; propertyType: Property['propertyType']; excludeId: string },
    limit = 6,
  ) {
    return PropertyModel.find({
      listingStatus: 'PUBLISHED',
      citySlug: options.citySlug,
      propertyType: options.propertyType,
      _id: { $ne: options.excludeId },
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  },

  /** Geospatial radius search */
  findNearby(
    coordinates: [number, number],
    radiusMeters: number,
    filter: Record<string, unknown> = {},
    limit = 20,
  ) {
    return PropertyModel.find({
      listingStatus: 'PUBLISHED',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates },
          $maxDistance: radiusMeters,
        },
      },
      ...filter,
    })
      .limit(limit)
      .lean()
      .exec();
  },

  /** Admin: all properties with filters */
  listForAdmin(filter: {
    listingStatus?: string;
    verificationStatus?: string;
    citySlug?: string;
    search?: string;
    skip: number;
    limit: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filter.listingStatus) query.listingStatus = filter.listingStatus;
    if (filter.verificationStatus) query.verificationStatus = filter.verificationStatus;
    if (filter.citySlug) query.citySlug = filter.citySlug;
    if (filter.search) {
      query.$or = [
        { title: new RegExp(filter.search, 'i') },
        { slug: new RegExp(filter.search, 'i') },
      ];
    }
    return Promise.all([
      PropertyModel.find(query)
        .sort({ createdAt: -1 })
        .skip(filter.skip)
        .limit(filter.limit)
        .lean()
        .exec(),
      PropertyModel.countDocuments(query),
    ]);
  },

  countPublishedByCity() {
    return PropertyModel.aggregate<{ _id: string; count: number }>([
      { $match: { listingStatus: 'PUBLISHED' } },
      { $group: { _id: '$citySlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  },

  countAll() {
    return PropertyModel.countDocuments().exec();
  },

  countByStatus() {
    return PropertyModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$listingStatus', count: { $sum: 1 } } },
    ]).exec();
  },

  findExpiring(before: Date) {
    return PropertyModel.find({
      listingStatus: 'PUBLISHED',
      expiresAt: { $lte: before },
    })
      .select('_id ownerId title expiresAt')
      .lean()
      .exec();
  },

  /** Sitemap: all published slugs with updatedAt */
  allPublishedSlugs() {
    return PropertyModel.find({ listingStatus: 'PUBLISHED' })
      .select('slug updatedAt citySlug localitySlug')
      .lean()
      .exec();
  },
};
