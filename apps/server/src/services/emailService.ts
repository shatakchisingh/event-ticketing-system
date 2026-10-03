import nodemailer from 'nodemailer';
import { config } from '../config/appConfig.js';

export type EmailTemplatePayload = {
  participantName: string;
  eventName: string;
  date: string;
  time: string;
  venue: string;
  ticketId: string;
  qrCodeDataUrl?: string;
};

export class EmailService {
  private transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor() {
    const useEthereal = !config.smtp.user || !config.smtp.pass;

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: useEthereal
        ? {
            user: 'test-user',
            pass: 'test-pass'
          }
        : {
            user: config.smtp.user,
            pass: config.smtp.pass
          }
    });
  }

  private async sendWithNodemailer(to: string, subject: string, html: string, text: string): Promise<void> {
    await this.transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html
    });
  }

  private async sendWithResend(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!config.resendApiKey) {
      return this.sendWithNodemailer(to, subject, html, text);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.smtp.from,
        to: [to],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend email failed: ${errorText}`);
    }
  }

  async sendTicketEmail(to: string, payload: EmailTemplatePayload): Promise<void> {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; background:#f5f7fb; padding:32px;">
          <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dfe7f5; border-radius:16px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0f172a,#0f766e); color:white; padding:24px 30px;">
              <h1 style="margin:0; font-size:28px;">Campus Event Ticket</h1>
            </div>
            <div style="padding:30px; color:#1f2937;">
              <p>Hello ${payload.participantName},</p>
              <p>Your registration for <strong>${payload.eventName}</strong> has been confirmed.</p>
              <p><strong>Event:</strong> ${payload.eventName}</p>
              <p><strong>Date:</strong> ${payload.date}</p>
              <p><strong>Time:</strong> ${payload.time}</p>
              <p><strong>Venue:</strong> ${payload.venue}</p>
              <p><strong>Ticket ID:</strong> ${payload.ticketId}</p>

              ${payload.qrCodeDataUrl ? `<div style="margin:24px 0; text-align:center;"><img src="${payload.qrCodeDataUrl}" alt="Event QR Ticket" style="max-width:220px; border:8px solid #ecfeff; border-radius:12px; background:white;" /></div>` : ''}

              <p>Present this QR code at the event entrance.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `Campus Event Ticket\n\nHello ${payload.participantName},\nYour registration for ${payload.eventName} has been confirmed.\n\nEvent: ${payload.eventName}\nDate: ${payload.date}\nTime: ${payload.time}\nVenue: ${payload.venue}\nTicket ID: ${payload.ticketId}\nPlease present this QR code at the event entrance.`;

    if (config.resendApiKey) {
      await this.sendWithResend(to, 'Campus Event Ticket', html, text);
      return;
    }

    await this.sendWithNodemailer(to, 'Campus Event Ticket', html, text);
  }

  async sendCheckInConfirmation(to: string, payload: EmailTemplatePayload): Promise<void> {
    await this.sendTicketEmail(to, payload);
  }

  async sendCancellationEmail(to: string, payload: EmailTemplatePayload): Promise<void> {
    const html = `<p>Hello ${payload.participantName},</p><p>Your registration for ${payload.eventName} has been cancelled or expired.</p>`;
    const text = `Hello ${payload.participantName},\nYour registration for ${payload.eventName} has been cancelled or expired.`;

    if (config.resendApiKey) {
      await this.sendWithResend(to, 'Campus Event Update', html, text);
      return;
    }

    await this.sendWithNodemailer(to, 'Campus Event Update', html, text);
  }
}
