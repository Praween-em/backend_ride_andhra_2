import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: LoggerService) { }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        // Extract error message
        let errorMessage: string | string[];
        if (typeof message === 'string') {
            errorMessage = message;
        } else if (typeof message === 'object' && 'message' in message) {
            errorMessage = (message as any).message;
        } else {
            errorMessage = 'An error occurred';
        }

        // Log the error
        const errorLog = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: errorMessage,
            user: (request as any).user?.id || 'anonymous',
        };

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url}`,
                exception instanceof Error ? exception.stack : undefined,
                'HttpExceptionFilter',
            );
        } else {
            this.logger.warn(
                `${request.method} ${request.url} - ${JSON.stringify(errorMessage)}`,
                'HttpExceptionFilter',
            );
        }

        // Sanitize error response for production
        const isProduction = process.env.NODE_ENV === 'production';
        const errorResponse: any = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: errorMessage,
        };

        // Don't expose stack traces in production
        if (!isProduction && exception instanceof Error) {
            errorResponse.stack = exception.stack;
        }

        response.status(status).json(errorResponse);
    }
}
