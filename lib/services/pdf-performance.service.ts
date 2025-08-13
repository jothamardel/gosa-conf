import { PDFData } from '../types';
import { PDFCacheService } from './pdf-cache.service';
import { PDFMonitoringService } from './pdf-monitoring.service';

export interface PerformanceMetrics {
  averageGenerationTime: number;
  averageCacheHitTime: number;
  averageCacheMissTime: number;
  concurrentOperations: number;
  queueLength: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cacheEfficiency: number;
  throughput: number; // operations per second
}

export interface ResourceLimits {
  maxConcurrentOperations: number;
  maxQueueSize: number;
  maxMemoryUsage: number; // in bytes
  operationTimeout: number; // in milliseconds
}

export interface QueuedOperation {
  id: string;
  data: PDFData;
  type: 'html' | 'pdf';
  priority: number;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

export class PDFPerformanceService {
  private static readonly DEFAULT_LIMITS: ResourceLimits = {
    maxConcurrentOperations: 10,
    maxQueueSize: 100,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    operationTimeout: 30000 // 30 seconds
  };

  private static limits: ResourceLimits = { ...this.DEFAULT_LIMITS };
  private static operationQueue: QueuedOperation[] = [];
  private static activeOperations: Map<string, QueuedOperation> = new Map();
  private static metrics = {
    totalOperations: 0,
    totalGenerationTime: 0,
    totalCacheHits: 0,
    totalCacheMisses: 0,
    cacheHitTime: 0,
    cacheMissTime: 0,
    startTime: Date.now()
  };

  private static processingTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the performance service
   */
  static initialize(customLimits?: Partial<ResourceLimits>): void {
    console.log('Initializing PDF Performance Service...');

    if (customLimits) {
      this.limits = { ...this.DEFAULT_LIMITS, ...customLimits };
    }

    // Start queue processing
    this.startQueueProcessor();

    // Initialize cache service
    PDFCacheService.initialize({
      maxSize: Math.floor(this.limits.maxMemoryUsage * 0.7), // 70% of memory limit for cache
      maxEntries: 500,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 15 * 60 * 1000, // 15 minutes
      compressionEnabled: true,
      persistToDisk: false
    });

    console.log('PDF Performance Service initialized with limits:', this.limits);
  }

  /**
   * Generate PDF HTML with performance optimization
   */
  static async generateOptimizedHTML(data: PDFData, priority: number = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      const operationId = this.generateOperationId();
      const operation: QueuedOperation = {
        id: operationId,
        data,
        type: 'html',
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.enqueueOperation(operation);
    });
  }

  /**
   * Generate PDF buffer with performance optimization
   */
  static async generateOptimizedPDF(data: PDFData, priority: number = 5): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const operationId = this.generateOperationId();
      const operation: QueuedOperation = {
        id: operationId,
        data,
        type: 'pdf',
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.enqueueOperation(operation);
    });
  }

  /**
   * Batch generate multiple PDFs
   */
  static async batchGenerate(
    requests: Array<{ data: PDFData; type: 'html' | 'pdf'; priority?: number }>
  ): Promise<Array<{ success: boolean; result?: any; error?: string }>> {
    const startTime = Date.now();

    try {
      console.log(`Starting batch generation of ${requests.length} PDFs`);

      // Create promises for all requests
      const promises = requests.map(async (request, index) => {
        try {
          const result = request.type === 'html'
            ? await this.generateOptimizedHTML(request.data, request.priority || 5)
            : await this.generateOptimizedPDF(request.data, request.priority || 5);

          return { success: true, result };
        } catch (error) {
          console.error(`Batch operation ${index} failed:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      // Wait for all operations to complete
      const results = await Promise.allSettled(promises);

      const finalResults = results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : { success: false, error: 'Promise rejected' }
      );

      const successCount = finalResults.filter(r => r.success).length;
      const processingTime = Date.now() - startTime;

      await PDFMonitoringService.recordError(
        'warning',
        'PDF_PERFORMANCE',
        'BATCH_GENERATION_COMPLETE',
        `Batch generation completed: ${successCount}/${requests.length} successful`,
        {
          totalRequests: requests.length,
          successCount,
          failureCount: requests.length - successCount,
          processingTime,
          averageTimePerRequest: processingTime / requests.length
        }
      );

      console.log(`Batch generation completed: ${successCount}/${requests.length} successful in ${processingTime}ms`);

      return finalResults;

    } catch (error) {
      console.error('Batch generation error:', error);
      throw error;
    }
  }

  /**
   * Enqueue operation for processing
   */
  private static enqueueOperation(operation: QueuedOperation): void {
    // Check queue size limit
    if (this.operationQueue.length >= this.limits.maxQueueSize) {
      operation.reject(new Error('Queue is full. Please try again later.'));
      return;
    }

    // Set timeout for operation
    operation.timeout = setTimeout(() => {
      this.removeFromQueue(operation.id);
      operation.reject(new Error('Operation timed out'));
    }, this.limits.operationTimeout);

    // Add to queue (sorted by priority, higher priority first)
    this.operationQueue.push(operation);
    this.operationQueue.sort((a, b) => b.priority - a.priority);

    console.log(`Operation ${operation.id} queued (priority: ${operation.priority}, queue length: ${this.operationQueue.length})`);
  }

  /**
   * Process operations from queue
   */
  private static async processQueue(): Promise<void> {
    // Check if we can process more operations
    if (this.activeOperations.size >= this.limits.maxConcurrentOperations) {
      return;
    }

    // Check memory usage
    if (this.isMemoryLimitExceeded()) {
      console.warn('Memory limit exceeded, pausing queue processing');
      return;
    }

    // Get next operation from queue
    const operation = this.operationQueue.shift();
    if (!operation) {
      return;
    }

    // Move to active operations
    this.activeOperations.set(operation.id, operation);

    try {
      console.log(`Processing operation ${operation.id} (type: ${operation.type}, active: ${this.activeOperations.size})`);

      const startTime = Date.now();
      let result: any;

      if (operation.type === 'html') {
        result = await this.executeHTMLGeneration(operation.data);
      } else {
        result = await this.executePDFGeneration(operation.data);
      }

      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime, true);

      // Clear timeout
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }

      // Resolve the operation
      operation.resolve(result);

      console.log(`Operation ${operation.id} completed in ${processingTime}ms`);

    } catch (error) {
      console.error(`Operation ${operation.id} failed:`, error);

      // Clear timeout
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }

      // Reject the operation
      operation.reject(error instanceof Error ? error : new Error('Unknown error'));

    } finally {
      // Remove from active operations
      this.activeOperations.delete(operation.id);
    }
  }

  /**
   * Execute HTML generation with caching
   */
  private static async executeHTMLGeneration(data: PDFData): Promise<string> {
    const { PDFGeneratorService } = await import('./pdf-generator.service');
    return await PDFGeneratorService.generatePDFHTML(data);
  }

  /**
   * Execute PDF generation with caching
   */
  private static async executePDFGeneration(data: PDFData): Promise<Buffer> {
    const { PDFGeneratorService } = await import('./pdf-generator.service');
    return await PDFGeneratorService.generatePDFBuffer(data);
  }

  /**
   * Remove operation from queue
   */
  private static removeFromQueue(operationId: string): void {
    const index = this.operationQueue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const operation = this.operationQueue[index];
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
      this.operationQueue.splice(index, 1);
    }
  }

  /**
   * Start queue processor
   */
  private static startQueueProcessor(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    this.processingTimer = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }, 100); // Process every 100ms
  }

  /**
   * Check if memory limit is exceeded
   */
  private static isMemoryLimitExceeded(): boolean {
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed > this.limits.maxMemoryUsage;
  }

  /**
   * Update performance metrics
   */
  private static updateMetrics(processingTime: number, cacheHit: boolean): void {
    this.metrics.totalOperations++;
    this.metrics.totalGenerationTime += processingTime;

    if (cacheHit) {
      this.metrics.totalCacheHits++;
      this.metrics.cacheHitTime += processingTime;
    } else {
      this.metrics.totalCacheMisses++;
      this.metrics.cacheMissTime += processingTime;
    }
  }

  /**
   * Generate unique operation ID
   */
  private static generateOperationId(): string {
    return `pdf_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cacheStats = PDFCacheService.getCacheStats();
    const uptime = Date.now() - this.metrics.startTime;

    return {
      averageGenerationTime: this.metrics.totalOperations > 0
        ? this.metrics.totalGenerationTime / this.metrics.totalOperations
        : 0,
      averageCacheHitTime: this.metrics.totalCacheHits > 0
        ? this.metrics.cacheHitTime / this.metrics.totalCacheHits
        : 0,
      averageCacheMissTime: this.metrics.totalCacheMisses > 0
        ? this.metrics.cacheMissTime / this.metrics.totalCacheMisses
        : 0,
      concurrentOperations: this.activeOperations.size,
      queueLength: this.operationQueue.length,
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cacheEfficiency: cacheStats.hitRate,
      throughput: uptime > 0 ? (this.metrics.totalOperations / uptime) * 1000 : 0 // ops per second
    };
  }

  /**
   * Optimize memory usage
   */
  static async optimizeMemory(): Promise<void> {
    console.log('Starting memory optimization...');

    const beforeMemory = process.memoryUsage();

    // Clear expired cache entries
    const clearedEntries = PDFCacheService.clearExpired();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const afterMemory = process.memoryUsage();
    const freedMemory = beforeMemory.heapUsed - afterMemory.heapUsed;

    await PDFMonitoringService.recordError(
      'warning',
      'PDF_PERFORMANCE',
      'MEMORY_OPTIMIZATION',
      'Memory optimization completed',
      {
        clearedCacheEntries: clearedEntries,
        freedMemory,
        beforeMemory: beforeMemory.heapUsed,
        afterMemory: afterMemory.heapUsed,
        memoryReduction: freedMemory > 0 ? ((freedMemory / beforeMemory.heapUsed) * 100).toFixed(2) + '%' : '0%'
      }
    );

    console.log(`Memory optimization completed: freed ${Math.round(freedMemory / 1024)}KB, cleared ${clearedEntries} cache entries`);
  }

  /**
   * Get queue status
   */
  static getQueueStatus(): {
    queueLength: number;
    activeOperations: number;
    averageWaitTime: number;
    oldestQueuedOperation?: Date;
  } {
    const now = Date.now();
    const waitTimes = this.operationQueue.map(op => now - op.timestamp);
    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
      : 0;

    const oldestOperation = this.operationQueue.length > 0
      ? new Date(Math.min(...this.operationQueue.map(op => op.timestamp)))
      : undefined;

    return {
      queueLength: this.operationQueue.length,
      activeOperations: this.activeOperations.size,
      averageWaitTime,
      oldestQueuedOperation: oldestOperation
    };
  }

  /**
   * Clear all queues and reset
   */
  static clearQueues(): void {
    // Clear timeouts for queued operations
    this.operationQueue.forEach(operation => {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
      operation.reject(new Error('Queue cleared'));
    });

    // Clear active operations
    this.activeOperations.forEach(operation => {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
      operation.reject(new Error('Operations cleared'));
    });

    this.operationQueue.length = 0;
    this.activeOperations.clear();

    console.log('All PDF operation queues cleared');
  }

  /**
   * Update resource limits
   */
  static updateLimits(newLimits: Partial<ResourceLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    console.log('PDF Performance limits updated:', this.limits);
  }

  /**
   * Shutdown performance service
   */
  static shutdown(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.clearQueues();
    PDFCacheService.shutdown();

    console.log('PDF Performance Service shut down');
  }

  /**
   * Health check for performance service
   */
  static healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: PerformanceMetrics;
  } {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check queue length
    if (metrics.queueLength > this.limits.maxQueueSize * 0.8) {
      issues.push('Queue is nearly full');
      status = 'degraded';
    }

    // Check memory usage
    if (metrics.memoryUsage.percentage > 90) {
      issues.push('High memory usage');
      status = 'unhealthy';
    } else if (metrics.memoryUsage.percentage > 75) {
      issues.push('Elevated memory usage');
      status = 'degraded';
    }

    // Check cache efficiency
    if (metrics.cacheEfficiency < 0.3) {
      issues.push('Low cache hit rate');
      status = 'degraded';
    }

    // Check average generation time
    if (metrics.averageGenerationTime > 10000) { // 10 seconds
      issues.push('Slow PDF generation');
      status = 'degraded';
    }

    return { status, issues, metrics };
  }
}