import type { Request, Response } from 'express';
import { PropertyModel } from '../../properties/models/property.model';
import { UserModel } from '../../users/models/user.model';
import { VisitModel } from '../../visits/models/visit.model';
import { ReportModel } from '../../reports/models/report.model';
import { sendSuccess } from '../../../shared/response';
import { checkRedisHealth } from '../../../infrastructure/redis/client';
import mongoose from 'mongoose';

export async function getDashboardStats(_req: Request, res: Response): Promise<Response> {
  const [
    totalUsers,
    usersByRole,
    totalProperties,
    propertiesByStatus,
    totalVisits,
    pendingReports,
    pendingModerationCount,
  ] = await Promise.all([
    UserModel.countDocuments().exec(),
    UserModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    PropertyModel.countDocuments().exec(),
    PropertyModel.aggregate([{ $group: { _id: '$listingStatus', count: { $sum: 1 } } }]),
    VisitModel.countDocuments().exec(),
    ReportModel.countDocuments({ status: 'OPEN' }).exec(),
    PropertyModel.countDocuments({ listingStatus: 'PENDING_REVIEW' }).exec(),
  ]);

  return sendSuccess(res, {
    users: {
      total: totalUsers,
      breakdown: usersByRole.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    },
    properties: {
      total: totalProperties,
      breakdown: propertiesByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    },
    visits: {
      total: totalVisits,
    },
    moderation: {
      pendingListings: pendingModerationCount,
      openReports: pendingReports,
    },
  });
}

export async function getModerationQueue(req: Request, res: Response): Promise<Response> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    $or: [{ listingStatus: 'PENDING_REVIEW' as const }, { verificationStatus: 'PENDING' as const }],
  };

  const [items, total] = await Promise.all([
    PropertyModel.find(filter)
      .sort({ updatedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'name email phone avatar')
      .lean()
      .exec(),
    PropertyModel.countDocuments(filter).exec(),
  ]);

  return sendSuccess(res, items, {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function getSystemHealth(_req: Request, res: Response): Promise<Response> {
  const redisHealth = await checkRedisHealth();
  const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';

  return sendSuccess(res, {
    status: dbStatus === 'up' && redisHealth.status !== 'down' ? 'healthy' : 'degraded',
    database: {
      status: dbStatus,
      name: mongoose.connection.name,
    },
    redis: redisHealth,
    process: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    },
  });
}
