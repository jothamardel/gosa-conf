import { put, del, head } from '@vercel/blob';

export interface ImageMetadata {
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export class VercelBlobService {
  /**
   * Upload image buffer to Vercel Blob storage
   */
  static async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
    try {
      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: this.getContentType(filename)
      });
      
      return blob.url;
    } catch (error) {
      console.error('Error uploading image to Vercel Blob:', error);
      throw new Error('Failed to upload image to storage');
    }
  }

  /**
   * Delete image from Vercel Blob storage
   */
  static async deleteImage(url: string): Promise<boolean> {
    try {
      await del(url);
      return true;
    } catch (error) {
      console.error('Error deleting image from Vercel Blob:', error);
      return false;
    }
  }

  /**
   * Get image metadata from Vercel Blob storage
   */
  static async getImageMetadata(url: string): Promise<ImageMetadata> {
    try {
      const response = await head(url);
      
      return {
        url,
        size: response.size,
        contentType: response.contentType || 'image/jpeg',
        uploadedAt: response.uploadedAt
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error('Failed to get image metadata');
    }
  }

  /**
   * Get content type based on file extension
   */
  private static getContentType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Validate image file
   */
  static validateImageFile(buffer: Buffer, filename: string): { valid: boolean; error?: string } {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return { valid: false, error: 'File size exceeds 5MB limit' };
    }

    // Check file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = filename.toLowerCase().split('.').pop();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed' };
    }

    // Basic file signature validation
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46]
    };

    const signature = signatures[extension as keyof typeof signatures];
    if (signature) {
      const fileSignature = Array.from(buffer.slice(0, signature.length));
      const isValidSignature = signature.every((byte, index) => byte === fileSignature[index]);
      
      if (!isValidSignature) {
        return { valid: false, error: 'Invalid file format or corrupted file' };
      }
    }

    return { valid: true };
  }

  /**
   * Generate unique filename for upload
   */
  static generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const extension = originalName.toLowerCase().split('.').pop();
    return `badges/${userId}_${timestamp}.${extension}`;
  }
}