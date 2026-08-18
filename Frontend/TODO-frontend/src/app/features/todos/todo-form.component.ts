import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { CATEGORIES, Category, PRIORITIES, Priority, TodoPayload } from '../../models/todo.model';
import {
  DEFAULT_CATEGORY,
  DEFAULT_PRIORITY,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  descriptionValidators,
  titleValidators,
} from './todo-form.validation';

interface TodoFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<Category>;
  priority: FormControl<Priority>;
}

/* Presentational create form. */
@Component({
  selector: 'app-todo-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './todo-form.component.html',
  styleUrls: ['./todo-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoFormComponent {
  /* Disables inputs and the submit button while a create request is in flight. */
  readonly submitting = input(false);

  /* Emits a validated, trimmed payload ready to send to the API. */
  readonly create = output<TodoPayload>();

  readonly categories = CATEGORIES;
  readonly priorities = PRIORITIES;
  readonly maxTitleLength = MAX_TITLE_LENGTH;
  readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  readonly form = new FormGroup<TodoFormControls>({
    title: new FormControl('', { nonNullable: true, validators: titleValidators }),
    description: new FormControl('', {
      nonNullable: true,
      validators: descriptionValidators,
    }),
    category: new FormControl<Category>(DEFAULT_CATEGORY, { nonNullable: true }),
    priority: new FormControl<Priority>(DEFAULT_PRIORITY, { nonNullable: true }),
  });

  get titleControl(): FormControl<string> {
    return this.form.controls.title;
  }

  get showTitleErrors(): boolean {
    const control = this.titleControl;
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const description = raw.description.trim();

    this.create.emit({
      title: raw.title.trim(),
      description: description.length > 0 ? description : null,
      category: raw.category,
      priority: raw.priority,
      isCompleted: false,
    });
  }

  /* Resets the form to its pristine default state (called by parent after success). */
  reset(): void {
    this.form.reset({
      title: '',
      description: '',
      category: DEFAULT_CATEGORY,
      priority: DEFAULT_PRIORITY,
    });
  }
}
