export function assert(
  condition: boolean,
  message?: string
): asserts condition is true {
  if (!condition) throw new Error(message ?? "Assertion failed");
}

export function assertDefined(value: unknown, message?: string): asserts value {
  assert(value !== undefined && value !== null, message);
}

type Nullable = undefined | null;
export function assertNotDefined(
  value: unknown,
  message?: string
): asserts value is Nullable {
  assert(value === undefined || value === null, message);
}
