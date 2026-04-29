import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    let code = 'INTERNAL_SERVER_ERROR'
    let message = 'Ha ocurrido un error inesperado'

    if (typeof exceptionResponse === 'string') {
      code = exceptionResponse
      message = exceptionResponse
    } else if (
      exceptionResponse !== null &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const resp = exceptionResponse as Record<string, unknown>
      code = typeof resp['error'] === 'string' ? resp['error'] : String(resp['message'])
      message = Array.isArray(resp['message'])
        ? (resp['message'] as string[]).join(', ')
        : String(resp['message'])
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    })
  }
}
