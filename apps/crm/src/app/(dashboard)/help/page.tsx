import { notFound } from 'next/navigation';
import { getCurrentUser } from '@crm/auth';
import {
  getHelpArticleBySlug,
  getHelpArticlesForUser,
  groupHelpArticlesBySection,
} from '@/lib/help/load-help';
import { HelpLayout } from './_components/help-layout';
import { MarkdownContent } from './_components/markdown-content';

export default async function HelpIndexPage() {
  const user = await getCurrentUser();
  const permissions = user?.permissions ?? [];
  const article = getHelpArticleBySlug('index', permissions);

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
