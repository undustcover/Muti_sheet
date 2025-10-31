import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

type CacheEntry = { data: any; expiresAt: number };

@Injectable()
export class AnonymousCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 15_000; // 15s short cache for anonymous GET lists

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;
    const userRole = req.user?.role;
    const anonymous = !userRole;
    const isGet = (req.method || '').toUpperCase() === 'GET';
    if (!anonymous || !isGet) return next.handle();

    const key = `anon:${req.originalUrl || req.url}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return of(hit.data);
    }
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, { data, expiresAt: now + this.ttlMs });
      })
    );
  }
}