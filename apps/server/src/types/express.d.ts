declare module 'express-session' {
  interface SessionData {
    organizerId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      session: any;
    }
  }
}

export {};
