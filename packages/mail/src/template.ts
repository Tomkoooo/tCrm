/** Replace {{variable}} placeholders in subject/body. */
export function renderTemplateString(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    return variables[key] ?? '';
  });
}
