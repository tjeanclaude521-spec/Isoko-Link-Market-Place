import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image-compress';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  shape?: 'square' | 'circle';
  size?: number;
  userId: string;
  folder?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUpload({
  value,
  onChange,
  label,
  shape = 'square',
  size = 96,
  userId,
  folder = 'products',
  onUploadingChange,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB.');
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const { blob, type: compressedType, ext } = await compressImage(file);
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('The compressed image is still larger than 5 MB.');
      }
      const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('images')
        .upload(path, blob, { contentType: compressedType, upsert: false });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('images').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      console.error('image upload failed', err);
      const detail = typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string'
        ? (err as { message: string }).message
        : err instanceof Error ? err.message : '';
      setError(detail ? `Image upload failed: ${detail}` : 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div>
      {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
      <div className="flex items-center gap-4">
        <div
          className={`relative ${shapeClass} overflow-hidden bg-stone-100 border border-stone-300 flex items-center justify-center flex-shrink-0`}
          style={{ width: size, height: size }}
        >
          {value ? (
            <>
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 text-stone-400 animate-spin" />
          ) : (
            <ImageIcon className="h-7 w-7 text-stone-300" />
          )}
        </div>

        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
            id={`file-${folder}-${userId}`}
          />
          <label
            htmlFor={`file-${folder}-${userId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 cursor-pointer transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {value ? 'Replace image' : 'Choose image'}
              </>
            )}
          </label>
          <p className="text-xs text-stone-400 mt-1.5">PNG, JPG or WEBP. Max 5 MB.</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
