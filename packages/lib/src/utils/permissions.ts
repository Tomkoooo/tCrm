/** Client-safe helper: does the user's permission set include any of the required keys? */
export function hasAnyPermission(userKeys: string[], keys: readonly string[]): boolean {
  return keys.some((key) => userKeys.includes(key));
}
