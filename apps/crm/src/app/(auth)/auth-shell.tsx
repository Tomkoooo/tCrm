'use client';

export function AuthShell({
  children,
  loginBackgroundUrl,
}: {
  children: React.ReactNode;
  loginBackgroundUrl?: string;
}) {
  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center p-4">
      {loginBackgroundUrl ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${loginBackgroundUrl})` }}
            aria-hidden
          />
          <div className="bg-background/80 pointer-events-none absolute inset-0 backdrop-blur-sm" />
        </>
      ) : null}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6">
        {children}
      </div>
    </div>
  );
}
