// ── Result type for validation — forces callers to handle errors ──

export type Result<T, E = ValidationError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export class ValidationError extends Error {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function failure<E extends ValidationError>(error: E): Result<never, E> {
  return { ok: false, error };
}
