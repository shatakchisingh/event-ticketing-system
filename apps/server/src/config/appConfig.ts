import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = resolve(fileURLToPath(new URL('../../../.env', import.meta.url)));
dotenv.config({ path: envPath });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET ?? 'development-session-secret',
  ticketSigningSecret: process.env.TICKET_SIGNING_SECRET ?? 'development-ticket-secret',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/event_ticketing?schema=public',
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'Campus Events <noreply@campus.local>'
  },
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  organizerEmail: process.env.ORGANIZER_EMAIL ?? 'organizer@campus.local',
  organizerPassword: process.env.ORGANIZER_PASSWORD ?? 'ChangeThisPassword123!'
};
