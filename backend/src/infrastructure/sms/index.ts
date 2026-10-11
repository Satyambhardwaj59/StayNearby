import { env, isTest } from '../../config/env';
import { logger } from '../../shared/logger';
import { ExternalServiceError } from '../../shared/errors';

export interface SendSmsInput {
  to: string;
  message: string;
  category?: string;
}

/** Driver: `console` (dev, logs metadata only) or `api` (generic HTTP gateway). */
export async function sendSms(input: SendSmsInput): Promise<{ id: string | null }> {
  if (env.SMS_DRIVER === 'console') {
    if (!isTest) {
      // Message bodies may contain OTPs, so only metadata is logged.
      logger.info({ to: input.to, category: input.category }, 'sms suppressed (console driver)');
    }
    return { id: null };
  }

  try {
    const response = await fetch('https://api.sms-gateway.example.com/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SMS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: env.SMS_SENDER_ID,
        to: input.to,
        message: input.message,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`sms provider responded ${response.status}`);
    }
    const payload = (await response.json()) as { id?: string };
    return { id: payload.id ?? null };
  } catch (error) {
    throw new ExternalServiceError('sms-api', error);
  }
}
