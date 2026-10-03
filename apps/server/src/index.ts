import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { config } from './config/appConfig.js';
import { prisma } from './lib/prisma.js';
import { hashPassword, verifyPassword } from './lib/password.js';
import { hashToken, signTicketPayload, verifyTicketToken } from './lib/ticket.js';
import { EmailService } from './services/emailService.js';
import { requireOrganizer } from './middleware/auth.js';

const app = express();
const emailService = new EmailService();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } }
  })
);

const eventSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  venue: z.string().min(2),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  capacity: z.coerce.number().int().positive(),
  bannerUrl: z.string().optional().or(z.literal(''))
});

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  studentId: z.string().min(1),
  phone: z.string().optional().or(z.literal('')),
  eventId: z.string().min(1)
});

const checkinSchema = z.object({
  token: z.string().min(1),
  eventId: z.string().min(1)
});

function toEventView(event: any) {
  const registrations = event._count?.registrations ?? 0;
  return {
    ...event,
    registeredCount: registrations,
    seatsRemaining: Math.max(event.capacity - registrations, 0),
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

function toTicketView(ticket: any) {
  return {
    id: ticket.id,
    registrationId: ticket.registrationId,
    eventId: ticket.eventId,
    status: ticket.status,
    issuedAt: ticket.issuedAt.toISOString(),
    expiresAt: ticket.expiresAt.toISOString(),
    checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.get('/api/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: 'asc' },
      include: { organizer: true, _count: { select: { registrations: true } } }
    });

    res.json({ success: true, data: events.map((event) => toEventView(event)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load events.' } });
  }
});

app.get('/api/events/:eventId', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: { organizer: true, _count: { select: { registrations: true } } }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
    }

    return res.json({ success: true, data: toEventView(event) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load event.' } });
  }
});

app.post('/api/events/:eventId/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please provide valid registration details.' } });
  }

  const data = parsed.data;

  try {
    const event = await prisma.event.findUnique({ where: { id: data.eventId }, include: { _count: { select: { registrations: true } } } });
    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
    }

    if (event.status !== 'ACTIVE') {
      return res.status(409).json({ success: false, error: { code: 'EVENT_CLOSED', message: 'This event is no longer accepting registrations.' } });
    }

    const existingRegistration = await prisma.registration.findFirst({
      where: {
        OR: [
          { studentId: data.studentId, eventId: data.eventId },
          { email: data.email.toLowerCase(), eventId: data.eventId }
        ]
      }
    });

    if (existingRegistration) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_REGISTERED', message: 'You are already registered for this event.' } });
    }

    const registrationCount = await prisma.registration.count({ where: { eventId: data.eventId } });
    if (registrationCount >= event.capacity) {
      return res.status(409).json({ success: false, error: { code: 'EVENT_FULL', message: 'Event is full.' } });
    }

    const registration = await prisma.$transaction(async (tx) => {
      const registrationCountCheck = await tx.registration.count({ where: { eventId: data.eventId } });
      if (registrationCountCheck >= event.capacity) {
        throw new Error('EVENT_FULL');
      }

      const newRegistration = await tx.registration.create({
        data: {
          eventId: data.eventId,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          studentId: data.studentId,
          phone: data.phone || null
        }
      });

      const ticketId = crypto.randomUUID();
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24 * 7);
      const tokenPayload = {
        ticketId,
        registrationId: newRegistration.id,
        eventId: data.eventId,
        issuedAt: Math.floor(issuedAt.getTime() / 1000),
        expiresAt: Math.floor(expiresAt.getTime() / 1000)
      };
      const token = signTicketPayload(tokenPayload, config.ticketSigningSecret);
      const tokenHash = hashToken(token);

      await tx.ticket.create({
        data: {
          id: ticketId,
          registrationId: newRegistration.id,
          eventId: data.eventId,
          tokenHash,
          status: 'VALID',
          issuedAt,
          expiresAt
        }
      });

      await tx.emailDelivery.create({
        data: {
          registrationId: newRegistration.id,
          recipient: newRegistration.email,
          provider: 'SMTP',
          status: 'PENDING',
          attempts: 0
        }
      });

      return { registration: newRegistration, ticketId, token, expiresAt };
    });

    const qrCode = await QRCode.toDataURL(registration.token);

    const emailDelivery = await prisma.emailDelivery.findFirst({
      where: { registrationId: registration.registration.id },
      orderBy: { createdAt: 'desc' }
    });

    if (emailDelivery) {
      try {
        await emailService.sendTicketEmail(registration.registration.email, {
          participantName: registration.registration.fullName,
          eventName: event.name,
          date: new Date(event.startTime).toLocaleDateString(),
          time: `${new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          venue: event.venue,
          ticketId: registration.ticketId,
          qrCodeDataUrl: qrCode
        });

        await prisma.emailDelivery.update({
          where: { id: emailDelivery.id },
          data: {
            provider: 'SMTP',
            status: 'SENT',
            attempts: 1,
            lastAttemptAt: new Date(),
            errorMessage: null
          }
        });
      } catch (error) {
        console.error('Email delivery failed', error);
        await prisma.emailDelivery.update({
          where: { id: emailDelivery.id },
          data: {
            status: 'FAILED',
            attempts: 1,
            lastAttemptAt: new Date(),
            errorMessage: 'Email delivery failed.'
          }
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      registration: {
        id: registration.registration.id,
        fullName: registration.registration.fullName,
        email: registration.registration.email,
        studentId: registration.registration.studentId,
        eventId: registration.registration.eventId,
        createdAt: registration.registration.createdAt.toISOString()
      },
      ticket: {
        id: registration.ticketId,
        expiresAt: registration.expiresAt.toISOString(),
        status: 'VALID'
      },
      qrCode,
      token: registration.token
    });
  } catch (error: any) {
    if (error.message === 'EVENT_FULL') {
      return res.status(409).json({ success: false, error: { code: 'EVENT_FULL', message: 'Event is full.' } });
    }

    console.error(error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Registration failed.' } });
  }
});

app.get('/api/tickets/:ticketId', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: { registration: true, event: true }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' } });
    }

    const qrToken = signTicketPayload(
      {
        ticketId: ticket.id,
        registrationId: ticket.registrationId,
        eventId: ticket.eventId,
        issuedAt: Math.floor(new Date(ticket.issuedAt).getTime() / 1000),
        expiresAt: Math.floor(new Date(ticket.expiresAt).getTime() / 1000)
      },
      config.ticketSigningSecret
    );
    const qrCode = await QRCode.toDataURL(qrToken);

    return res.json({ success: true, data: {
      ticket: toTicketView(ticket),
      participant: {
        name: ticket.registration.fullName,
        email: ticket.registration.email,
        studentId: ticket.registration.studentId
      },
      event: {
        id: ticket.event.id,
        name: ticket.event.name
      },
      qrCode,
      token: qrToken
    } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to load ticket.' } });
  }
});

app.post('/api/organizer/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email or password.' } });
  }

  const organizer = await prisma.organizer.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!organizer) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } });
  }

  const passwordValid = await verifyPassword(parsed.data.password, organizer.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' } });
  }

  req.session.organizerId = organizer.id;

  return res.json({ success: true, data: { id: organizer.id, email: organizer.email, name: organizer.name } });
});

app.post('/api/organizer/logout', requireOrganizer, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

app.get('/api/organizer/me', requireOrganizer, async (req, res) => {
  const organizer = await prisma.organizer.findUnique({ where: { id: req.session.organizerId } });
  if (!organizer) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
  }

  return res.json({ success: true, data: { id: organizer.id, email: organizer.email, name: organizer.name } });
});

app.get('/api/organizer/events', requireOrganizer, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { organizerId: req.session.organizerId },
    orderBy: { startTime: 'asc' },
    include: { _count: { select: { registrations: true } } }
  });

  const payload = await Promise.all(
    events.map(async (event) => {
      const checkedInCount = await prisma.ticket.count({
        where: { eventId: event.id, status: 'CHECKED_IN' }
      });

      return {
        ...toEventView(event),
        registrations: event._count.registrations,
        checkedIn: checkedInCount
      };
    })
  );

  return res.json({ success: true, data: payload });
});

app.post('/api/organizer/events', requireOrganizer, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid event data.' } });
  }

  const data = parsed.data;
  const organizerId = req.session.organizerId as string;
  const event = await prisma.event.create({
    data: {
      organizerId,
      name: data.name,
      description: data.description,
      venue: data.venue,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      capacity: data.capacity,
      bannerUrl: data.bannerUrl || null,
      status: 'ACTIVE'
    }
  });

  return res.status(201).json({ success: true, data: toEventView(event) });
});

app.patch('/api/organizer/events/:id', requireOrganizer, async (req, res) => {
  const eventId = String(req.params.id);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } }
  });

  if (!event) {
    return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
  }

  if (event.organizerId !== req.session.organizerId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this event.' } });
  }

  const nextCapacity = req.body.capacity ? Number(req.body.capacity) : event.capacity;
  if (nextCapacity < event._count.registrations) {
    return res.status(400).json({ success: false, error: { code: 'CAPACITY_ERROR', message: 'Capacity cannot be reduced below current registrations.' } });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      name: req.body.name ?? event.name,
      description: req.body.description ?? event.description,
      venue: req.body.venue ?? event.venue,
      startTime: req.body.startTime ? new Date(req.body.startTime) : event.startTime,
      endTime: req.body.endTime ? new Date(req.body.endTime) : event.endTime,
      capacity: nextCapacity,
      bannerUrl: req.body.bannerUrl ?? event.bannerUrl,
      status: req.body.status ?? event.status
    }
  });

  return res.json({ success: true, data: toEventView({ ...updated, _count: { registrations: event._count.registrations } }) });
});

app.get('/api/organizer/events/:eventId/attendees', requireOrganizer, async (req, res) => {
  const eventId = String(req.params.eventId);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
  }

  if (event.organizerId !== req.session.organizerId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this event.' } });
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: { ticket: true },
    orderBy: { createdAt: 'desc' }
  });

  return res.json({ success: true, data: registrations.map((item) => ({
    id: item.id,
    name: item.fullName,
    email: item.email,
    studentId: item.studentId,
    registrationTime: item.createdAt.toISOString(),
    ticketStatus: item.ticket?.status ?? 'NOT_REGISTERED',
    checkInTime: item.ticket?.checkedInAt ? item.ticket.checkedInAt.toISOString() : null
  })) });
});

app.get('/api/organizer/events/:eventId/statistics', requireOrganizer, async (req, res) => {
  const eventId = String(req.params.eventId);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: 'Event not found.' } });
  }

  if (event.organizerId !== req.session.organizerId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not own this event.' } });
  }

  const registrations = await prisma.registration.count({ where: { eventId } });
  const checkedIn = await prisma.ticket.count({ where: { eventId, status: 'CHECKED_IN' } });

  return res.json({
    success: true,
    data: {
      eventId: event.id,
      totalRegistered: registrations,
      checkedIn,
      notCheckedIn: registrations - checkedIn,
      checkInPercentage: registrations === 0 ? 0 : Number(((checkedIn / registrations) * 100).toFixed(2)),
      capacity: event.capacity,
      remaining: Math.max(event.capacity - registrations, 0)
    }
  });
});

app.post('/api/checkin/verify', async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, status: 'INVALID_TICKET', message: 'Invalid check-in request.' });
  }

  const { token, eventId } = parsed.data;
  const validated = verifyTicketToken(token, config.ticketSigningSecret);
  if (!validated) {
    return res.status(400).json({ success: false, status: 'INVALID_TICKET', message: 'Invalid ticket' });
  }

  if (validated.eventId !== eventId) {
    return res.status(400).json({ success: false, status: 'WRONG_EVENT', message: 'Ticket does not belong to this event' });
  }

  const ticketRecord = await prisma.ticket.findUnique({
    where: { id: validated.ticketId },
    include: { registration: true }
  });

  if (!ticketRecord) {
    return res.status(400).json({ success: false, status: 'INVALID_TICKET', message: 'Invalid ticket' });
  }

  if (ticketRecord.eventId !== eventId) {
    return res.status(400).json({ success: false, status: 'WRONG_EVENT', message: 'Ticket does not belong to this event' });
  }

  if (ticketRecord.status === 'CANCELLED') {
    return res.status(400).json({ success: false, status: 'INVALID_TICKET', message: 'Invalid ticket' });
  }

  if (new Date(ticketRecord.expiresAt) < new Date()) {
    return res.status(400).json({ success: false, status: 'EXPIRED', message: 'Ticket has expired' });
  }

  let result: any;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.updateMany({
      where: { id: ticketRecord.id, status: 'VALID' },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() }
    });

    if (updated.count === 1) {
      const updatedTicket = await tx.ticket.findUnique({ where: { id: ticketRecord.id }, include: { registration: true } });
      result = {
        success: true,
        status: 'CHECKED_IN',
        message: 'Check-in successful',
        participant: {
          name: updatedTicket?.registration.fullName,
          studentId: updatedTicket?.registration.studentId
        },
        checkedInAt: updatedTicket?.checkedInAt?.toISOString()
      };
    } else {
      const current = await tx.ticket.findUnique({ where: { id: ticketRecord.id }, include: { registration: true } });
      if (current?.status === 'CHECKED_IN') {
        result = {
          success: false,
          status: 'ALREADY_USED',
          message: 'Ticket has already been used',
          checkedInAt: current.checkedInAt ? current.checkedInAt.toISOString() : null
        };
      } else {
        result = {
          success: false,
          status: 'INVALID_TICKET',
          message: 'Invalid ticket'
        };
      }
    }
  });

  await prisma.checkInLog.create({
    data: {
      ticketId: ticketRecord.id,
      eventId,
      organizerId: req.session?.organizerId ?? null,
      result: result.status,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? ''
    }
  });

  return res.json(result);
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
