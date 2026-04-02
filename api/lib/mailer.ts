import nodemailer from 'nodemailer';
import { requireSmtpEnv } from './env.js';

export function createMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = requireSmtpEnv();
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendMarketingEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: string;
}): Promise<void> {
  const transport = createMailTransport();
  await transport.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
