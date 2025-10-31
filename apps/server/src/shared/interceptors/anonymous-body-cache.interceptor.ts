import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DslCacheService } from '../cache/dsl-cache.service';

@Injectable()
export class AnonymousBodyCacheInterceptor implements NestInterceptor {
  private readonly defaultAnonTtlMs = Number(process.env.ANON_DSL_CACHE_TTL_MS || 15_000);
  private readonly defaultAuthTtlMs = Number(process.env.AUTH_DSL_CACHE_TTL_MS || 5_000);
  private readonly cache = DslCacheService.getInstance();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;
    const userRole = req.user?.role;
    const userId: string | undefined = req.user?.userId;
    const anonymous = !userRole;
    const isPost = (req.method || '').toUpperCase() === 'POST';
    if (!isPost) return next.handle();

    // Build cache key from URL + normalized body
    const body = req.body ?? {};
    const bodyStr = JSON.stringify(body);
    const useCacheAuth = !anonymous && !!body.useCache;
    const ttlOverride = typeof body.cacheTtlMs === 'number' ? body.cacheTtlMs : undefined;
    const ttlMs = anonymous ? this.defaultAnonTtlMs : (useCacheAuth ? this.defaultAuthTtlMs : 0);
    const effectiveTtl = ttlOverride ? Math.min(ttlOverride, ttlMs || this.defaultAnonTtlMs) : ttlMs;
    if (!anonymous && !useCacheAuth) {
      return next.handle();
    }

    const keyPrefix = anonymous ? 'anon' : 'auth';
    const viewId = typeof body.viewId === 'string' ? body.viewId : 'no-view';
    const key = `${keyPrefix}:${req.originalUrl || req.url}:${anonymous ? '' : (userId || 'no-user')}:${viewId}:${bodyStr}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit !== undefined) {
      return of(hit);
    }
    return next.handle().pipe(
      tap((data) => {
        const ttl = effectiveTtl || this.defaultAnonTtlMs;
        const uid = anonymous ? undefined : (userId || undefined);
        this.cache.set(key, data, ttl, uid);
      })
    );
  }
}