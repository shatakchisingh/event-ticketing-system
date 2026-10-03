# Campus Event Ticketing and QR Check-In System

A full-stack event ticketing platform for campus events with attendee registration, crypto-signed QR tickets, automated confirmation emails, organizer authentication, and QR check-in.

## Features

- Student-facing event catalog and detail pages
- Secure registration with capacity enforcement and duplicate prevention
- Ticket generation with HMAC-SHA256 signed payloads
- Server-side QR generation and JWT-like signed tokens
- SMTP-powered confirmation email delivery with queued delivery tracking
- Organizer portal with login, dashboard, attendee management, and check-in scanner
- Manual token verification fallback for organizer scanning
- Prisma + PostgreSQL database in Docker
- Responsive dark/light interface with a modern campus aesthetic

## Tech stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router
- Backend: Node.js + Express + TypeScript + Prisma + Zod
- Database: PostgreSQL
- Email: Nodemailer with SMTP provider abstraction
- Security: Helmet, CORS, rate limiting, HMAC signing, bcrypt password hashing, sessions
- QR: `qrcode` library

## Project structure

```text
.
├── apps/
│   ├── web/
│   └── server/
├── packages/
│   └── shared/
├── prisma/
├── docs/
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## Local setup

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Start PostgreSQL locally:

```bash
npm run docker:up
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Start development servers:

```bash
npm run dev
```

The web app runs on http://localhost:5173 and the API runs on http://localhost:4000.

## Required environment variables

Check the .env example for the full list. The key values are:

- `DATABASE_URL`
- `SESSION_SECRET`
- `TICKET_SIGNING_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM`
- `ORGANIZER_EMAIL`
- `ORGANIZER_PASSWORD`

## Organizer access

After seeding, the organizer can sign in with the credentials from `.env`.

## Notes on security

- The ticket signing secret is only kept on the backend and never exposed to the frontend.
- QR payloads carry a signed ticket token rather than raw student identities.
- The backend enforces event capacity and validates each ticket server-side before a check-in is accepted.
- Duplicate check-ins are prevented with an atomic `UPDATE ... WHERE status = 'VALID'` strategy.
- Email delivery attempts are stored in the database and can be retried.

## Production deployment notes

- Replace the local SMTP config with a real provider such as Resend, SendGrid, or Brevo.
- Use strong secrets in a managed environment, not in source control.
- Set `NODE_ENV=production` and configure secure HTTP-only cookie settings.

## License

MIT
