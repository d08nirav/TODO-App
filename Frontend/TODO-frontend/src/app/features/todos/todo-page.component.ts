import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

import { Todo, TodoPayload } from '../../models/todo.model';
import { TodoApiError, TodoApiService } from '../../core/services/todo-api.service';
import { TodoFormComponent } from './todo-form.component';
import { TodoEditRequest, TodoItemComponent } from './todo-item.component';

/* Container for the single-page todo experience */
@Component({
  selector: 'app-todo-page',
  standalone: true,
  imports: [TodoFormComponent, TodoItemComponent],
  templateUrl: './todo-page.component.html',
  styleUrls: ['./todo-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodoPageComponent {
  private readonly api = inject(TodoApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly form = viewChild(TodoFormComponent);
  private readonly items = viewChildren(TodoItemComponent);

  readonly todos = signal<Todo[]>([]);
  readonly initialLoading = signal(false);
  readonly refreshing = signal(false);
  readonly loadFailed = signal(false);
  readonly creating = signal(false);
  readonly clearing = signal(false);

  private readonly togglingTitles = signal<ReadonlySet<string>>(new Set());
  private readonly updatingTitles = signal<ReadonlySet<string>>(new Set());
  private readonly deletingTitles = signal<ReadonlySet<string>>(new Set());

  readonly errorMessage = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly total = computed(() => this.todos().length);
  readonly completedCount = computed(() => this.todos().filter((t) => t.isCompleted).length);
  readonly remainingCount = computed(() => this.total() - this.completedCount());
  readonly hasCompleted = computed(() => this.completedCount() > 0);

  constructor() {
    this.load();
  }

  isToggling(title: string): boolean {
    return this.togglingTitles().has(title);
  }

  isUpdating(title: string): boolean {
    return this.updatingTitles().has(title);
  }

  isDeleting(title: string): boolean {
    return this.deletingTitles().has(title);
  }

  /* Initial (or retry) load: shows a full-page loading state and a retry on failure. */
  load(): void {
    this.initialLoading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set(null);

    this.api
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todos) => {
          this.todos.set(this.normalize(todos));
          this.initialLoading.set(false);
        },
        error: (error: TodoApiError) => {
          this.initialLoading.set(false);
          this.loadFailed.set(true);
          this.errorMessage.set(error.message);
        },
      });
  }

  /* Background refresh that preserves the current list if it fails. */
  refresh(): void {
    this.refreshing.set(true);
    this.errorMessage.set(null);

    this.api
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (todos) => {
          this.todos.set(this.normalize(todos));
          this.refreshing.set(false);
        },
        error: (error: TodoApiError) => {
          this.refreshing.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }

  createTodo(payload: TodoPayload): void {
    if (this.creating()) {
      return;
    }
    this.creating.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    this.api
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.todos.update((list) => [created, ...list]);
          this.form()?.reset();
          this.creating.set(false);
          this.statusMessage.set(`Added new Item "${created.title}".`);
        },
        error: (error: TodoApiError) => {
          this.creating.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }

  saveTodo(request: TodoEditRequest): void {
    const { originalTitle, payload } = request;
    if (this.isUpdating(originalTitle)) {
      return;
    }
    this.mutateSet(this.updatingTitles, originalTitle, true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    this.api
      .update(originalTitle, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.todos.update((list) => list.map((t) => (t.title === originalTitle ? updated : t)));
          this.itemFor(originalTitle)?.exitEditMode();
          this.mutateSet(this.updatingTitles, originalTitle, false);
          this.statusMessage.set(`Updated "${updated.title}".`);
        },
        error: (error: TodoApiError) => {
          this.mutateSet(this.updatingTitles, originalTitle, false);
          this.errorMessage.set(error.message);
        },
      });
  }

  toggleTodo(title: string, completed: boolean): void {
    if (this.isToggling(title)) {
      return;
    }
    this.mutateSet(this.togglingTitles, title, true);
    this.errorMessage.set(null);

    // Optimistic update with rollback on failure.
    this.setCompletedLocally(title, completed);

    this.api
      .setCompleted(title, completed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.todos.update((list) => list.map((t) => (t.title === title ? updated : t)));
          this.mutateSet(this.togglingTitles, title, false);
        },
        error: (error: TodoApiError) => {
          this.setCompletedLocally(title, !completed);
          this.mutateSet(this.togglingTitles, title, false);
          this.errorMessage.set(error.message);
        },
      });
  }

  deleteTodo(title: string): void {
    if (this.isDeleting(title)) {
      return;
    }
    this.mutateSet(this.deletingTitles, title, true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    this.api
      .remove(title)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removeLocally(title);
          this.statusMessage.set(`Deleted "${title}".`);
        },
        error: (error: TodoApiError) => {
          this.mutateSet(this.deletingTitles, title, false);
          if (error.status === 404) {
            // Already gone on the server; reconcile the local list.
            this.removeLocally(title);
            this.statusMessage.set(`"${title}" was already removed.`);
          } else {
            this.errorMessage.set(error.message);
          }
        },
      });
  }

  clearCompleted(): void {
    if (this.clearing() || !this.hasCompleted()) {
      return;
    }
    this.clearing.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    this.api
      .clearCompleted()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.todos.update((list) => list.filter((t) => !t.isCompleted));
          this.clearing.set(false);
          this.statusMessage.set('Cleared completed tasks.');
        },
        error: (error: TodoApiError) => {
          this.clearing.set(false);
          this.errorMessage.set(error.message);
        },
      });
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }

  trackByTitle(_index: number, todo: Todo): string {
    return todo.title;
  }

  private itemFor(title: string): TodoItemComponent | undefined {
    return this.items().find((item) => item.todo().title === title);
  }

  private setCompletedLocally(title: string, completed: boolean): void {
    this.todos.update((list) =>
      list.map((t) => (t.title === title ? { ...t, isCompleted: completed } : t)),
    );
  }

  private removeLocally(title: string): void {
    this.todos.update((list) => list.filter((t) => t.title !== title));
    this.mutateSet(this.deletingTitles, title, false);
  }

  private mutateSet(
    target: ReturnType<typeof signal<ReadonlySet<string>>>,
    title: string,
    add: boolean,
  ): void {
    target.update((current) => {
      const next = new Set(current);
      if (add) {
        next.add(title);
      } else {
        next.delete(title);
      }
      return next;
    });
  }

  /* Defensively coerce an unexpected/null API body into a safe array. */
  private normalize(todos: Todo[] | null | undefined): Todo[] {
    return Array.isArray(todos) ? todos : [];
  }
}
