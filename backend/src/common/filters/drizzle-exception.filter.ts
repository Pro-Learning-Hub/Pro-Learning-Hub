import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

type PgErrorLike = {
  code?: string;
  message?: string;
};

@Catch()
export class DrizzleExceptionFilter implements ExceptionFilter {
  private readonly fallback = new HttpExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    const mapped = this.mapCode((exception as PgErrorLike)?.code);
    if (!mapped) {
      this.fallback.catch(exception, host);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response.status(mapped.status).json({
      statusCode: mapped.status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: mapped.message,
    });
  }

  private mapCode(code?: string): { status: number; message: string } | null {
    if (code === '23505') {
      return { status: HttpStatus.CONFLICT, message: 'Resource already exists' };
    }
    if (code === '23503' || code === '23502' || code === '23514') {
      return { status: HttpStatus.BAD_REQUEST, message: 'Invalid input' };
    }
    return null;
  }
}
