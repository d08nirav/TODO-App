/* Frontend `TODOList` model. */

/* The list of categories and priorities for TODO items. */
export const CATEGORIES = ['None', 'Personal', 'Work', 'Shopping', 'Home'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['None', 'Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

/* TODO item */
export interface Todo {
  title: string;
  description: string | null;
  category: Category;
  priority: Priority;
  isCompleted: boolean;
}

export interface TodoPayload {
  title: string;
  description: string | null;
  category: Category;
  priority: Priority;
  isCompleted: boolean;
}

/* Error for 4xx responses. */
export interface ApiError {
  error?: string;
}
