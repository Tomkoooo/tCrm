import Link from 'next/link';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';

export default function NotFound() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you are looking for does not exist or you lack permission.
      </p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </Container>
  );
}
