'use client';

import { motion } from 'framer-motion';
import { Cloud, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminImageUpload } from '@/hooks/useAdminImageUpload';

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
  const {
    fileInputRef,
    isDragging,
    isUploading,
    uploadProgress,
    error,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
  } = useAdminImageUpload({ disabled, maxFiles, onImagesUpload });

  return (
    <div className="space-y-4">
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        animate={{
          backgroundColor: isDragging ? 'rgba(var(--muted), 0.5)' : 'rgba(0,0,0,0)',
        }}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragging ? 'border-primary' : 'border-border'
        }`}
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
