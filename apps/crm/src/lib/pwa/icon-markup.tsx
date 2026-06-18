type PwaIconMarkupProps = {
  size: number;
};

/** Shared CRM tile icon for generated PNG / OG image responses. */
export function PwaIconMarkup({ size }: PwaIconMarkupProps) {
  const radius = Math.round(size * 0.1875);
  const tile = Math.round(size * 0.28125);
  const gap = Math.round(size * 0.0625);
  const tileRadius = Math.round(size * 0.046875);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#18181b',
        borderRadius: radius,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${tile}px ${tile}px`,
          gridTemplateRows: `${tile}px ${tile}px`,
          gap,
        }}
      >
        <div
          style={{
            width: tile,
            height: tile,
            borderRadius: tileRadius,
            background: '#fafafa',
          }}
        />
        <div
          style={{
            width: tile,
            height: tile,
            borderRadius: tileRadius,
            background: '#a1a1aa',
          }}
        />
        <div
          style={{
            width: tile,
            height: tile,
            borderRadius: tileRadius,
            background: '#a1a1aa',
          }}
        />
        <div
          style={{
            width: tile,
            height: tile,
            borderRadius: tileRadius,
            background: '#fafafa',
          }}
        />
      </div>
    </div>
  );
}
