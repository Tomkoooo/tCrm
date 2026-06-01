'use client';

import { useRef, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FileUploadButton({
  accept,
  multiple,
  loading,
  disabled,
  onFilesSelected,
  children,
  className,
  variant = 'outline',
  size = 'default',
}: {
  accept?: string;
  multiple?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: FileList) => void;
  children?: ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={accept}
        multiple={multiple}
        disabled={disabled || loading}
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) onFilesSelected(files);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        loading={loading}
        loadingText={loading ? 'Feltöltés…' : undefined}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        {children ?? 'Fájlok kiválasztása'}
      </Button>
    </>
  );
}
