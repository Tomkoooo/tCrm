export type JobFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };
