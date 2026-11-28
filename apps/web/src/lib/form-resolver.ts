import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Validates a form with a shared API schema when what the form holds (text boxes) differs from
 * what is sent: `toPayload` turns one into the other, and any problem is shown beside the field
 * of the same name.
 */
export function payloadResolver<Values extends FieldValues>(
  schema: z.ZodType,
  toPayload: (values: Values) => unknown,
): Resolver<Values> {
  return (values) => {
    const result = schema.safeParse(toPayload(values));
    if (result.success) return { values, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path.at(-1) ?? 'root');
      errors[field] ??= { type: 'validation', message: issue.message };
    }
    return { values: {}, errors: errors as FieldErrors<Values> };
  };
}
