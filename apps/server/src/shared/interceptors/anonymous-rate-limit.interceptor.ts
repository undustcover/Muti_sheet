import { CallHandler, ExecutionContext, Injectable, NestInterceptor, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';

type Counter = { count: number; windowStart: number };

@Injectable()
export class AnonymousRateLimitInterceptor implements NestInterceptor {
  private counters = new Map<string, Counter>();
  private readonly windowMs = 60_000;
  private readonly maxPerWindow = 60; // 60 req/min per IP+path

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;
    const userRole = req.user?.role;
    const anonymous = !userRole;
    if (!anonymous) return next.handle();

    const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString();
    const key = `${ip}:${req.method}:${req.originalUrl || req.url}`;

    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || now - current.windowStart >= this.windowMs) {
      this.counters.set(key, { count: 1, windowStart: now });
      return next.handle();
    }

    current.count += 1;
    if (current.count > this.maxPerWindow) {
      throw new HttpException('Rate limit exceeded for anonymous access', HttpStatus.TOO_MANY_REQUESTS);
    }
    return next.handle();
  }
}