import type { HelpArticle } from './types';

/** Article visible when frontmatter.permissions is empty or user has any listed key. */
export function canViewHelpArticle(article: HelpArticle, userPermissions: string[]): boolean {
  const required = article.permissions;
  if (!required || required.length === 0) return true;
  return required.some((key) => userPermissions.includes(key));
}

export function filterHelpArticles(
  articles: HelpArticle[],
  userPermissions: string[]
): HelpArticle[] {
  return articles.filter((article) => canViewHelpArticle(article, userPermissions));
}
