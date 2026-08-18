import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Mock } from 'vitest';
import { Subject, of, throwError } from 'rxjs';

import { Todo, TodoPayload } from '../../models/todo.model';
import { TodoApiError, TodoApiService } from '../../core/services/todo-api.service';
import { TodoPageComponent } from './todo-page.component';

type ApiMock = Record<keyof TodoApiService, Mock>;

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    title: 'Task A',
    description: null,
    category: 'None',
    priority: 'None',
    isCompleted: false,
    ...overrides,
  };
}

describe('TodoPageComponent', () => {
  let api: ApiMock;

  function createApiMock(): ApiMock {
    return {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      markCompleted: vi.fn(),
      markIncomplete: vi.fn(),
      setCompleted: vi.fn(),
      remove: vi.fn(),
      clearCompleted: vi.fn(),
    } as unknown as ApiMock;
  }

  async function setup(initial: () => unknown): Promise<ComponentFixture<TodoPageComponent>> {
    api.getAll.mockImplementation(initial as never);

    await TestBed.configureTestingModule({
      imports: [TodoPageComponent],
      providers: [{ provide: TodoApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TodoPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<TodoPageComponent>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function queryButton(
    fixture: ComponentFixture<TodoPageComponent>,
    label: string,
  ): HTMLButtonElement | undefined {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    return buttons.find((b) =>
      (b.textContent ?? '').trim().toLowerCase().includes(label.toLowerCase()),
    );
  }

  function setInput(fixture: ComponentFixture<TodoPageComponent>, id: string, value: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function submitCreateForm(fixture: ComponentFixture<TodoPageComponent>): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector('form.todo-form')!;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    api = createApiMock();
  });

  it('shows a loading state while the initial fetch is pending', async () => {
    const pending = new Subject<Todo[]>();
    const fixture = await setup(() => pending);

    expect(text(fixture)).toContain('Loading tasks…');

    pending.next([todo()]);
    pending.complete();
    fixture.detectChanges();

    expect(text(fixture)).not.toContain('Loading tasks…');
  });

  it('renders fetched todos with their titles', async () => {
    const fixture = await setup(() =>
      of([todo({ title: 'Walk dog' }), todo({ title: 'Read book' })]),
    );

    expect(text(fixture)).toContain('Walk dog');
    expect(text(fixture)).toContain('Read book');
  });

  it('shows an empty state when there are no todos', async () => {
    const fixture = await setup(() => of([]));

    expect(text(fixture)).toContain('No tasks yet');
  });

  it('shows a retry action when the initial load fails and reloads on retry', async () => {
    const fixture = await setup(() => throwError(() => new TodoApiError('boom', 500)));

    const retry = queryButton(fixture, 'Retry');
    expect(retry).toBeDefined();

    api.getAll.mockReturnValue(of([todo({ title: 'Recovered' })]));
    retry!.click();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Recovered');
  });

  it('creates a valid todo and prepends it, then resets the form', async () => {
    const fixture = await setup(() => of([]));
    api.create.mockReturnValue(of(todo({ title: 'New task' })));

    setInput(fixture, 'new-title', 'New task');
    submitCreateForm(fixture);

    expect(api.create).toHaveBeenCalledTimes(1);
    const payload = api.create.mock.calls[0][0] as TodoPayload;
    expect(payload.title).toBe('New task');
    expect(text(fixture)).toContain('New task');

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#new-title',
    )!;
    expect(input.value).toBe('');
  });

  it('rejects whitespace-only input without calling the API', async () => {
    const fixture = await setup(() => of([]));

    setInput(fixture, 'new-title', '   ');
    submitCreateForm(fixture);

    expect(api.create).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Please enter a title');
  });

  it('trims the title before creating', async () => {
    const fixture = await setup(() => of([]));
    api.create.mockReturnValue(of(todo({ title: 'Trimmed' })));

    setInput(fixture, 'new-title', '  Trimmed  ');
    submitCreateForm(fixture);

    const payload = api.create.mock.calls[0][0] as TodoPayload;
    expect(payload.title).toBe('Trimmed');
  });

  it('preserves user input when creation fails', async () => {
    const fixture = await setup(() => of([]));
    api.create.mockReturnValue(throwError(() => new TodoApiError('duplicate', 409)));

    setInput(fixture, 'new-title', 'Dup');
    submitCreateForm(fixture);

    expect(text(fixture)).toContain('duplicate');
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#new-title',
    )!;
    expect(input.value).toBe('Dup');
  });

  it('toggles completion optimistically and keeps the server value on success', async () => {
    const fixture = await setup(() => of([todo({ title: 'Toggle me', isCompleted: false })]));
    api.setCompleted.mockReturnValue(of(todo({ title: 'Toggle me', isCompleted: true })));

    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(api.setCompleted).toHaveBeenCalledWith('Toggle me', true);
    expect(text(fixture)).toContain('Done');
  });

  it('rolls back the toggle when the request fails', async () => {
    const fixture = await setup(() => of([todo({ title: 'Toggle me', isCompleted: false })]));
    api.setCompleted.mockReturnValue(throwError(() => new TodoApiError('offline', 0)));

    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(text(fixture)).toContain('offline');
    // After rollback the item must not be presented as completed.
    expect(text(fixture)).not.toContain('Done');
  });

  it('deletes an item after confirmation and removes it from the list', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const fixture = await setup(() => of([todo({ title: 'Delete me' })]));
    api.remove.mockReturnValue(of(void 0));

    queryButton(fixture, 'Delete')!.click();
    fixture.detectChanges();

    expect(api.remove).toHaveBeenCalledWith('Delete me');
    // The row is gone from the list (status text may still mention it).
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-todo-item').length).toBe(0);
    expect(text(fixture)).toContain('No tasks yet');
  });

  it('does not delete when the confirmation is dismissed', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    const fixture = await setup(() => of([todo({ title: 'Keep me' })]));

    queryButton(fixture, 'Delete')!.click();
    fixture.detectChanges();

    expect(api.remove).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Keep me');
  });

  it('keeps the item and shows an error when deletion fails', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const fixture = await setup(() => of([todo({ title: 'Sticky' })]));
    api.remove.mockReturnValue(throwError(() => new TodoApiError('server error', 500)));

    queryButton(fixture, 'Delete')!.click();
    fixture.detectChanges();

    expect(text(fixture)).toContain('server error');
    expect(text(fixture)).toContain('Sticky');
  });

  it('prevents duplicate delete requests while one is in flight', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    const fixture = await setup(() => of([todo({ title: 'Once' })]));
    const pending = new Subject<void>();
    api.remove.mockReturnValue(pending);

    const deleteBtn = queryButton(fixture, 'Delete')!;
    deleteBtn.click();
    fixture.detectChanges();
    // Second attempt while the first is still pending.
    deleteBtn.click();
    fixture.detectChanges();

    expect(api.remove).toHaveBeenCalledTimes(1);

    pending.next();
    pending.complete();
    fixture.detectChanges();
  });

  it('clears completed tasks via the dedicated action', async () => {
    const fixture = await setup(() =>
      of([
        todo({ title: 'Done one', isCompleted: true }),
        todo({ title: 'Active', isCompleted: false }),
      ]),
    );
    api.clearCompleted.mockReturnValue(of(void 0));

    queryButton(fixture, 'Clear completed')!.click();
    fixture.detectChanges();

    expect(api.clearCompleted).toHaveBeenCalledTimes(1);
    expect(text(fixture)).not.toContain('Done one');
    expect(text(fixture)).toContain('Active');
  });

  it('reflects total/remaining/completed counts in the summary', async () => {
    const fixture = await setup(() =>
      of([todo({ title: 'A', isCompleted: true }), todo({ title: 'B', isCompleted: false })]),
    );

    const summary = (fixture.nativeElement as HTMLElement).querySelector('.summary')!;
    expect(summary.textContent).toContain('2'); // total
    expect(summary.textContent).toContain('1'); // remaining/completed
  });
});
