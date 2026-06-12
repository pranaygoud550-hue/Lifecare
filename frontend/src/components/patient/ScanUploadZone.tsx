import { useCallback, useRef, useState } from 'react';
import { Upload, FileImage, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { validateChestScanFile } from '@/lib/chestScan';

interface ScanUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function ScanUploadZone({ onFileSelect, disabled }: ScanUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateChestScanFile(file);
      setError(validationError);
      if (validationError) {
        setPreview(null);
        return;
      }
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {preview ? (
          <img
            src={preview}
            alt="Selected chest X-ray"
            className="max-h-40 rounded-lg object-contain shadow-sm"
          />
        ) : (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-center text-lg font-medium">Drag & drop your chest X-ray</p>
            <p className="mt-1 text-center text-sm text-muted">or click to browse (JPG, PNG, WebP — max 10MB)</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {preview && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <FileImage className="h-4 w-4" />
          Image ready for analysis
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={disabled || !preview}
        onClick={() => inputRef.current?.click()}
      >
        Choose another image
      </Button>
    </div>
  );
}
