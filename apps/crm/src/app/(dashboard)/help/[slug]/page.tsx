import { notFound } from 'next/navigation';
import { getCurrentUser } from '@crm/auth';
import {
  getHelpArticleBySlug,
  getHelpArticlesForUser,
  groupHelpArticlesBySection,
} from '@/lib/help/load-help';
import { HelpLayout } from '../_components/help-layout';
import { MarkdownContent } from '../_components/markdown-content';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return [];
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === 'index') {
    notFound();
  }

  const user = await getCurrentUser();
  const permissions = user?.permissions ?? [];
  const article = getHelpArticleBySlug(slug, permissions);

  if (!article) {
    notFound();
  }

  const sections = groupHelpArticlesBySection(getHelpArticlesForUser(permissions));

  return (
    <HelpLayout sections={sections} title={article.title} description={article.description}>
      <MarkdownContent content={article.content} />
    </HelpLayout>
  );
}
