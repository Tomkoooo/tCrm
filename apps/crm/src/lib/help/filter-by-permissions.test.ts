import { describe, expect, it } from 'vitest';
import { canViewHelpArticle, filterHelpArticles } from './filter-by-permissions';
import type { HelpArticle } from './types';

function article(overrides: Partial<HelpArticle> = {}): HelpArticle {
  return {
    slug: 'test',
    title: 'Test',
    order: 1,
    section: 'Áttekintés',
    content: '',
    ...overrides,
  };
}

describe('canViewHelpArticle', () => {
  it('shows articles with no permission requirement to everyone', () => {
    expect(canViewHelpArticle(article(), [])).toBe(true);
    expect(canViewHelpArticle(article({ permissions: [] }), ['inventory:read'])).toBe(true);
  });

  it('requires any listed permission', () => {
    const a = article({ permissions: ['inventory:read', 'inventory:write'] });
    expect(canViewHelpArticle(a, ['inventory:read'])).toBe(true);
    expect(canViewHelpArticle(a, ['inventory:write'])).toBe(true);
    expect(canViewHelpArticle(a, ['logistics:read'])).toBe(false);
  });
});

describe('filterHelpArticles', () => {
  it('filters and preserves order of input array', () => {
    const articles = [
      article({ slug: 'public', permissions: undefined }),
      article({ slug: 'inv', permissions: ['inventory:read'] }),
      article({ slug: 'log', permissions: ['logistics:read'] }),
    ];
    const filtered = filterHelpArticles(articles, ['inventory:read']);
    expect(filtered.map((a) => a.slug)).toEqual(['public', 'inv']);
  });
});
