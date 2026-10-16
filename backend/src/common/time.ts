export function getCurrentTimeInDBFormat(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

export function formatDbTimestamp(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

export function parseDbTime(value: string): Date {
  if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  return new Date(`${value.replace(' ', 'T')}Z`);
}

export function withFormattedTimestamps<T extends Record<string, unknown>>(
  row: T,
  keys: Array<keyof T> = ['createdAt', 'updatedAt'] as Array<keyof T>,
): T {
  const next = { ...row };
  for (const key of keys) {
    const current = next[key];
    if (current instanceof Date || typeof current === 'string') {
      (next as Record<string, unknown>)[key as string] = formatDbTimestamp(current as Date | string);
    }
  }
  return next;
}
