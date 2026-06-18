'use client';

import { useCallback, useEffect, useState } from 'react';
import { DownloadIcon, ShareIcon, SmartphoneIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PWA_INSTALL_DISMISS_KEY } from '@/lib/pwa/constants';
import { detectMobileOs, isStandaloneDisplay, type MobileOs } from '@/lib/pwa/detect';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const IOS_STEPS = [
  'Nyissa meg a böngésző alsó sávjában a Megosztás gombot.',
  'Görgessen le, majd válassza a „Kezdőképernyőhöz adás” lehetőséget.',
  'Nyomja meg a Hozzáadás gombot a jobb felső sarokban.',
];

const ANDROID_STEPS = [
  'Nyissa meg a böngésző menüjét (⋮) a jobb felső sarokban.',
  'Válassza az „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz” lehetőséget.',
  'Erősítse meg a telepítést a felugró ablakban.',
];

function readDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, '1');
  } catch {
    // Ignore private browsing / storage blocks.
  }
}

function InstallSteps({ os }: { os: MobileOs }) {
  const steps = os === 'ios' ? IOS_STEPS : ANDROID_STEPS;

  return (
    <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mobileOs, setMobileOs] = useState<MobileOs | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const os = detectMobileOs(navigator.userAgent, navigator.maxTouchPoints);
    if (!os) {
      return;
    }

    const installed = isStandaloneDisplay(
      window.matchMedia('(display-mode: standalone)').matches,
      window.matchMedia('(display-mode: minimal-ui)').matches,
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );

    if (installed || readDismissed()) {
      return;
    }

    setMobileOs(os);
    setVisible(true);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed();
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) {
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
      writeDismissed();
      setVisible(false);
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  }, [installEvent]);

  if (!visible || !mobileOs) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="relative pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8"
          onClick={dismiss}
          aria-label="Telepítési útmutató bezárása"
        >
          <XIcon className="h-4 w-4" />
        </Button>
        <CardTitle className="flex items-center gap-2 pr-10 text-lg">
          <SmartphoneIcon className="h-5 w-5" />
          Telepítse a CRM-et a telefonjára
        </CardTitle>
        <CardDescription>
          {mobileOs === 'ios'
            ? 'Safari-ból egy érintéssel elérheti a kezdőképernyőről — így gyorsabban nyithatja meg a munkafelületet.'
            : 'Telepítse alkalmazásként, hogy teljes képernyős élményben és gyorsabban érje el a CRM-et.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mobileOs === 'ios' && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <ShareIcon className="h-4 w-4 shrink-0" />A Megosztás ikon általában a Safari alsó
            sávjában, középen található.
          </p>
        )}

        <InstallSteps os={mobileOs} />

        {mobileOs === 'android' && installEvent && (
          <Button type="button" className="w-fit" loading={installing} onClick={install}>
            <DownloadIcon className="h-4 w-4" />
            Telepítés most
          </Button>
        )}

        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={dismiss}>
          Később
        </Button>
      </CardContent>
    </Card>
  );
}
