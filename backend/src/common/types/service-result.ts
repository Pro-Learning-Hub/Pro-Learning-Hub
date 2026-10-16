export type ServiceFailureReason =
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'not_modified';

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; reason: ServiceFailureReason; error?: string };

export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function fail(
  reason: ServiceFailureReason,
  error?: string,
): ServiceResult<never> {
  return { success: false, reason, error };
}
