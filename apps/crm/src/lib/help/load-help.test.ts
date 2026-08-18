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

  it('filters permission-gated articles', () => {
    const withPerm = getHelpArticlesForUser(['users:read']);
    const withoutPerm = getHelpArticlesForUser([]);

    expect(withPerm.some((a) => a.slug === 'admin-felhasznalok')).toBe(true);
    expect(withoutPerm.some((a) => a.slug === 'admin-felhasznalok')).toBe(false);
    expect(withoutPerm.some((a) => a.slug === 'index')).toBe(true);
  });

  it('filters inventory articles by permission', () => {
    const withInv = getHelpArticlesForUser(['inventory:read']);
    const withoutInv = getHelpArticlesForUser([]);

    expect(withInv.some((a) => a.slug === 'excel-import')).toBe(true);
    expect(withInv.some((a) => a.slug === 'leltar')).toBe(true);
    expect(withoutInv.some((a) => a.slug === 'excel-import')).toBe(false);
  });

  it('filters logistics articles by permission', () => {
    const withLog = getHelpArticlesForUser(['logistics:read']);
    const withoutLog = getHelpArticlesForUser([]);

    expect(withLog.some((a) => a.slug === 'logisztika-attekintes')).toBe(true);
    expect(withoutLog.some((a) => a.slug === 'logisztika-attekintes')).toBe(false);
  });

  it('filters HR articles by permission', () => {
    const withHr = getHelpArticlesForUser(['hr:read']);
    const withoutHr = getHelpArticlesForUser([]);

    expect(withHr.some((a) => a.slug === 'hr-attekintes')).toBe(true);
    expect(withoutHr.some((a) => a.slug === 'hr-attekintes')).toBe(false);
    expect(withoutHr.some((a) => a.slug === 'sajat-feladataim')).toBe(true);
  });

  it('groups sections with Áttekintés first', () => {
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(['users:read', 'roles:manage', 'hr:read'])
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.name).toBe('Áttekintés');
    expect(sections.some((s) => s.name === 'HR')).toBe(true);
  });
});
