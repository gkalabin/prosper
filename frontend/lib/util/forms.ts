import {
  type FieldValues,
  type Path,
  type UseFormSetError,
} from 'react-hook-form';
import {type typeToFlattenedError} from 'zod';

export function setFormErrors<T extends FieldValues>(
  errors: typeToFlattenedError<T>,
  setError: UseFormSetError<T>
) {
  // Global (root) errors.
  if (errors.formErrors.length > 0) {
    setError('root', {message: errors.formErrors.join(', ')});
  }
  // Individual field errors.
  const fieldErrors = errors.fieldErrors as Record<
    string,
    string[] | undefined
  >;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      setError(field as Path<T>, {message: messages.join(', ')});
    }
  }
}
