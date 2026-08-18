import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ApiError, Todo, TodoPayload } from '../../models/todo.model';

/* Error thrown when the backend returns an error response. */
export class TodoApiError extends Error {
  constructor(
    override readonly message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TodoApiError';
  }
}

/* HTTP communication with the backend */
@Injectable({ providedIn: 'root' })
export class TodoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/TODOList`;

  /** GET /TODOList — all items (server returns newest first). */
  getAll(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.baseUrl).pipe(catchError(this.handleError));
  }

  /** POST /TODOList — create a new item. */
  create(payload: TodoPayload): Observable<Todo> {
    return this.http.post<Todo>(this.baseUrl, payload).pipe(catchError(this.handleError));
  }

  /* PUT /TODOList/{originalTitle} */
  update(originalTitle: string, payload: TodoPayload): Observable<Todo> {
    return this.http
      .put<Todo>(`${this.baseUrl}/${this.encode(originalTitle)}`, payload)
      .pipe(catchError(this.handleError));
  }

  /* PATCH /TODOList/MarkAsCompleted/{title} */
  markCompleted(title: string): Observable<Todo> {
    return this.http
      .patch<Todo>(`${this.baseUrl}/MarkAsCompleted/${this.encode(title)}`, {})
      .pipe(catchError(this.handleError));
  }

  /* PATCH /TODOList/MarkAsInComplete/{title} */
  markIncomplete(title: string): Observable<Todo> {
    return this.http
      .patch<Todo>(`${this.baseUrl}/MarkAsInComplete/${this.encode(title)}`, {})
      .pipe(catchError(this.handleError));
  }

  /* Mark taks as completed or incomplete */
  setCompleted(title: string, completed: boolean): Observable<Todo> {
    return completed ? this.markCompleted(title) : this.markIncomplete(title);
  }

  /* DELETE /TODOList/{title} */
  remove(title: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${this.encode(title)}`)
      .pipe(catchError(this.handleError));
  }

  /* POST /TODOList/ClearCompleted */
  clearCompleted(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/ClearCompleted`, {})
      .pipe(catchError(this.handleError));
  }

  private encode(title: string): string {
    return encodeURIComponent(title);
  }

  /* Error Handeling */
  private readonly handleError = (error: HttpErrorResponse): Observable<never> => {
    const serverMessage = this.extractServerMessage(error);
    let message: string;

    switch (error.status) {
      case 0:
        message = 'Cannot reach the server. Check your connection and that the API is running.';
        break;
      case 400:
        message = serverMessage ?? 'The request was invalid.';
        break;
      case 404:
        message = serverMessage ?? 'That item no longer exists. The list may be out of date.';
        break;
      case 409:
        message = serverMessage ?? 'A todo with that title already exists.';
        break;
      default:
        message =
          error.status >= 500
            ? 'The server ran into a problem. Please try again.'
            : (serverMessage ?? 'Something went wrong. Please try again.');
        break;
    }

    return throwError(() => new TodoApiError(message, error.status));
  };

  private extractServerMessage(error: HttpErrorResponse): string | null {
    const body = error.error as ApiError | string | null | undefined;
    if (typeof body === 'string' && body.trim().length > 0) {
      return body;
    }
    if (body && typeof body === 'object' && typeof body.error === 'string') {
      return body.error;
    }
    return null;
  }
}
