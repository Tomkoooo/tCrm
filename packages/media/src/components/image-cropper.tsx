'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Label } from '@crm/ui';

type CropState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const OUTPUT_MAX = 1600;

export function ImageCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob, filename: string) => void | Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, size, size);

    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * crop.scale;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2 + crop.offsetX;
    const y = (size - h) / 2 + crop.offsetY;

    ctx.drawImage(img, x, y, w, h);
  }, [crop]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const exportCrop = async () => {
    if (exporting) return;
    const img = imgRef.current;
    if (!img) return;

    setExporting(true);
    const size = Math.min(OUTPUT_MAX, Math.max(img.width, img.height));
    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * crop.scale;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2 + (crop.offsetX / 320) * size;
    const y = (size - h) / 2 + (crop.offsetY / 320) * size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, x, y, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );
    if (!blob) {
      setExporting(false);
      return;
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    try {
      await Promise.resolve(onCropped(blob, `${base}.jpg`));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative mx-auto overflow-hidden rounded-md border"
        onPointerDown={(e) => {
          setDragging(true);
          dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            ox: crop.offsetX,
            oy: crop.offsetY,
          };
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setCrop((c) => ({
            ...c,
            offsetX: dragStart.current.ox + (e.clientX - dragStart.current.x),
            offsetY: dragStart.current.oy + (e.clientY - dragStart.current.y),
          }));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <canvas ref={canvasRef} className="size-80 touch-none" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="zoom">Nagyítás</Label>
        <input
          id="zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={crop.scale}
          onChange={(e) => setCrop((c) => ({ ...c, scale: Number(e.target.value) }))}
          className="w-full"
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Húzással pozicionálható a kép a vágási területen. A mentés négyzetes JPEG-et készít ( max{' '}
        {OUTPUT_MAX}px).
      </p>

      {previewUrl ? <img src={previewUrl} alt="" className="sr-only" /> : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          loading={exporting}
          disabled={exporting}
        >
          Mégse
        </Button>
        <Button
          type="button"
          loading={exporting}
          loadingText="Feltöltés…"
          onClick={() => void exportCrop()}
        >
          Vágás és feltöltés
        </Button>
      </div>
    </div>
  );
}
