import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { limiters } from '../../../middleware/rateLimit';
import { validateBody } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/auth.controller';
import {
  changePasswordSchema,
  emailOnlySchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestPhoneVerificationSchema,
  resetPasswordSchema,
  revokeSessionSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
} from '../schemas/auth.schema';

/**
 * /api/v1/auth
 *
 * Rate limits are declared per route: credential and OTP endpoints use the
 * strictest buckets.
 */
export const authRouter = Router();

authRouter.post(
  '/register',
  limiters.register(),
  validateBody(registerSchema),
  asyncHandler(controller.register),
);
authRouter.post(
  '/login',
  limiters.login(),
  validateBody(loginSchema),
  asyncHandler(controller.login),
);
authRouter.post(
  '/refresh',
  limiters.refresh(),
  validateBody(refreshTokenSchema),
  asyncHandler(controller.refresh),
);
authRouter.post('/logout', authenticate, asyncHandler(controller.logout));
authRouter.post('/logout-all', authenticate, asyncHandler(controller.logoutAll));

authRouter.get('/me', authenticate, asyncHandler(controller.me));
authRouter.get('/sessions', authenticate, asyncHandler(controller.listSessions));
authRouter.post(
  '/sessions/revoke',
  authenticate,
  validateBody(revokeSessionSchema),
  asyncHandler(controller.revokeSession),
);

authRouter.post(
  '/email/verify/request',
  limiters.otpRequest(),
  validateBody(emailOnlySchema),
  asyncHandler(controller.requestEmailVerification),
);
authRouter.post(
  '/email/verify',
  limiters.otpVerify(),
  validateBody(verifyEmailSchema),
  asyncHandler(controller.verifyEmail),
);

authRouter.post(
  '/phone/verify/request',
  authenticate,
  limiters.otpRequest(),
  validateBody(requestPhoneVerificationSchema),
  asyncHandler(controller.requestPhoneVerification),
);
authRouter.post(
  '/phone/verify',
  authenticate,
  limiters.otpVerify(),
  validateBody(verifyPhoneSchema),
  asyncHandler(controller.verifyPhone),
);

authRouter.post(
  '/password/forgot',
  limiters.passwordReset(),
  validateBody(forgotPasswordSchema),
  asyncHandler(controller.forgotPassword),
);
authRouter.post(
  '/password/reset',
  limiters.passwordReset(),
  validateBody(resetPasswordSchema),
  asyncHandler(controller.resetPassword),
);
authRouter.post(
  '/password/change',
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
