import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../../config/env';
import { logger } from '../../shared/logger';
import { ExternalServiceError } from '../../shared/errors';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: string;
  replyTo?: string;
}

let transporter: Transporter | null = null;

function smtpTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: env.EMAIL_SMTP_PORT,
    secure: env.EMAIL_SMTP_PORT === 465,
    auth:
      env.EMAIL_SMTP_USER.length > 0
        ? { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASSWORD }
        : undefined,
    pool: true,
    maxConnections: 5,
  });
  return transporter;
}

/** Driver: `console` (dev, logs only), `smtp` (nodemailer) or `api` (Resend-compatible). */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string | null }> {
  if (env.EMAIL_DRIVER === 'console') {
    if (!isTest) {
      logger.info(
        { to: input.to, subject: input.subject, category: input.category },
        'email suppressed (console driver)',
      );
    }
    return { id: null };
  }

  if (env.EMAIL_DRIVER === 'smtp') {
    try {
      const info = await smtpTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      return { id: info.messageId ?? null };
    } catch (error) {
      throw new ExternalServiceError('smtp', error);
    }
  }

  // api driver
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`email provider responded ${response.status}`);
    }
    const payload = (await response.json()) as { id?: string };
    return { id: payload.id ?? null };
  } catch (error) {
    throw new ExternalServiceError('email-api', error);
  }
}
