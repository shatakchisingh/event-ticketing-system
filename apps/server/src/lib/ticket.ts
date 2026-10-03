import crypto from 'node:crypto';

export type TicketPayload = {
  ticketId: string;
  registrationId: string;
  eventId: string;
  issuedAt: number;
  expiresAt: number;
};

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function signTicketPayload(payload: TicketPayload, secret: string): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'ticket' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

export function verifyTicketToken(token: string, secret: string): TicketPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  const signingInput = `${header}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signingInput).digest();
  const providedSignature = decodeBase64Url(signature);

  if (providedSignature.length !== expectedSignature.length) return null;

  try {
    if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TicketPayload;
    return decodedPayload;
  } catch {
    return null;
  }
}

export function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
