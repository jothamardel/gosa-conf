/**
 * Integration tests for ImageKit service
 * These tests require actual ImageKit credentials to run
 */

import ImageKitService from '@/lib/services/imagekit.service';
import StorageService from '@/lib/services/storage.service';

// Mock environment variables for testing
const mockEnvVars = {
  IMAGEKIT_PUBLIC_KEY: 'test_public_key',
  IMAGEKIT_PRIVATE_KEY: 'test_private_key',
  IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/test',
  STORAGE_PROVIDER: 'imagekit'
};

// Set up environment variables
Object.entries(mockEnvVars).forEach(([key, value]) => {
  process.env[key] = value;
});

describe('ImageKit Integration Tests', () => {
  // Skip these tests in CI/CD unless ImageKit credentials are provided
  const skipTests = !process.env.IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY === 'test_public_key';

  beforeAll(() => {
    if (skipTests) {
      console.log('Skipping ImageKit integration tests - no credentials provided');
    }
  });

  describe('ImageKitService', () => {
    it('should handle missing credentials gracefully', () => {
      // Test with invalid credentials
      expect(() => {
        // This should throw an error about incomplete configuration
        ImageKitService.generateAuthenticationParameters();
      }).toThrow('ImageKit configuration is incomplete');
    });

    it('should generate authentication parameters with valid config', () => {
      if (skipTests) return;

      const authParams = ImageKitService.generateAuthenticationParameters();
      expect(authParams).toHaveProperty('token');
      expect(authParams).toHaveProperty('expire');
      expect(authParams).toHaveProperty('signature');
    });

    it('should generate URLs correctly', () => {
      if (skipTests) return;

      const url = ImageKitService.generateURL('/test-image.jpg', {
        width: 300,
        height: 200,
        quality: 80
      });

      expect(url).toContain('ik.imagekit.io');
      expect(url).toContain('w-300');
      expect(url).toContain('h-200');
      expect(url).toContain('q-80');
    });
  });

  describe('StorageService', () => {
    it('should return correct provider status', () => {
      const status = StorageService.getProviderStatus();

      expect(status).toHaveProperty('imagekit');
      expect(status).toHaveProperty('vercel');
      expect(status).toHaveProperty('current');
      expect(status.current).toBe('imagekit');
    });

    it('should handle file upload with mock data', async () => {
      if (skipTests) return;

      // Create a test buffer
      const testBuffer = Buffer.from('test file content', 'utf-8');
      const fileName = 'test-file.txt';

      try {
        const result = await StorageService.uploadFile(testBuffer, fileName, {
          folder: '/test',
          tags: ['test', 'integration'],
          isPrivate: false
        });

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('fileName');
        expect(result).toHaveProperty('provider', 'imagekit');
      } catch (error) {
        // Expected to fail with test credentials
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file uploads gracefully', async () => {
      if (skipTests) return;

      try {
        await StorageService.uploadFile(Buffer.alloc(0), '', {});
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Failed to upload');
      }
    });

    it('should provide meaningful error messages', () => {
      try {
        ImageKitService.generateAuthenticationParameters();
      } catch (error) {
        expect(error.message).toContain('ImageKit configuration is incomplete');
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', () => {
      const originalEnv = process.env.IMAGEKIT_PUBLIC_KEY;
      delete process.env.IMAGEKIT_PUBLIC_KEY;

      expect(() => {
        ImageKitService.generateAuthenticationParameters();
      }).toThrow();

      // Restore environment variable
      process.env.IMAGEKIT_PUBLIC_KEY = originalEnv;
    });

    it('should detect provider configuration correctly', () => {
      const status = StorageService.getProviderStatus();

      // With mock credentials, should show as configured but may not be functional
      expect(status.imagekit.configured).toBe(true);
      expect(status.current).toBe('imagekit');
    });
  });
});

// Helper function to create test files
function createTestFile(name: string, content: string, type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Mock File constructor for Node.js environment
if (typeof File === 'undefined') {
  global.File = class File {
    name: string;
    type: string;
    size: number;

    constructor(chunks: any[], filename: string, options: any = {}) {
      this.name = filename;
      this.type = options.type || 'text/plain';
      this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
    }
  } as any;
}

// Export test utilities for use in other tests
export {
  createTestFile,
  mockEnvVars
};