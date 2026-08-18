import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Todo, TodoPayload } from '../../models/todo.model';
import { TodoApiError, TodoApiService } from './todo-api.service';

// environment.apiBaseUrl is '' in dev, so requests are relative to '/TODOList'.
const BASE = '/TODOList';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    title: 'Buy groceries',
    description: 'Milk and coffee',
    category: 'Shopping',
    priority: 'High',
    isCompleted: false,
    ...overrides,
  };
}

function makePayload(overrides: Partial<TodoPayload> = {}): TodoPayload {
  return {
    title: 'Buy groceries',
    description: 'Milk and coffee',
    category: 'Shopping',
    priority: 'High',
    isCompleted: false,
    ...overrides,
  };
}

describe('TodoApiService', () => {
  let service: TodoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TodoApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TodoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll issues GET /TODOList and returns the list', () => {
    const expected = [makeTodo()];
    let received: Todo[] | undefined;

    service.getAll().subscribe((todos) => (received = todos));

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush(expected);

    expect(received).toEqual(expected);
  });

  it('create issues POST /TODOList with the payload body', () => {
    const payload = makePayload();
    const created = makeTodo();

    service.create(payload).subscribe();

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(created);
  });

  it('update issues PUT to the ORIGINAL (encoded) title with the new payload', () => {
    const payload = makePayload({ title: 'Buy groceries and bread' });

    service.update('Buy groceries', payload).subscribe();

    const req = httpMock.expectOne(`${BASE}/Buy%20groceries`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(makeTodo({ title: 'Buy groceries and bread' }));
  });

  it('setCompleted(true) routes to the MarkAsCompleted PATCH endpoint', () => {
    service.setCompleted('Buy groceries', true).subscribe();

    const req = httpMock.expectOne(`${BASE}/MarkAsCompleted/Buy%20groceries`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeTodo({ isCompleted: true }));
  });

  it('setCompleted(false) routes to the MarkAsInComplete PATCH endpoint', () => {
    service.setCompleted('Buy groceries', false).subscribe();

    const req = httpMock.expectOne(`${BASE}/MarkAsInComplete/Buy%20groceries`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeTodo({ isCompleted: false }));
  });

  it('remove issues DELETE to the encoded title', () => {
    service.remove('Buy groceries').subscribe();

    const req = httpMock.expectOne(`${BASE}/Buy%20groceries`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('clearCompleted issues POST /TODOList/ClearCompleted', () => {
    service.clearCompleted().subscribe();

    const req = httpMock.expectOne(`${BASE}/ClearCompleted`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('maps a 409 conflict to the server-provided message', () => {
    let error: TodoApiError | undefined;

    service.create(makePayload()).subscribe({
      error: (e: TodoApiError) => (error = e),
    });

    httpMock
      .expectOne(BASE)
      .flush(
        { error: 'A todo with that title already exists.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(error).toBeInstanceOf(TodoApiError);
    expect(error?.status).toBe(409);
    expect(error?.message).toBe('A todo with that title already exists.');
  });

  it('maps a 400 validation error to the server message', () => {
    let error: TodoApiError | undefined;

    service.create(makePayload()).subscribe({ error: (e: TodoApiError) => (error = e) });

    httpMock
      .expectOne(BASE)
      .flush({ error: 'Title is required.' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.status).toBe(400);
    expect(error?.message).toBe('Title is required.');
  });

  it('maps a 404 to a friendly out-of-date message when no server message is present', () => {
    let error: TodoApiError | undefined;

    service.remove('Missing').subscribe({ error: (e: TodoApiError) => (error = e) });

    httpMock.expectOne(`${BASE}/Missing`).flush(null, { status: 404, statusText: 'Not Found' });

    expect(error?.status).toBe(404);
    expect(error?.message).toContain('no longer exists');
  });

  it('maps a 500 to a generic server-problem message', () => {
    let error: TodoApiError | undefined;

    service.getAll().subscribe({ error: (e: TodoApiError) => (error = e) });

    httpMock.expectOne(BASE).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(error?.status).toBe(500);
    expect(error?.message).toContain('server ran into a problem');
  });

  it('maps a network failure (status 0) to a connectivity message', () => {
    let error: TodoApiError | undefined;

    service.getAll().subscribe({ error: (e: TodoApiError) => (error = e) });

    httpMock
      .expectOne(BASE)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(error?.status).toBe(0);
    expect(error?.message).toContain('Cannot reach the server');
  });

  it('does not swallow a HttpErrorResponse type from the pipeline', () => {
    let error: TodoApiError | undefined;
    service.getAll().subscribe({ error: (e: TodoApiError) => (error = e) });

    const req = httpMock.expectOne(BASE);
    req.flush({ error: 'nope' }, { status: 503, statusText: 'Service Unavailable' });

    // 503 is >= 500 so it uses the generic server message, not the raw HttpErrorResponse.
    expect(error).not.toBeInstanceOf(HttpErrorResponse);
    expect(error).toBeInstanceOf(TodoApiError);
  });
});
