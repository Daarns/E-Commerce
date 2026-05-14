import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin';

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

interface UseAdminImageUploadParams {
  disabled: boolean;
  maxFiles: number;
  onImagesUpload: (urls: string[]) => void;
}

interface UseAdminImageUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  handleDragEnter: (event: React.DragEvent) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useAdminImageUpload({
  disabled,
  maxFiles,
  onImagesUpload,
}: UseAdminImageUploadParams): UseAdminImageUploadReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!VALID_IMAGE_TYPES.includes(file.type as (typeof VALID_IMAGE_TYPES)[number])) {
      setError('Only JPEG, PNG, WebP, and GIF files are allowed');
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('File size must be less than 5MB');
      return false;
    }

    return true;
  }, []);

  const resetFileInput = useCallback((): void => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = useCallback(
    async (files: FileList): Promise<void> => {
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
        for (let index = 0; index < fileArray.length; index += 1) {
          const file = fileArray[index];
          if (!file) continue;

          if (!validateFile(file)) {
            failedFiles.push(file.name);
            continue;
          }

          try {
            const response = await adminService.uploadProductImage(file);
            uploadedUrls.push(response.data.image_url);
            setUploadProgress(Math.round(((index + 1) / fileArray.length) * 100));
          } catch (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
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
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Failed to upload images. Please try again.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        resetFileInput();
      }
    },
    [disabled, maxFiles, onImagesUpload, resetFileInput, validateFile]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent): void => {
      if (disabled || isUploading) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const { files } = event.dataTransfer;
      if (files.length > 0) {
        void handleUpload(files);
      }
    },
    [disabled, handleUpload, isUploading]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      if (event.target.files) {
        void handleUpload(event.target.files);
      }
    },
    [handleUpload]
  );

  return {
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
  };
}
