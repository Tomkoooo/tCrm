import Link from 'next/link';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';

export function MyNoEmployee() {
  return (
    <Container className="flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Saját beosztás</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ehhez a fiókhoz még nincs dolgozói rekord kötve. A HR-nek létre kell hoznia egy dolgozót
          az Ön e-mail címével, majd meghívnia vagy összekötnie a felhasználói fiókjával.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Vissza a vezérlőpultra</Link>
      </Button>
    </Container>
  );
}
