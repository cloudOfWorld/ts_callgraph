import * as ts from 'typescript';
import { AnalysisOptions, AnalysisResult } from '../types';

/**
 * 性能优化管理器
 * 基于Jelly的大规模项目处理策略
 */
export class PerformanceOptimizer {
  private memoryUsage: MemoryUsageTracker;
  private analysisCache: Map<string, any>;
  private fileCache: Map<string, ts.SourceFile>;
  private maxMemoryUsage: number;
  private processingQueue: ProcessingQueue;

  constructor(options: AnalysisOptions = {}) {
    this.memoryUsage = new MemoryUsageTracker();
    this.analysisCache = new Map();
    this.fileCache = new Map();
    this.maxMemoryUsage = options.maxMemoryUsage || 1024 * 1024 * 1024; // 1GB默认
    this.processingQueue = new ProcessingQueue();
  }

  /**
   * 优化分析流程
   */
  async optimizeAnalysis<T>(
    files: string[],
    analyzer: (files: string[]) => Promise<T>,
    options: OptimizationOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // 1. 内存预检查
      this.memoryUsage.checkMemoryAvailability();
      
      // 2. 文件批处理
      if (files.length > (options.batchSize || 100)) {
        return await this.processBatches(files, analyzer, options);
      }
      
      // 3. 并行处理优化
      if (options.enableParallelProcessing && files.length > 20) {
        return await this.processInParallel(files, analyzer, options);
      }
      
      // 4. 直接处理小规模项目
      const result = await analyzer(files);
      
      // 5. 性能监控
      const duration = Date.now() - startTime;
      this.logPerformanceMetrics(files.length, duration);
      
      return result;
      
    } catch (error) {
      this.handlePerformanceError(error, files.length);
      throw error;
    }
  }

  /**
   * 批处理大规模文件
   */
  private async processBatches<T>(
    files: string[],
    analyzer: (files: string[]) => Promise<T>,
    options: OptimizationOptions
  ): Promise<T> {
    const batchSize = options.batchSize || 100;
    const batches = this.createBatches(files, batchSize);
    
    console.log(`📦 分批处理: ${batches.length} 批, 每批 ${batchSize} 文件`);
    
    let mergedResult: any = {
      symbols: [],
      callRelations: [],
      importRelations: [],
      exportRelations: [],
      files: [],
      metadata: {
        analysisDate: new Date(),
        totalFiles: 0,
        totalSymbols: 0,
        totalCallRelations: 0
      }
    };

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 处理批次 ${i + 1}/${batches.length} (${batch.length} 文件)`);
      
      // 内存检查
      if (this.memoryUsage.getCurrentUsage() > this.maxMemoryUsage * 0.8) {
        console.log('⚠️ 内存使用率过高，执行垃圾回收...');
        await this.performGarbageCollection();
      }
      
      try {
        const batchResult = await analyzer(batch);
        mergedResult = this.mergeResults(mergedResult, batchResult);
        
        // 清理批次相关的缓存
        this.cleanupBatchCache(batch);
        
      } catch (error) {
        console.error(`❌ 批次 ${i + 1} 处理失败:`, error);
        if (options.continueOnError) {
          continue;
        } else {
          throw error;
        }
      }
    }

    return mergedResult as T;
  }

  /**
   * 并行处理优化
   */
  private async processInParallel<T>(
    files: string[],
    analyzer: (files: string[]) => Promise<T>,
    options: OptimizationOptions
  ): Promise<T> {
    const workerCount = options.workerCount || Math.min(4, Math.ceil(files.length / 25));
    const chunks = this.createChunks(files, workerCount);
    
    console.log(`⚡ 并行处理: ${workerCount} 个工作线程`);
    
    const promises = chunks.map(async (chunk, index) => {
      console.log(`🧵 工作线程 ${index + 1} 开始处理 ${chunk.length} 文件`);
      return await analyzer(chunk);
    });

    const results = await Promise.all(promises);
    
    // 合并结果
    let mergedResult = results[0];
    for (let i = 1; i < results.length; i++) {
      mergedResult = this.mergeResults(mergedResult, results[i]);
    }

    return mergedResult as T;
  }

  /**
   * 创建文件批次
   */
  private createBatches(files: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 创建并行处理的文件块
   */
  private createChunks(files: string[], chunkCount: number): string[][] {
    const chunks: string[][] = [];
    const chunkSize = Math.ceil(files.length / chunkCount);
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, files.length);
      if (start < end) {
        chunks.push(files.slice(start, end));
      }
    }
    
    return chunks;
  }

  /**
   * 合并分析结果
   */
  private mergeResults(result1: any, result2: any): any {
    return {
      symbols: [...(result1.symbols || []), ...(result2.symbols || [])],
      callRelations: [...(result1.callRelations || []), ...(result2.callRelations || [])],
      importRelations: [...(result1.importRelations || []), ...(result2.importRelations || [])],
      exportRelations: [...(result1.exportRelations || []), ...(result2.exportRelations || [])],
      files: [...new Set([...(result1.files || []), ...(result2.files || [])])],
      metadata: {
        analysisDate: new Date(),
        totalFiles: (result1.files || []).length + (result2.files || []).length,
        totalSymbols: (result1.symbols || []).length + (result2.symbols || []).length,
        totalCallRelations: (result1.callRelations || []).length + (result2.callRelations || []).length,
        ...result1.metadata,
        ...result2.metadata
      }
    };
  }

  /**
   * 执行垃圾回收
   */
  private async performGarbageCollection(): Promise<void> {
    // 清理缓存
    this.clearOldCache();
    
    // 触发V8垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
    
    // 等待一小段时间让垃圾回收完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * 清理旧缓存
   */
  private clearOldCache(): void {
    // 清理分析缓存（保留最近的）
    if (this.analysisCache.size > 1000) {
      const entries = Array.from(this.analysisCache.entries());
      const toKeep = entries.slice(-500); // 保留最近的500个
      this.analysisCache.clear();
      toKeep.forEach(([key, value]) => {
        this.analysisCache.set(key, value);
      });
    }

    // 清理文件缓存
    if (this.fileCache.size > 200) {
      const entries = Array.from(this.fileCache.entries());
      const toKeep = entries.slice(-100); // 保留最近的100个
      this.fileCache.clear();
      toKeep.forEach(([key, value]) => {
        this.fileCache.set(key, value);
      });
    }
  }

  /**
   * 清理批次缓存
   */
  private cleanupBatchCache(batch: string[]): void {
    batch.forEach(file => {
      // 移除不再需要的文件缓存
      this.fileCache.delete(file);
    });
  }

  /**
   * 记录性能指标
   */
  private logPerformanceMetrics(fileCount: number, duration: number): void {
    const memoryUsage = this.memoryUsage.getCurrentUsage();
    const filesPerSecond = Math.round((fileCount / duration) * 1000);
    
    console.log(`📊 性能指标:`);
    console.log(`   文件数: ${fileCount}`);
    console.log(`   耗时: ${duration}ms`);
    console.log(`   速度: ${filesPerSecond} 文件/秒`);
    console.log(`   内存使用: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
  }

  /**
   * 处理性能错误
   */
  private handlePerformanceError(error: any, fileCount: number): void {
    console.error(`❌ 性能优化失败 (${fileCount} 文件):`, error.message);
    
    if (error.message.includes('out of memory')) {
      console.error('💡 建议: 减少batchSize或启用内存限制');
    }
  }

  /**
   * 获取缓存的分析结果
   */
  getCachedResult(key: string): any {
    return this.analysisCache.get(key);
  }

  /**
   * 缓存分析结果
   */
  setCachedResult(key: string, result: any): void {
    this.analysisCache.set(key, result);
  }

  /**
   * 获取缓存的源文件
   */
  getCachedSourceFile(filePath: string): ts.SourceFile | undefined {
    return this.fileCache.get(filePath);
  }

  /**
   * 缓存源文件
   */
  setCachedSourceFile(filePath: string, sourceFile: ts.SourceFile): void {
    this.fileCache.set(filePath, sourceFile);
  }
}

/**
 * 内存使用跟踪器
 */
class MemoryUsageTracker {
  checkMemoryAvailability(): void {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    console.log(`💾 内存状态: ${usedMB}MB / ${totalMB}MB`);
    
    if (usedMB > totalMB * 0.9) {
      console.warn('⚠️ 内存使用率过高，建议释放内存或增加Node.js内存限制');
    }
  }

  getCurrentUsage(): number {
    return process.memoryUsage().heapUsed;
  }
}

/**
 * 处理队列管理器
 */
class ProcessingQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing: boolean = false;
  private concurrency: number = 3;

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(task => task()));
    }

    this.processing = false;
  }
}

// 类型定义
export interface OptimizationOptions {
  batchSize?: number;
  enableParallelProcessing?: boolean;
  workerCount?: number;
  maxMemoryUsage?: number;
  continueOnError?: boolean;
  enableCaching?: boolean;
}

export interface PerformanceMetrics {
  totalFiles: number;
  processingTime: number;
  memoryUsage: number;
  filesPerSecond: number;
  cacheHitRate: number;
}