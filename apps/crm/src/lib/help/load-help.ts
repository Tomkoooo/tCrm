import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { filterHelpArticles } from './filter-by-permissions';
import type { HelpArticle, HelpArticleFrontmatter, HelpSection } from './types';

const USER_GUIDE_DIR = path.join(process.cwd(), '../../docs/user-guide');

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

function parseArticleFile(filePath: string, filename: string): HelpArticle {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const fm = data as Partial<HelpArticleFrontmatter>;

  if (!fm.title || typeof fm.title !== 'string') {
    throw new Error(`Help article ${filename} missing title in frontmatter`);
  }
  if (!fm.section || typeof fm.section !== 'string') {
    throw new Error(`Help article ${filename} missing section in frontmatter`);
  }

  const order = typeof fm.order === 'number' ? fm.order : 999;
  const permissions = Array.isArray(fm.permissions)
    ? fm.permissions.filter((p): p is string => typeof p === 'string')
    : undefined;

  return {
    slug: slugFromFilename(filename),
    title: fm.title,
    description: typeof fm.description === 'string' ? fm.description : undefined,
    order,
    section: fm.section,
    permissions,
    content: content.trim(),
  };
}

function loadAllArticles(): HelpArticle[] {
  if (!fs.existsSync(USER_GUIDE_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(USER_GUIDE_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  return files.map((filename) => parseArticleFile(path.join(USER_GUIDE_DIR, filename), filename));
}

export function getHelpArticlesForUser(userPermissions: string[]): HelpArticle[] {
  const all = loadAllArticles();
  return filterHelpArticles(all, userPermissions).sort((a, b) => a.order - b.order);
}

export function getHelpArticleBySlug(slug: string, userPermissions: string[]): HelpArticle | null {
  const articles = getHelpArticlesForUser(userPermissions);
  return articles.find((a) => a.slug === slug) ?? null;
}

export function groupHelpArticlesBySection(articles: HelpArticle[]): HelpSection[] {
  const sectionMap = new Map<string, HelpArticle[]>();

  for (const article of articles) {
    const list = sectionMap.get(article.section) ?? [];
    list.push(article);
    sectionMap.set(article.section, list);
  }

  const sectionOrder = ['Áttekintés', 'Fiók', 'Készletkezelés', 'Logisztika', 'Adminisztráció'];

  const sections: HelpSection[] = [];

  for (const name of sectionOrder) {
    const items = sectionMap.get(name);
    if (items && items.length > 0) {
      sections.push({ name, articles: items.sort((a, b) => a.order - b.order) });
      sectionMap.delete(name);
    }
  }

  for (const [name, items] of sectionMap) {
    sections.push({ name, articles: items.sort((a, b) => a.order - b.order) });
  }

  return sections;
}

export function getHelpGuideDir(): string {
  return USER_GUIDE_DIR;
}
