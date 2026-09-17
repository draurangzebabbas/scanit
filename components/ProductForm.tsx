'use client';

import React, { useEffect, useState } from 'react';
import {
  getProductFields,
  saveProductLocal,
  ProductField,
  ProductPhoto,
  ProductRecord,
} from '../lib/db';
import { syncSingleProduct } from '../lib/googleSync';

interface ProductFormProps {
  initialUpc: string;
  onSaveComplete: (record: ProductRecord, scanNext: boolean) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialUpc,
  onSaveComplete,
  onCancel,
}) => {
  const [upc, setUpc] = useState<string>(initialUpc);
  const [fields, setFields] = useState<ProductField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<ProductPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    getProductFields().then((f) => {
      setFields(f);
      const defaults: Record<string, any> = {};
      f.forEach((field) => {
        if (field.type === 'number') defaults[field.id] = '';
        else if (field.type === 'checkbox') defaults[field.id] = false;
        else defaults[field.id] = '';
      });
      // defaults for standard fields
      defaults['quantity'] = 1;
      setFieldValues(defaults);
    });
  }, []);

  const handleFieldChange = (id: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (photos.length + files.length > 5) {
      alert('Maximum 5 photos are allowed per product.');
      return;
    }

    const newPhotos: ProductPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImage(file, 1600, 0.82);
        newPhotos.push(compressed);
      } catch (e) {}
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const compressImage = (
    file: File,
    maxDimension: number,
    quality: number
  ): Promise<ProductPhoto> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas error'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Blob creation failed'));
              const fr = new FileReader();
              fr.onerror = reject;
              fr.onload = () => {
                resolve({
                  dataUrl: fr.result as string,
                  mimeType: 'image/jpeg',
                  name: file.name || 'photo.jpg',
                });
              };
              fr.readAsDataURL(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!upc.trim()) errs['upc'] = 'UPC is required';

    fields.forEach((field) => {
      const val = fieldValues[field.id];
      if (field.required) {
        if (field.type === 'checkbox' && !val) errs[field.id] = `${field.name} is required`;
        else if (val === undefined || val === null || String(val).trim() === '') {
          errs[field.id] = `${field.name} is required`;
        }
      }
      if (field.type === 'number' && val !== '' && val !== undefined) {
        if (!Number.isFinite(Number(val))) {
          errs[field.id] = `${field.name} must be a valid number`;
        }
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (scanNext: boolean) => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      // 1. Instant Save to Local IndexedDB (<5ms)
      const savedRecord = await saveProductLocal({
        upc: upc.trim(),
        fields: fieldValues,
        photos,
      });

      // 2. Trigger asynchronous background sync (Non-blocking)
      syncSingleProduct(savedRecord).catch((err) => {
        console.warn('Background sync queued:', err);
      });

      // 3. Immediate UI response for user
      onSaveComplete(savedRecord, scanNext);
    } catch (e: any) {
      alert(`Save error: ${e?.message || 'Failed to save product locally'}`);
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Product Entry</h2>
          <p className="text-xs text-gray-400">Save product details to inventory</p>
        </div>
        <button
          onClick={onCancel}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        {/* UPC Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Barcode / UPC <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2.5 text-sm font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none"
            placeholder="UPC / EAN"
          />
          {errors['upc'] && (
            <p className="mt-1 text-xs text-rose-500">{errors['upc']}</p>
          )}
        </div>

        {/* Dynamic Fields Form */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3.5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Product Attributes
          </h3>

          {fields.map((field) => {
            const val = fieldValues[field.id];
            const hasErr = errors[field.id];

            if (field.type === 'checkbox') {
              return (
                <div key={field.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={field.id}
                    checked={Boolean(val)}
                    onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-800 bg-gray-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor={field.id} className="text-sm font-medium text-gray-300">
                    {field.name} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {hasErr && <p className="text-xs text-rose-500">{hasErr}</p>}
                </div>
              );
            }

            if (field.type === 'longtext') {
              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {field.name} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <textarea
                    value={val || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    placeholder={`Enter ${field.name}`}
                  />
                  {hasErr && <p className="mt-1 text-xs text-rose-500">{hasErr}</p>}
                </div>
              );
            }

            if (field.type === 'dropdown') {
              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {field.name} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={val || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select option...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {hasErr && <p className="mt-1 text-xs text-rose-500">{hasErr}</p>}
                </div>
              );
            }

            return (
              <div key={field.id}>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {field.name} {field.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  value={val !== undefined ? val : ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder={`Enter ${field.name}`}
                />
                {hasErr && <p className="mt-1 text-xs text-rose-500">{hasErr}</p>}
              </div>
            );
          })}
        </div>

        {/* Photos Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Product Photos ({photos.length}/5)
            </h3>
          </div>

          {/* Photo Thumbnails */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-800 aspect-square">
                  <img
                    src={photo.dataUrl}
                    alt={`Photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 rounded-full bg-rose-600/90 text-white p-1 text-xs shadow hover:bg-rose-500"
                    title="Remove Photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3 italic">No photos added yet.</p>
          )}

          {/* Photo Capture Buttons */}
          {photos.length < 5 && (
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-xl bg-gray-800/80 py-2.5 text-center text-xs font-semibold text-gray-300 hover:bg-gray-700 transition">
                <span>📸 Camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
              </label>

              <label className="flex-1 cursor-pointer rounded-xl border border-gray-800 bg-gray-950 py-2.5 text-center text-xs font-semibold text-gray-300 hover:bg-gray-900 transition">
                <span>🖼️ Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons: Fast Save & Scan Next */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(true)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-center text-sm font-black text-gray-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
          >
            ⚡ SAVE &amp; SCAN NEXT
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(false)}
            className="rounded-2xl border border-gray-700 bg-gray-800 py-3.5 px-6 text-center text-sm font-bold text-white hover:bg-gray-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            SAVE PRODUCT
          </button>
        </div>
      </div>
    </div>
  );
};
