import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Todo } from '../../models/todo.model';
import { TodoEditRequest, TodoItemComponent } from './todo-item.component';

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    title: 'Task A',
    description: 'Desc',
    category: 'Work',
    priority: 'Low',
    isCompleted: false,
    ...overrides,
  };
}

describe('TodoItemComponent (inline edit)', () => {
  let fixture: ComponentFixture<TodoItemComponent>;
  let component: TodoItemComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TodoItemComponent] }).compileComponents();
    fixture = TestBed.createComponent(TodoItemComponent);
    fixture.componentRef.setInput('todo', todo());
    fixture.detectChanges();
  });

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function clickButton(label: string): void {
    const button = Array.from(host().querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').trim().toLowerCase().includes(label.toLowerCase()),
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  function setEditTitle(value: string): void {
    const input = host().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('enters edit mode with the current values preserved', () => {
    clickButton('Edit');
    const input = host().querySelector<HTMLInputElement>('input[formcontrolname="title"]')!;
    expect(input.value).toBe('Task A');
  });

  it('emits a save request with the original title and trimmed payload', () => {
    let request: TodoEditRequest | undefined;
    component = fixture.componentInstance;
    component.save.subscribe((r) => (request = r));

    clickButton('Edit');
    setEditTitle('  Task A renamed  ');
    clickButton('Save');

    expect(request).toBeDefined();
    expect(request!.originalTitle).toBe('Task A');
    expect(request!.payload.title).toBe('Task A renamed');
    expect(request!.payload.isCompleted).toBe(false);
  });

  it('does not emit save when nothing changed (no-op edit)', () => {
    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);

    clickButton('Edit');
    clickButton('Save');

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('does not emit save for an invalid (empty) title', () => {
    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);

    clickButton('Edit');
    setEditTitle('   ');
    clickButton('Save');

    expect(saveSpy).not.toHaveBeenCalled();
    expect(host().textContent).toContain('Please enter a title');
  });

  it('cancels edit and returns to display mode without emitting', () => {
    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);

    clickButton('Edit');
    setEditTitle('Changed but cancelled');
    clickButton('Cancel');

    expect(saveSpy).not.toHaveBeenCalled();
    expect(host().querySelector('form.edit')).toBeNull();
    expect(host().textContent).toContain('Task A');
  });

  it('exposes an accessible label on the completion checkbox', () => {
    const checkbox = host().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.getAttribute('aria-label')).toContain('Task A');
  });
});
