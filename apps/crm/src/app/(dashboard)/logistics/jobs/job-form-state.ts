export type JobFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string; id?: undefined }
  | { success: true; message?: string; id?: string };
