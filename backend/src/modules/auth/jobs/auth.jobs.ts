import { QUEUE_NAMES } from '../../../infrastructure/queue/queue';
import { registerJobHandler } from '../../../jobs';
import { logger } from '../../../shared/logger';
import { sendEmail } from '../../../infrastructure/email';
import {
  passwordResetEmail,
  phoneVerificationEmail,
  verificationCodeEmail,
  welcomeEmail,
} from '../../../infrastructure/email/templates';
import { sendSms } from '../../../infrastructure/sms';

/** Auth-related queue handlers: OTP delivery and periodic pruning. */
export function registerAuthJobs(): void {
  registerJobHandler(QUEUE_NAMES.email, 'deliver-otp', async (payload) => {
    const job = payload as {
      identifier?: string;
      code?: string;
      purpose?: string;
      recipientName?: string;
    };
    if (!job.identifier || !job.code) {
      return;
    }

    const template =
      job.purpose === 'PASSWORD_RESET'
        ? passwordResetEmail(job.code, job.recipientName)
        : job.purpose === 'PHONE_VERIFICATION'
          ? phoneVerificationEmail(job.code)
          : verificationCodeEmail(job.code, job.recipientName);

    await sendEmail({
      to: job.identifier,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  });

  registerJobHandler(QUEUE_NAMES.email, 'welcome', async (payload) => {
    const data = payload as { to?: string; name?: string };
    if (!data.to) {
      return;
    }
    const template = welcomeEmail(data.name ?? 'there');
    await sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  });

  registerJobHandler(QUEUE_NAMES.sms, 'deliver-otp', async (payload) => {
    const job = payload as { to?: string; identifier?: string; code?: string };
    const recipient = job.to ?? job.identifier;
    if (!recipient || !job.code) {
      return;
    }
    await sendSms({
      to: recipient,
      message: `Your verification code is ${job.code}. It expires in 10 minutes.`,
    });
  });

  registerJobHandler(QUEUE_NAMES.cleanup, 'prune-auth-artifacts', async () => {
    // TTL indexes remove expired rows automatically; kept for scheduled sweeps.
    logger.debug('auth cleanup sweep requested');
  });
}
