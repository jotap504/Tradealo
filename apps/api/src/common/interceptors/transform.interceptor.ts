import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface TransformedResponse<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, TransformedResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in data &&
          (data as Record<string, unknown>)['success'] === true
        ) {
          return data as unknown as TransformedResponse<T>
        }
        return { success: true as const, data }
      }),
    )
  }
}
