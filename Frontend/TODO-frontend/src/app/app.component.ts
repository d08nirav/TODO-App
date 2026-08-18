import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TodoPageComponent } from './features/todos/todo-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoPageComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
