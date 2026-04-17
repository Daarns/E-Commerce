'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminService } from '@/services/admin';
import { toast } from 'sonner';

interface ImageUploadZoneProps {
  onImagesUpload: (urls: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function ImageUploadZone({
  onImagesUpload,
  disabled = false,
  maxFiles = 10,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, and GIF files are allowed');
      return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return false;
    }

    return true;
  };

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (disabled) return;

      const fileArray = Array.from(files);
      if (fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      const uploadedUrls: string[] = [];
      const failedFiles: string[] = [];

      try {
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];

          if (!validateFile(file)) {
            failedFiles.push(file.name);
            continue;
          }

          try {
            const response = await adminService.uploadProductImage(file);
            uploadedUrls.push(response.data.image_url);
            setUploadProgress(Math.round(((i + 1) / fileArray.length) * 100));
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            failedFiles.push(file.name);
          }
        }

        if (uploadedUrls.length > 0) {
          onImagesUpload(uploadedUrls);
          toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
        }

        if (failedFiles.length > 0) {
          toast.error(`Failed to upload: ${failedFiles.join(', ')}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError('Failed to upload images. Please try again.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [maxFiles, disabled, onImagesUpload]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled || isUploading) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const { files } = e.dataTransfer;
      if (files.length > 0) {
        handleUpload(files);
      }
    },
    [disabled, isUploading, handleUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={{
          backgroundColor: isDragging ? 'var(--color-muted)' : 'transparent',
          borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        className="border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer"
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {isUploading ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Cloud className="w-10 h-10 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="font-medium">Uploading images...</p>
                <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">
                  {disabled ? 'Upload limit reached' : 'Drag images here or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG, WebP, GIF (Max 5MB per file)
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
