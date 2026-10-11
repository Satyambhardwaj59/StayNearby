import type { UserRole } from '../shared/constants';

export interface AuthPrincipal {
  userId: string;
  role: UserRole;
  sessionId: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthPrincipal;
    }
  }
}
