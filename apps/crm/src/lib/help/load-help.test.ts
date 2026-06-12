import { describe, expect, it } from 'vitest';
import {
  getHelpArticleBySlug,
  getHelpArticlesForUser,
  groupHelpArticlesBySection,
} from './load-help';

describe('load-help integration', () => {
  it('loads index article for any authenticated user', () => {
    const article = getHelpArticleBySlug('index', []);
    expect(article).not.toBeNull();
    expect(article?.title).toContain('Áttekintés');
  });

  it('filters inventory articles by permission', () => {
    const withInv = getHelpArticlesForUser(['inventory:read']);
    const withoutInv = getHelpArticlesForUser([]);

    expect(withInv.some((a) => a.slug === 'excel-import')).toBe(true);
    expect(withoutInv.some((a) => a.slug === 'excel-import')).toBe(false);
    expect(withoutInv.some((a) => a.slug === 'index')).toBe(true);
  });

  it('groups sections with Áttekintés first', () => {
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(['inventory:read', 'logistics:read'])
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.name).toBe('Áttekintés');
  });
});
