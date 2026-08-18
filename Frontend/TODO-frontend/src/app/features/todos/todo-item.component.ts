import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import {
  CATEGORIES,
  Category,
  PRIORITIES,
  Priority,
  Todo,
  TodoPayload,
} from '../../models/todo.model';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  descriptionValidators,
  titleValidators,
} from './todo-form.validation';

interface EditFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<Category>;
  priority: FormControl<Priority>;
}

export interface TodoEditRequest {
  originalTitle: string;
  payload: TodoPayload;
}

/* Row for a single todo. */
@Component({
  selector: 'app-todo-item',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './todo-item.component.html',
  styleUrls: ['./todo-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoItemComponent {
  readonly todo = input.required<Todo>();
  readonly toggling = input(false);
  readonly updating = input(false);
  readonly deleting = input(false);

  readonly toggle = output<boolean>();
  readonly save = output<TodoEditRequest>();
  readonly remove = output<string>();

  readonly categories = CATEGORIES;
  readonly priorities = PRIORITIES;
  readonly maxTitleLength = MAX_TITLE_LENGTH;
  readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

  readonly editing = signal(false);
  readonly busy = computed(() => this.toggling() || this.updating() || this.deleting());

  private readonly editTitleInput = viewChild<ElementRef<HTMLInputElement>>('editTitle');
  private readonly editButton = viewChild<ElementRef<HTMLButtonElement>>('editButton');

  readonly editForm = new FormGroup<EditFormControls>({
    title: new FormControl('', { nonNullable: true, validators: titleValidators }),
    description: new FormControl('', { nonNullable: true, validators: descriptionValidators }),
    category: new FormControl<Category>('None', { nonNullable: true }),
    priority: new FormControl<Priority>('None', { nonNullable: true }),
  });

  constructor() {
    // Move focus into the title field when edit mode opens.
    effect(() => {
      if (this.editing()) {
        queueMicrotask(() => this.editTitleInput()?.nativeElement.focus());
      }
    });
  }

  get titleControl(): FormControl<string> {
    return this.editForm.controls.title;
  }

  get showTitleErrors(): boolean {
    const control = this.titleControl;
    return control.invalid && (control.touched || control.dirty);
  }

  onToggle(event: Event): void {
    if (this.toggling()) {
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    this.toggle.emit(checked);
  }

  startEdit(): void {
    const current = this.todo();
    this.editForm.reset({
      title: current.title,
      description: current.description ?? '',
      category: current.category,
      priority: current.priority,
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    queueMicrotask(() => this.editButton()?.nativeElement.focus());
  }

  saveEdit(): void {
    if (this.updating()) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    const description = raw.description.trim();
    const payload: TodoPayload = {
      title: raw.title.trim(),
      description: description.length > 0 ? description : null,
      category: raw.category,
      priority: raw.priority,
      isCompleted: this.todo().isCompleted,
    };

    if (this.isUnchanged(payload)) {
      this.cancelEdit();
      return;
    }

    this.save.emit({ originalTitle: this.todo().title, payload });
  }

  confirmDelete(): void {
    if (this.deleting()) {
      return;
    }
    const title = this.todo().title;
    const confirmed = globalThis.confirm(`Delete "${title}"? This cannot be undone.`);
    if (confirmed) {
      this.remove.emit(title);
    }
  }

  /** Called by the parent to close edit mode after a successful save. */
  exitEditMode(): void {
    this.editing.set(false);
  }

  private isUnchanged(payload: TodoPayload): boolean {
    const current = this.todo();
    return (
      payload.title === current.title &&
      payload.description === (current.description ?? null) &&
      payload.category === current.category &&
      payload.priority === current.priority
    );
  }
}
