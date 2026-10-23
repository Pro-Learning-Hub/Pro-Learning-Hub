import { HttpException, HttpStatus } from '@nestjs/common';
import { ServiceFailureReason, ServiceResult } from '../types/service-result';

const REASON_TO_STATUS: Record<ServiceFailureReason, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  validation_error: HttpStatus.BAD_REQUEST,
  conflict: HttpStatus.CONFLICT,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_modified: HttpStatus.NOT_MODIFIED,
};

export function unwrapResult<T>(result: ServiceResult<T>): T {
  if (result.success) {
    return result.data;
  }
  const status = REASON_TO_STATUS[result.reason] ?? HttpStatus.BAD_REQUEST;
  throw new HttpException(
    { statusCode: status, message: result.error ?? result.reason },
    status,
  );
}
