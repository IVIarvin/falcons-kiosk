export class DomainError extends Error {
  constructor(
    message: string,
    public code = 'INVALID',
    public status = 400,
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  message: string,
  code = 'INVALID',
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(message, code, status);
}
