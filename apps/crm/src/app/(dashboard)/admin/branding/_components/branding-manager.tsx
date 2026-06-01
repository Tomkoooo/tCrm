'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { BrandingSettings } from '@crm/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import { updateBrandingAction, type BrandingFormState } from '../actions';

function mediaFromId(id: string | undefined, label: string): SelectedMedia[] {
  if (!id) return [];
  return [
    {
      id,
      previewUrl: `/api/uploads/${id}`,
      filename: label,
      type: 'file',
    },
  ];
}

export function BrandingManager({ initial }: { initial: BrandingSettings }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateBrandingAction, {
    success: false,
  } satisfies BrandingFormState);

  const [logo, setLogo] = useState<SelectedMedia[]>(() => mediaFromId(initial.logoId, 'Logo'));
  const [favicon, setFavicon] = useState<SelectedMedia[]>(() =>
    mediaFromId(initial.faviconId, 'Favicon')
  );
  const [loginBackground, setLoginBackground] = useState<SelectedMedia[]>(() =>
    mediaFromId(initial.loginBackgroundId, 'Háttér')
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Alapadatok</h2>
          <p className="text-muted-foreground text-sm">
            Az alkalmazás neve a böngésző címsorában és az oldalsávban jelenik meg.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="appName">Alkalmazás neve</Label>
            <Input id="appName" name="appName" defaultValue={initial.appName} required />
            {state.success === false && state.fieldErrors?.appName && (
              <p className="text-destructive text-sm">{state.fieldErrors.appName[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="companyName">Cég / alcím</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={initial.companyName}
              required
            />
            {state.success === false && state.fieldErrors?.companyName && (
              <p className="text-destructive text-sm">{state.fieldErrors.companyName[0]}</p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Képek</h2>
          <p className="text-muted-foreground text-sm">
            Válasszon a médiatárból vagy töltsön fel újat. A favicon ajánlott méret: 32×32 vagy
            64×64 px.
          </p>
        </div>
        <input type="hidden" name="logoId" value={logo[0]?.id ?? ''} />
        <MediaSelector
          label="Logó"
          description="Megjelenik az oldalsávban és a bejelentkezési oldalon."
          value={logo}
          onChange={setLogo}
          multiple={false}
          maxCount={1}
        />
        <input type="hidden" name="faviconId" value={favicon[0]?.id ?? ''} />
        <MediaSelector
          label="Favicon"
          description="Böngésző fül ikon."
          value={favicon}
          onChange={setFavicon}
          multiple={false}
          maxCount={1}
        />
        <input type="hidden" name="loginBackgroundId" value={loginBackground[0]?.id ?? ''} />
        <MediaSelector
          label="Bejelentkezési háttér"
          description="Opcionális teljes képernyős háttérkép."
          value={loginBackground}
          onChange={setLoginBackground}
          multiple={false}
          maxCount={1}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Bejelentkezési oldal</h2>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="loginTitle">Bejelentkezés címe</Label>
          <Input id="loginTitle" name="loginTitle" defaultValue={initial.loginTitle} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="loginSubtitle">Alcím / leírás</Label>
          <Input
            id="loginSubtitle"
            name="loginSubtitle"
            defaultValue={initial.loginSubtitle}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="footerText">Lábléc szöveg</Label>
          <Textarea id="footerText" name="footerText" defaultValue={initial.footerText} rows={2} />
        </div>
      </section>

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
