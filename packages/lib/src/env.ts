/** When true, `/register` is available for self-service viewer accounts (after setup). */
export function isPublicRegistrationEnabled(): boolean {
  const value = process.env.ALLOW_PUBLIC_REGISTRATION?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
