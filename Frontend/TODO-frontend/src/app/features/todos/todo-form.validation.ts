import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

import { Category, Priority } from '../../models/todo.model';

/* Shared field limits (kept in one place so create and edit stay consistent). */
export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;

export const DEFAULT_CATEGORY: Category = 'None';
export const DEFAULT_PRIORITY: Priority = 'None';

/* Rejects values that are empty once trimmed (e.g. only spaces/tabs) */
export function nonWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value.trim().length > 0) {
    return null;
  }
  return { whitespace: true };
}

/* Validators applied to the title field in both create and edit forms. */
export const titleValidators = [
  Validators.required,
  Validators.maxLength(MAX_TITLE_LENGTH),
  nonWhitespaceValidator,
];

/* Validators applied to the description field in both create and edit forms. */
export const descriptionValidators = [Validators.maxLength(MAX_DESCRIPTION_LENGTH)];
