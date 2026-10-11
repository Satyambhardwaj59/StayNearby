import type { Request, Response } from 'express';
import { AuthorizationError, NotFoundError } from '../../../shared/errors';
import { sendSuccess } from '../../../shared/response';
import { buildOffsetMeta } from '../../../shared/pagination';
import * as userService from '../services/user.service';
import { userRepository } from '../repositories/user.repository';

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await userService.getMyProfile(req.user!.userId);
  sendSuccess(res, { user });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await userService.updateMyProfile(
    req.user!.userId,
    req.body as Record<string, unknown>,
  );
  sendSuccess(res, { user }, { message: 'Profile updated' });
}

export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.userId);
  if (!userRepository.isValidId(userId)) {
    throw new NotFoundError('User');
  }
  const user = await userService.getPublicProfile(userId);
  sendSuccess(res, { user });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page, limit, role, status, search } = req.query as {
    page: string;
    limit: string;
    role?: string;
    status?: string;
    search?: string;
  };
  const p = Number(page ?? 1);
  const l = Number(limit ?? 20);
  const skip = (p - 1) * l;

  const [users, total] = await userRepository.listForAdmin({ role, status, search, skip, limit: l });
  sendSuccess(res, { users }, { meta: buildOffsetMeta(total, p, l) });
}

export async function setUserStatus(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.userId);
  if (!userRepository.isValidId(userId)) {
    throw new NotFoundError('User');
  }
  // Prevent moderators from suspending admins
  const target = await userRepository.findById(userId);
  if (!target) throw new NotFoundError('User');
  if (target.role === 'ADMIN' && req.user!.role !== 'ADMIN') {
    throw new AuthorizationError('Only admins can change the status of another admin');
  }

  const { status } = req.body as { status: string };
  const user = await userRepository.setStatus(userId, status as 'ACTIVE' | 'SUSPENDED' | 'DELETED');
  sendSuccess(res, { user }, { message: 'User status updated' });
}

export async function setUserRole(req: Request, res: Response): Promise<void> {
  const userId = String(req.params.userId);
  if (!userRepository.isValidId(userId)) {
    throw new NotFoundError('User');
  }
  const { role } = req.body as { role: string };
  const user = await userRepository.setRole(userId, role as 'TENANT' | 'OWNER' | 'MODERATOR' | 'ADMIN');
  sendSuccess(res, { user }, { message: 'User role updated' });
}
