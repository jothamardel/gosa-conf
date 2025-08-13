import crypto from 'crypto';
import { PDFData } from './pdf-generator.service';
import { PDFMonitoringService } from './pdf-monitoring.service';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  key: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageAccessTime: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface CacheConfig {
  maxSize: number;        // Maximum cache size in bytes
  maxEntries: number;     // Maximum number of entries
  defaultTTL: number;     // Default time-to-live in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export class PDFCacheService {
  private static readonly DEFAULT_CONFIG: CacheConfig = {
    maxSize: 100 * 1024 * 1024,    // 100MB
    maxEntries: 1000,              // 1000 entries
    defaultTTL: 60 * 60 * 1000,    // 1 hour
    cleanupInterval: 15 * 60 * 1000, // 15 minutes
    compressionEnabled: true,
    persistToDisk: false
  };

  private static config: CacheConfig = { ...this.DEFAULT_CONFIG };

  // Cache stores
  private static templateCache: Map<string, CacheEntry<string>> = new Map();
  private static pdfCache: Map<string, CacheEntry<Buffer>> = new Map();
  private static htmlCache: Map<string, CacheEntry<string>> = new Map();
  private static qrCodeCache: Map<string, CacheEntry<string>> = new Map();

  // Statistics
  private static stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    accessCount: 0
  };

  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the cache service
   */
  static initialize(customConfig?: Partial<CacheConfig>): void {
    console.log('Initializing PDF Cache Service...');

    if (customConfig) {
      this.config = { ...this.DEFAULT_CONFIG, ...customConfig };
    }

    // Start cleanup timer
    this.startCleanupTimer();

    // Log configuration
    console.log('PDF Cache Configuration:', {
      maxSize: `${Math.round(this.config.maxSize / 1024 / 1024)}MB`,
      maxEntries: this.config.maxEntries,
      defaultTTL: `${Math.round(this.config.defaultTTL / 1000 / 60)}min`,
      cleanupInterval: `${Math.round(this.config.cleanupInterval / 1000 / 60)}min`,
      compressionEnabled: this.config.compressionEnabled
    });

    console.log('PDF Cache Service initialized successfully');
  }

  /**
   * Generate cache key from PDF data
   */
  static generateCacheKey(data: PDFData): string {
    const keyData = {
      userDetails: data.userDetails,
      operationDetails: {
        type: data.operationDetails.type,
        amount: data.operationDetails.amount,
        paymentReference: data.operationDetails.paymentReference,
        status: data.operationDetails.status,
        description: data.operationDetails.description,
        additionalInfo: data.operationDetails.additionalInfo
      },
      qrCodeData: data.qrCodeData
    };

    const keyString = JSON.stringify(keyData);
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Generate cache key for payment reference
   */
  static generatePaymentReferenceKey(paymentReference: string): string {
    return crypto.createHash('sha256').update(`pdf:${paymentReference}`).digest('hex');
  }

  /**
   * Cache PDF HTML content
   */
  static async cacheHTML(key: string, html: string, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      const size = Buffer.byteLength(html, 'utf8');
      const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

      const entry: CacheEntry<string> = {
        data: html,
        timestamp: Date.now(),
        expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        key
      };

      // Check if we need to make space
      await this.ensureSpace(size);

      this.htmlCache.set(key, entry);

      await this.recordCacheOperation('HTML_CACHE_SET', {
        key,
        size,
        ttl: ttl || this.config.defaultTTL,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      console.error('Error caching HTML:', error);
      await PDFMonitoringService.recordError(
        'error',
        'PDF_CACHE',
        'HTML_CACHE_ERROR',
        `Failed to cache HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { key, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Retrieve cached PDF HTML content
   */
  static async getCachedHTML(key: string): Promise<string | null> {
    const startTime = Date.now();

    try {
      const entry = this.htmlCache.get(key);

      if (!entry) {
        this.stats.misses++;
        await this.recordCacheOperation('HTML_CACHE_MISS', { key });
        return null;
      }

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        this.htmlCache.delete(key);
        this.stats.misses++;
        await this.recordCacheOperation('HTML_CACHE_EXPIRED', { key });
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.stats.hits++;

      const accessTime = Date.now() - startTime;
      this.stats.totalAccessTime += accessTime;
      this.stats.accessCount++;

      await this.recordCacheOperation('HTML_CACHE_HIT', {
        key,
        accessCount: entry.accessCount,
        accessTime
      });

      return entry.data;

    } catch (error) {
      console.error('Error retrieving cached HTML:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache PDF buffer
   */
  static async cachePDF(key: string, pdfBuffer: Buffer, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      const size = pdfBuffer.length;
      const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

      // Compress if enabled and beneficial
      let data = pdfBuffer;
      if (this.config.compressionEnabled && size > 10240) { // 10KB threshold
        data = await this.compressBuffer(pdfBuffer);
      }

      const entry: CacheEntry<Buffer> = {
        data,
        timestamp: Date.now(),
        expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: data.length,
        key
      };

      // Check if we need to make space
      await this.ensureSpace(data.length);

      this.pdfCache.set(key, entry);

      await this.recordCacheOperation('PDF_CACHE_SET', {
        key,
        originalSize: size,
        compressedSize: data.length,
        compressionRatio: size > 0 ? data.length / size : 1,
        ttl: ttl || this.config.defaultTTL,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      console.error('Error caching PDF:', error);
      await PDFMonitoringService.recordError(
        'error',
        'PDF_CACHE',
        'PDF_CACHE_ERROR',
        `Failed to cache PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { key, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Retrieve cached PDF buffer
   */
  static async getCachedPDF(key: string): Promise<Buffer | null> {
    const startTime = Date.now();

    try {
      const entry = this.pdfCache.get(key);

      if (!entry) {
        this.stats.misses++;
        await this.recordCacheOperation('PDF_CACHE_MISS', { key });
        return null;
      }

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        this.pdfCache.delete(key);
        this.stats.misses++;
        await this.recordCacheOperation('PDF_CACHE_EXPIRED', { key });
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.stats.hits++;

      const accessTime = Date.now() - startTime;
      this.stats.totalAccessTime += accessTime;
      this.stats.accessCount++;

      // Decompress if needed
      let data = entry.data;
      if (this.config.compressionEnabled) {
        data = await this.decompressBuffer(entry.data);
      }

      await this.recordCacheOperation('PDF_CACHE_HIT', {
        key,
        accessCount: entry.accessCount,
        accessTime,
        size: data.length
      });

      return data;

    } catch (error) {
      console.error('Error retrieving cached PDF:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache QR code data URL
   */
  static async cacheQRCode(qrData: string, dataURL: string, ttl?: number): Promise<void> {
    try {
      const key = crypto.createHash('sha256').update(qrData).digest('hex');
      const size = Buffer.byteLength(dataURL, 'utf8');
      const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

      const entry: CacheEntry<string> = {
        data: dataURL,
        timestamp: Date.now(),
        expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        key
      };

      this.qrCodeCache.set(key, entry);

      await this.recordCacheOperation('QR_CACHE_SET', { key, size });

    } catch (error) {
      console.error('Error caching QR code:', error);
    }
  }

  /**
   * Retrieve cached QR code data URL
   */
  static async getCachedQRCode(qrData: string): Promise<string | null> {
    try {
      const key = crypto.createHash('sha256').update(qrData).digest('hex');
      const entry = this.qrCodeCache.get(key);

      if (!entry || Date.now() > entry.expiresAt) {
        if (entry) {
          this.qrCodeCache.delete(key);
        }
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();

      await this.recordCacheOperation('QR_CACHE_HIT', { key });

      return entry.data;

    } catch (error) {
      console.error('Error retrieving cached QR code:', error);
      return null;
    }
  }

  /**
   * Cache template content
   */
  static async cacheTemplate(templateKey: string, template: string, ttl?: number): Promise<void> {
    try {
      const size = Buffer.byteLength(template, 'utf8');
      const expiresAt = Date.now() + (ttl || this.config.defaultTTL * 4); // Templates live longer

      const entry: CacheEntry<string> = {
        data: template,
        timestamp: Date.now(),
        expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        key: templateKey
      };

      this.templateCache.set(templateKey, entry);

      await this.recordCacheOperation('TEMPLATE_CACHE_SET', { key: templateKey, size });

    } catch (error) {
      console.error('Error caching template:', error);
    }
  }

  /**
   * Retrieve cached template
   */
  static async getCachedTemplate(templateKey: string): Promise<string | null> {
    try {
      const entry = this.templateCache.get(templateKey);

      if (!entry || Date.now() > entry.expiresAt) {
        if (entry) {
          this.templateCache.delete(templateKey);
        }
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();

      await this.recordCacheOperation('TEMPLATE_CACHE_HIT', { key: templateKey });

      return entry.data;

    } catch (error) {
      console.error('Error retrieving cached template:', error);
      return null;
    }
  }

  /**
   * Invalidate cache entries for a payment reference
   */
  static async invalidatePaymentReference(paymentReference: string): Promise<void> {
    try {
      const keyPattern = paymentReference;
      let invalidatedCount = 0;

      // Invalidate HTML cache
      Array.from(this.htmlCache.entries()).forEach(([key, entry]) => {
        if (key.includes(keyPattern)) {
          this.htmlCache.delete(key);
          invalidatedCount++;
        }
      });

      // Invalidate PDF cache
      Array.from(this.pdfCache.entries()).forEach(([key, entry]) => {
        if (key.includes(keyPattern)) {
          this.pdfCache.delete(key);
          invalidatedCount++;
        }
      });

      await this.recordCacheOperation('CACHE_INVALIDATION', {
        paymentReference,
        invalidatedCount
      });

      console.log(`Invalidated ${invalidatedCount} cache entries for payment reference: ${paymentReference}`);

    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): CacheStats {
    const totalEntries = this.htmlCache.size + this.pdfCache.size + this.qrCodeCache.size + this.templateCache.size;
    const totalSize = this.calculateTotalSize();
    const totalRequests = this.stats.hits + this.stats.misses;

    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    // Find oldest and newest entries
    const allEntries = [
      ...this.htmlCache.values(),
      ...this.pdfCache.values(),
      ...this.qrCodeCache.values(),
      ...this.templateCache.values()
    ];

    if (allEntries.length > 0) {
      const timestamps = allEntries.map(entry => entry.timestamp);
      oldestEntry = new Date(Math.min(...timestamps));
      newestEntry = new Date(Math.max(...timestamps));
    }

    return {
      totalEntries,
      totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageAccessTime: this.stats.accessCount > 0 ? this.stats.totalAccessTime / this.stats.accessCount : 0,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear all caches
   */
  static clearAll(): void {
    this.htmlCache.clear();
    this.pdfCache.clear();
    this.qrCodeCache.clear();
    this.templateCache.clear();

    // Reset statistics
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
      accessCount: 0
    };

    console.log('All PDF caches cleared');
  }

  /**
   * Clear expired entries
   */
  static clearExpired(): number {
    const now = Date.now();
    let clearedCount = 0;

    // Clear expired HTML cache entries
    Array.from(this.htmlCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.htmlCache.delete(key);
        clearedCount++;
      }
    });

    // Clear expired PDF cache entries
    Array.from(this.pdfCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.pdfCache.delete(key);
        clearedCount++;
      }
    });

    // Clear expired QR code cache entries
    for (const [key, entry] of this.qrCodeCache.entries()) {
      if (now > entry.expiresAt) {
        this.qrCodeCache.delete(key);
        clearedCount++;
      }
    }

    // Clear expired template cache entries
    for (const [key, entry] of this.templateCache.entries()) {
      if (now > entry.expiresAt) {
        this.templateCache.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} expired cache entries`);
    }

    return clearedCount;
  }

  /**
   * Ensure there's enough space in cache
   */
  private static async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = this.calculateTotalSize();
    const currentEntries = this.htmlCache.size + this.pdfCache.size + this.qrCodeCache.size + this.templateCache.size;

    // Check size limit
    if (currentSize + requiredSize > this.config.maxSize) {
      await this.evictLRU(requiredSize);
    }

    // Check entry limit
    if (currentEntries >= this.config.maxEntries) {
      await this.evictLRU(0, 1);
    }
  }

  /**
   * Evict least recently used entries
   */
  private static async evictLRU(requiredSize: number, requiredEntries: number = 0): Promise<void> {
    const allEntries: Array<{ key: string; entry: CacheEntry<any>; cache: string }> = [];

    // Collect all entries with their cache type
    for (const [key, entry] of this.htmlCache.entries()) {
      allEntries.push({ key, entry, cache: 'html' });
    }
    for (const [key, entry] of this.pdfCache.entries()) {
      allEntries.push({ key, entry, cache: 'pdf' });
    }
    for (const [key, entry] of this.qrCodeCache.entries()) {
      allEntries.push({ key, entry, cache: 'qr' });
    }
    for (const [key, entry] of this.templateCache.entries()) {
      allEntries.push({ key, entry, cache: 'template' });
    }

    // Sort by last accessed time (oldest first)
    allEntries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    let freedSize = 0;
    let freedEntries = 0;

    for (const { key, entry, cache } of allEntries) {
      if (freedSize >= requiredSize && freedEntries >= requiredEntries) {
        break;
      }

      // Remove from appropriate cache
      switch (cache) {
        case 'html':
          this.htmlCache.delete(key);
          break;
        case 'pdf':
          this.pdfCache.delete(key);
          break;
        case 'qr':
          this.qrCodeCache.delete(key);
          break;
        case 'template':
          this.templateCache.delete(key);
          break;
      }

      freedSize += entry.size;
      freedEntries++;
    }

    if (freedEntries > 0) {
      await this.recordCacheOperation('CACHE_EVICTION', {
        freedSize,
        freedEntries,
        requiredSize,
        requiredEntries
      });

      console.log(`Evicted ${freedEntries} cache entries, freed ${Math.round(freedSize / 1024)}KB`);
    }
  }

  /**
   * Calculate total cache size
   */
  private static calculateTotalSize(): number {
    let totalSize = 0;

    for (const entry of this.htmlCache.values()) {
      totalSize += entry.size;
    }
    for (const entry of this.pdfCache.values()) {
      totalSize += entry.size;
    }
    for (const entry of this.qrCodeCache.values()) {
      totalSize += entry.size;
    }
    for (const entry of this.templateCache.values()) {
      totalSize += entry.size;
    }

    return totalSize;
  }

  /**
   * Compress buffer (placeholder - implement with actual compression)
   */
  private static async compressBuffer(buffer: Buffer): Promise<Buffer> {
    // In a real implementation, use zlib or similar compression
    // For now, return the original buffer
    return buffer;
  }

  /**
   * Decompress buffer (placeholder - implement with actual decompression)
   */
  private static async decompressBuffer(buffer: Buffer): Promise<Buffer> {
    // In a real implementation, use zlib or similar decompression
    // For now, return the original buffer
    return buffer;
  }

  /**
   * Start cleanup timer
   */
  private static startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * Record cache operation for monitoring
   */
  private static async recordCacheOperation(operation: string, details: Record<string, any>): Promise<void> {
    try {
      await PDFMonitoringService.recordError(
        'warning',
        'PDF_CACHE',
        operation,
        `PDF cache operation: ${operation}`,
        {
          ...details,
          timestamp: new Date().toISOString(),
          cacheStats: this.getCacheStats()
        }
      );
    } catch (error) {
      // Don't let monitoring errors affect cache operations
      console.error('Error recording cache operation:', error);
    }
  }

  /**
   * Shutdown cache service
   */
  static shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('PDF Cache Service shut down');
  }
}