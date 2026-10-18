import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Link2, CheckCircle2 } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  helpText?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value = '',
  onChange,
  folder = 'general',
  helpText,
  placeholder = 'तस्बिर छान्नुहोस् वा ड्र्याग गर्नुहोस्...',
  required = false,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('कृपया मान्य तस्बिर फाइल (JPG, PNG, WebP, SVG) मात्र छान्नुहोस्।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('तस्बिरको साइज अधिकतम ५ MB भन्दा सानो हुनुपर्छ।');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const token = localStorage.getItem('sms_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'तस्बिर अपलोड गर्न सकिएन।');
      }

      onChange(data.url);
    } catch (err: any) {
      console.error('[ImageUploadField] Error:', err);
      setUploadError(err.message || 'तस्बिर अपलोड गर्दा त्रुटि भयो।');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          <span>{showUrlInput ? 'अपलोड बक्स' : 'सिधै URL हाल्नुहोस्'}</span>
        </button>
      </div>

      {uploadError && (
        <div className="p-2 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900">
          {uploadError}
        </div>
      )}

      {showUrlInput ? (
        <div className="space-y-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/photo.jpg वा /uploads/..."
            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
          />
          {value && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <img
                src={value}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white"
                onError={(e) => ((e.target as any).style.display = 'none')}
              />
              <div className="text-xs text-slate-500 truncate flex-1">{value}</div>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
              >
                हटाउनुहोस्
              </button>
            </div>
          )}
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="relative group shrink-0">
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shadow-xs"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>तस्बिर सुरक्षित छ</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {value}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            >
              फेर्नुहोस्
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              title="तस्बिर हटाउनुहोस्"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                तस्बिर अपलोड हुँदैछ...
              </span>
            </div>
          ) : (
            <>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {placeholder}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  JPG, PNG, WebP, SVG (अधिकतम ५ MB)
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {helpText && (
        <div className="text-[10px] text-slate-500 dark:text-slate-400">{helpText}</div>
      )}
    </div>
  );
};

export default ImageUploadField;
