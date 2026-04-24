/**
 * Compress image to WebP format with max dimensions and quality
 * Uses Canvas API - no external dependencies
 */

const MAX_DIMENSION = 1920;
const QUALITY = 0.8;

export async function compressImage(file: File): Promise<File> {
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip if already small enough (under 200KB)
  if (file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Scale down if exceeds max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create new file with WebP extension
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          console.log(
            `Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`
          );

          resolve(compressedFile);
        },
        'image/webp',
        QUALITY
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

// Content type restrictions
export const COMMUNITY_ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
};

export const PRIVATE_CHAT_ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Size limits in bytes
export const SIZE_LIMITS = {
  community: {
    image: 5 * 1024 * 1024, // 5MB
    document: 5 * 1024 * 1024, // 5MB
  },
  privateChat: {
    all: 5 * 1024 * 1024, // 5MB for everything
  },
};

export function isAllowedInCommunity(file: File): { allowed: boolean; reason?: string } {
  const isImage = COMMUNITY_ALLOWED_TYPES.image.includes(file.type);
  const isDocument = COMMUNITY_ALLOWED_TYPES.document.includes(file.type);

  if (!isImage && !isDocument) {
    if (file.type.startsWith('video/')) {
      return { allowed: false, reason: 'Видео не разрешены в сообществе' };
    }
    if (file.type.startsWith('audio/')) {
      return { allowed: false, reason: 'Аудио не разрешены в сообществе' };
    }
    return { allowed: false, reason: 'Этот тип файла не разрешён в сообществе' };
  }

  if (isImage && file.size > SIZE_LIMITS.community.image) {
    return { allowed: false, reason: 'Фото должно быть меньше 5 МБ' };
  }

  if (isDocument && file.size > SIZE_LIMITS.community.document) {
    return { allowed: false, reason: 'PDF должен быть меньше 10 МБ' };
  }

  return { allowed: true };
}

export function isAllowedInPrivateChat(file: File): { allowed: boolean; reason?: string } {
  // Block audio
  if (file.type.startsWith('audio/')) {
    return { allowed: false, reason: 'Аудио не поддерживаются' };
  }

  // Check size limit
  if (file.size > SIZE_LIMITS.privateChat.all) {
    return { allowed: false, reason: 'Файл должен быть меньше 10 МБ' };
  }

  return { allowed: true };
}
