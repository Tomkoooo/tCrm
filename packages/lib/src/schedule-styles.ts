/** Background style for calendar events from a hex color. */
export function scheduleEventStyles(hex: string): Record<string, string> {
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  return {
    backgroundColor: color,
    color: '#ffffff',
  };
}
