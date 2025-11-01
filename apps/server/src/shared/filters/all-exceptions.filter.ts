import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const traceId = request.traceId || request.headers['x-trace-id'];

    const url = request.originalUrl || request.url;
    const method = request.method;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') message = res;
      else if (typeof res === 'object') {
        const r = res as any;
        message = r.message || message;
        data = r.data ?? null;
      }
    }

    // 输出详细错误日志，便于结合 traceId 排查 500 根因
    try {
      const errMsg = (exception as any)?.message ?? String(exception);
      const stack = (exception as any)?.stack;
      // 控制台输出包含关键上下文：traceId、方法、URL、状态码、消息与堆栈
      console.error('[Unhandled Exception]', {
        traceId,
        method,
        url,
        status,
        message: errMsg,
        stack,
      });
    } catch {}

    response.status(status).json({ code: status, message, data, traceId });
  }
}