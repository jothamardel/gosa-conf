/**
 * ImageKit Service for file uploads and management
 * Alternative to Vercel Blob storage
 * Using both imagekit (server-side) and @imagekit/next (URL generation)
 */

import ImageKit from 'imagekit';
import { buildSrc, buildTransformationString } from '@imagekit/next';

// ImageKit configuration interface
interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

// Upload response interface
interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  tags?: string[];
  isPrivateFile: boolean;
  customCoordinates: string | null;
  fileType: string;
}

// Upload options interface
interface UploadOptions {
  fileName?: string;
  folder?: string;
  tags?: string[];
  isPrivateFile?: boolean;
  useUniqueFileName?: boolean;
  responseFields?: string[];
  transformation?: any;
}

class ImageKitService {
  private static config: ImageKitConfig | null = null;
  private static instance: ImageKit | null = null;

  /**
   * Initialize ImageKit configuration
   */
  private static getConfig(): ImageKitConfig {
    if (!this.config) {
      this.config = {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
      };

      // Validate configuration
      if (!this.config.publicKey || !this.config.privateKey || !this.config.urlEndpoint) {
        throw new Error('ImageKit configuration is incomplete. Please check your environment variables.');
      }
    }

    return this.config;
  }

  /**
   * Get ImageKit instance for server-side operations
   */
  private static getImageKitInstance(): ImageKit {
    if (!this.instance) {
      const config = this.getConfig();
      this.instance = new ImageKit(config);
    }
    return this.instance;
  }

  /**
   * Upload a file to ImageKit using server-side upload
   */
  static async uploadFile(
    file: Buffer | string,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<ImageKitUploadResponse> {
    try {
      const imagekit = this.getImageKitInstance();

      const uploadOptions: any = {
        file,
        fileName: options.fileName || fileName,
        folder: options.folder || '/gosa-convention',
        tags: options.tags || ['gosa', 'convention', '2025'],
        isPrivateFile: options.isPrivateFile || false,
        useUniqueFileName: options.useUniqueFileName !== false,
      };

      // Add transformation if provided
      if (options.transformation) {
        uploadOptions.transformation = options.transformation;
      }

      const result = await imagekit.upload(uploadOptions);
      return result as ImageKitUploadResponse;
    } catch (error) {
      console.error('ImageKit upload error:', error);
      throw new Error(`Failed to upload file to ImageKit: ${error}`);
    }
  }

  /**
   * Generate URL with transformations using @imagekit/next
   * @param src - Image path (relative or absolute)
   * @param transformations - Transformation options
   * @returns Generated URL
   */
  static generateURL(
    src: string,
    transformations?: {
      height?: number;
      width?: number;
      quality?: number;
      format?: string;
      crop?: string;
      focus?: string;
    }
  ): string {
    try {
      const config = this.getConfig();

      // Convert transformations to ImageKit format
      const transformationArray = [];
      if (transformations) {
        if (transformations.width) transformationArray.push({ width: transformations.width });
        if (transformations.height) transformationArray.push({ height: transformations.height });
        if (transformations.quality) transformationArray.push({ quality: transformations.quality });
        if (transformations.format) transformationArray.push({ format: transformations.format });
        if (transformations.crop) transformationArray.push({ crop: transformations.crop });
        if (transformations.focus) transformationArray.push({ focus: transformations.focus });
      }

      const url = buildSrc({
        urlEndpoint: config.urlEndpoint,
        src: src,
        transformation: transformationArray.length > 0 ? transformationArray as any : undefined,
      });

      return url;
    } catch (error) {
      console.error('ImageKit URL generation error:', error);
      throw new Error(`Failed to generate URL: ${error}`);
    }
  }

  /**
   * Generate transformation string
   * @param transformations - Transformation options
   * @returns Transformation string
   */
  static generateTransformationString(transformations: any[]): string {
    try {
      return buildTransformationString(transformations);
    } catch (error) {
      console.error('ImageKit transformation string error:', error);
      throw new Error(`Failed to generate transformation string: ${error}`);
    }
  }

  /**
   * Generate authentication parameters for client-side uploads
   */
  static generateAuthenticationParameters(
    token?: string,
    expire: number = 3600
  ): { token: string; expire: number; signature: string } {
    try {
      const imagekit = this.getImageKitInstance();
      const authParams = imagekit.getAuthenticationParameters(token, expire);
      return authParams;
    } catch (error) {
      console.error('ImageKit auth generation error:', error);
      throw new Error(`Failed to generate authentication parameters: ${error}`);
    }
  }

  /**
   * Upload PDF receipt to ImageKit
   */
  static async uploadPDFReceipt(
    pdfBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; type: string }
  ): Promise<ImageKitUploadResponse> {
    const options: UploadOptions = {
      fileName: `${fileName}.pdf`,
      folder: '/gosa-convention/receipts',
      tags: ['receipt', 'pdf', userDetails.type, 'gosa-2025'],
      isPrivateFile: false,
      useUniqueFileName: true,
    };

    return this.uploadFile(pdfBuffer, fileName, options);
  }

  /**
   * Upload image receipt to ImageKit
   */
  static async uploadImageReceipt(
    imageBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; type: string }
  ): Promise<ImageKitUploadResponse> {
    const options: UploadOptions = {
      fileName: `${fileName}.png`,
      folder: '/gosa-convention/images',
      tags: ['receipt', 'image', userDetails.type, 'gosa-2025'],
      isPrivateFile: false,
      useUniqueFileName: true,
      transformation: {
        pre: 'q-80', // Optimize quality
      },
    };

    return this.uploadFile(imageBuffer, fileName, options);
  }

  /**
   * Upload badge image to ImageKit
   */
  static async uploadBadge(
    badgeBuffer: Buffer,
    fileName: string,
    userDetails: { name: string; email: string; registrationId: string }
  ): Promise<ImageKitUploadResponse> {
    const options: UploadOptions = {
      fileName: `badge-${fileName}.png`,
      folder: '/gosa-convention/badges',
      tags: ['badge', 'convention', userDetails.registrationId, 'gosa-2025'],
      isPrivateFile: false,
      useUniqueFileName: true,
      transformation: {
        pre: 'q-90,f-png', // High quality PNG
      },
    };

    return this.uploadFile(badgeBuffer, fileName, options);
  }

  /**
   * Get file details by file ID
   */
  static async getFileDetails(fileId: string) {
    try {
      const imagekit = this.getImageKitInstance();
      const fileDetails = await imagekit.getFileDetails(fileId);
      return fileDetails;
    } catch (error) {
      console.error('ImageKit get file details error:', error);
      throw new Error(`Failed to get file details: ${error}`);
    }
  }

  /**
   * Delete a file from ImageKit
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const imagekit = this.getImageKitInstance();
      await imagekit.deleteFile(fileId);
    } catch (error) {
      console.error('ImageKit delete file error:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * List files in a folder
   */
  static async listFiles(folder: string = '/gosa-convention', limit: number = 100) {
    try {
      const imagekit = this.getImageKitInstance();
      const filesList = await imagekit.listFiles({
        path: folder,
        limit,
        sort: 'DESC_CREATED',
      });
      return filesList;
    } catch (error) {
      console.error('ImageKit list files error:', error);
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Get usage statistics (placeholder - not available in current SDK)
   */
  static async getUsageStats() {
    return {
      message: 'Usage statistics not available in current SDK version',
      plan: 'Check ImageKit dashboard for usage details'
    };
  }

  /**
   * Get configuration status
   */
  static getConfigStatus() {
    try {
      const config = this.getConfig();
      return {
        configured: true,
        publicKey: config.publicKey.substring(0, 20) + '...',
        urlEndpoint: config.urlEndpoint,
        hasPrivateKey: !!config.privateKey,
      };
    } catch (error) {
      return {
        configured: false,
        error: error instanceof Error ? error.message : 'Configuration error',
      };
    }
  }
}

export default ImageKitService;
export type { ImageKitUploadResponse, UploadOptions };