import type { Request, Response, NextFunction } from 'express';

export function requireOrganizer(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.organizerId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  next();
}
