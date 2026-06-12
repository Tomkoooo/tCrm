export type HelpArticleFrontmatter = {
  title: string;
  description?: string;
  order: number;
  section: string;
  permissions?: string[];
};

export type HelpArticle = HelpArticleFrontmatter & {
  slug: string;
  content: string;
};

export type HelpSection = {
  name: string;
  articles: HelpArticle[];
};
