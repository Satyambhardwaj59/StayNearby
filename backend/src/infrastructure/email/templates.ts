interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const SITE_NAME = 'StayNearby';

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0f172a">
  <h1 style="font-size:18px">${title}</h1>
  ${body}
  <p style="color:#64748b;font-size:12px">— ${SITE_NAME}</p>
</body></html>`;
}

export function verificationCodeEmail(code: string, name?: string): EmailTemplate {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: `Your ${SITE_NAME} verification code`,
    html: layout(
      'Verify your email',
      `<p>${greeting}</p><p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    ),
    text: `${greeting} Your verification code is ${code}. It expires in 10 minutes.`,
  };
}

export function passwordResetEmail(code: string, name?: string): EmailTemplate {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: `Reset your ${SITE_NAME} password`,
    html: layout(
      'Reset your password',
      `<p>${greeting}</p><p>Use code <strong>${code}</strong> to reset your password. It expires in 10 minutes. If you did not request this, ignore this email.</p>`,
    ),
    text: `${greeting} Use code ${code} to reset your password. It expires in 10 minutes.`,
  };
}

export function phoneVerificationEmail(code: string): EmailTemplate {
  return {
    subject: `Your ${SITE_NAME} phone verification code`,
    html: layout(
      'Verify your phone',
      `<p>Your phone verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    ),
    text: `Your phone verification code is ${code}. It expires in 10 minutes.`,
  };
}

export function welcomeEmail(name: string): EmailTemplate {
  return {
    subject: `Welcome to ${SITE_NAME}`,
    html: layout(
      `Welcome, ${name}`,
      '<p>Your account is ready. Start searching for PGs, rooms and flats near you.</p>',
    ),
    text: `Welcome, ${name}. Your account is ready.`,
  };
}
