import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type S3FolderType = 'avatars' | 'community' | 'chat' | 'audio';

interface UploadResult {
  publicUrl: string;
  key: string;
}

interface UseS3UploadReturn {
  upload: (file: File, folder: S3FolderType) => Promise<UploadResult | null>;
  uploading: boolean;
  progress: number;
}

// Upload with real progress tracking using XMLHttpRequest
const uploadWithProgress = (
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<boolean> => {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        // Map to 20-95% range (leaving room for presign and finalization)
        onProgress(20 + percent * 0.75);
      }
    });
    
    xhr.addEventListener('load', () => {
      resolve(xhr.status >= 200 && xhr.status < 300);
    });
    
    xhr.addEventListener('error', () => {
      resolve(false);
    });
    
    xhr.addEventListener('abort', () => {
      resolve(false);
    });
    
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
};

export function useS3Upload(): UseS3UploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File, folder: S3FolderType): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(5);

    try {
      // Step 1: Get presigned URL from edge function
      setProgress(10);
      
      const { data, error } = await supabase.functions.invoke('s3-presign', {
        body: {
          folder,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        },
      });

      if (error) {
        console.error('Failed to get presigned URL:', error);
        toast.error('Не удалось подготовить загрузку');
        return null;
      }

      const { presignedUrl, publicUrl, key } = data;

      if (!presignedUrl || !publicUrl) {
        console.error('Invalid response from s3-presign:', data);
        toast.error('Ошибка при получении URL для загрузки');
        return null;
      }

      setProgress(20);

      // Step 2: Upload file directly to S3 with progress tracking
      const success = await uploadWithProgress(presignedUrl, file, setProgress);

      if (!success) {
        console.error('S3 upload failed');
        toast.error('Не удалось загрузить файл');
        return null;
      }

      setProgress(100);

      return { publicUrl, key };
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Ошибка при загрузке файла');
      return null;
    } finally {
      // Small delay before resetting to let UI show 100%
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 300);
    }
  }, []);

  return { upload, uploading, progress };
}
