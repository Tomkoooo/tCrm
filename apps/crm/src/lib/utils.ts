export { cn } from '@crm/lib';

export function getInitials(fullName: string, maxLength = 2): string {
  return fullName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, maxLength);
}
