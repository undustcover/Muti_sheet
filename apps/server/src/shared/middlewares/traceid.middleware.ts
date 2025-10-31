import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function TraceIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers['x-trace-id'];
  const traceId = (existing && typeof existing === 'string') ? existing : uuidv4();
  (req as any).traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}