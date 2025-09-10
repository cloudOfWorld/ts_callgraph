/**
 * 多语言分析器管理器
 * 结合三个项目的思想，统一管理TypeScript和JavaScript的分析
 * 
 * 设计思想来源：
 * - TS-Call-Graph: 专注于类级别的深度分析
 * - TypeScript-Call-Graph: 提供CLI工具和多种输出格式
 * - Jelly: 学术级的静态分析精度和JavaScript动态特性处理
 */

import * as path from 'path';
import { TypeScriptAnalyzer } from './analyzer';
import { PerformanceOptimizer, OptimizationOptions } from './performance-optimizer';
import { 
  AnalysisResult, 
  AnalysisOptions, 
  Symbol, 
  CallRelation,
  ImportRelation,
  ExportRelation 
} from '../types';
import { Utils } from '../utils';

/**
 * 多语言分析器管理器
 */
export class MultiLanguageAnalyzer {
  private options: AnalysisOptions;
  private performanceOptimizer: PerformanceOptimizer;

  constructor(
    private rootPath: string,
    options: AnalysisOptions = {}
  ) {
    this.options = {
      excludePatterns: ['node_modules/**', '**/*.d.ts', '**/dist/**', '**/build/**'],
      includeJavaScript: true,  // 默认包含JavaScript
      includeTypeScript: true, // 默认包含TypeScript
      analyzeCallChains: true,  // 分析调用链
      detectPatterns: true,     // 检测设计模式
      ...options
    };
    
    // 初始化性能优化器
    this.performanceOptimizer = new PerformanceOptimizer({
      batchSize: this.options.batchSize || 50,
      enableParallelProcessing: this.options.enableParallelProcessing !== false,
      maxMemoryUsage: this.options.maxMemoryUsage || 1024 * 1024 * 1024, // 1GB
      continueOnError: this.options.continueOnError || false
    });
  }

  /**
   * 分析项目中的所有支持文件
   * 使用性能优化策略处理大规模项目
   */
  async analyze(patterns: string[]): Promise<AnalysisResult> {
    console.log('开始多语言项目分析...');
    
    // 查找所有文件
    const allFiles = await Utils.findFiles(patterns, this.options.excludePatterns);
    
    // 按语言类型分类文件
    const filesByLanguage = this.categorizeFiles(allFiles);
    
    console.log(`发现文件: TypeScript(${filesByLanguage.typescript.length}), JavaScript(${filesByLanguage.javascript.length})`);

    // 合并所有需要分析的文件
    const filesToAnalyze = [
      ...(this.options.includeTypeScript ? filesByLanguage.typescript : []),
      ...(this.options.includeJavaScript ? filesByLanguage.javascript : [])
    ];

    if (filesToAnalyze.length === 0) {
      console.warn('未找到可分析的文件');
      return this.createEmptyResult();
    }
    
    // 使用性能优化器执行分析
    const result = await this.performanceOptimizer.optimizeAnalysis(
      filesToAnalyze,
      async (files) => {
        const analyzer = new TypeScriptAnalyzer(this.rootPath, this.options);
        return await analyzer.analyze(files);
      },
      {
        batchSize: this.options.batchSize || 50,
        enableParallelProcessing: filesToAnalyze.length > 100,
        workerCount: Math.min(4, Math.ceil(filesToAnalyze.length / 50)),
        continueOnError: this.options.continueOnError || false
      }
    );

    // 后处理：增强分析结果
    const enhancedResult = await this.enhanceAnalysisResult(result);

    console.log(`分析完成: ${enhancedResult.symbols.length}个符号, ${enhancedResult.callRelations.length}个调用关系`);
    
    return enhancedResult;
  }

  /**
   * 按语言类型分类文件
   */
  private categorizeFiles(files: string[]): {
    typescript: string[];
    javascript: string[];
    other: string[];
  } {
    const typescript: string[] = [];
    const javascript: string[] = [];
    const other: string[] = [];

    for (const file of files) {
      if (Utils.isTypeScriptFile(file)) {
        typescript.push(file);
      } else if (Utils.isJavaScriptFile(file)) {
        javascript.push(file);
      } else {
        other.push(file);
      }
    }

    return { typescript, javascript, other };
  }

  /**
   * 增强分析结果
   * 应用Jelly项目的高精度分析思想
   */
  private async enhanceAnalysisResult(result: AnalysisResult): Promise<AnalysisResult> {
    const enhancedResult = { ...result };

    // 1. 增强调用关系分析
    enhancedResult.callRelations = this.enhanceCallRelations(result.callRelations, result.symbols);

    // 2. 检测JavaScript特有的模式
    enhancedResult.symbols = this.detectJavaScriptPatterns(result.symbols);

    // 3. 分析模块依赖关系
    enhancedResult.importRelations = this.enhanceImportRelations(result.importRelations);

    // 4. 检测跨语言调用
    const crossLanguageCalls = this.detectCrossLanguageCalls(result.callRelations, result.symbols);
    enhancedResult.metadata = {
      ...result.metadata,
      crossLanguageCalls: crossLanguageCalls.length,
      languageDistribution: this.calculateLanguageDistribution(result.files),
      complexityMetrics: this.calculateComplexityMetrics(result)
    };

    return enhancedResult;
  }

  /**
   * 增强调用关系分析
   * 借鉴Jelly项目的精确分析方法
   */
  private enhanceCallRelations(callRelations: CallRelation[], symbols: Symbol[]): CallRelation[] {
    const enhanced: CallRelation[] = [];

    for (const relation of callRelations) {
      const enhancedRelation = { ...relation };

      // 增加调用深度信息
      enhancedRelation.metadata = {
        ...relation.metadata,
        callDepth: this.calculateCallDepth(relation, callRelations),
        isRecursive: this.isRecursiveCall(relation, callRelations),
        isCrossFile: this.isCrossFileCall(relation),
        callPattern: this.identifyCallPattern(relation, symbols)
      };

      enhanced.push(enhancedRelation);
    }

    return enhanced;
  }

  /**
   * 检测JavaScript特有的编程模式
   */
  private detectJavaScriptPatterns(symbols: Symbol[]): Symbol[] {
    return symbols.map(symbol => {
      const enhancedSymbol = { ...symbol };

      // 检测JavaScript特有模式
      if (Utils.isJavaScriptFile(symbol.location.filePath)) {
        enhancedSymbol.metadata = {
          ...symbol.metadata,
          jsPatterns: this.identifyJSPatterns(symbol),
          moduleSystem: this.detectModuleSystem(symbol)
        };
      }

      return enhancedSymbol;
    });
  }

  /**
   * 增强导入关系分析
   */
  private enhanceImportRelations(importRelations: ImportRelation[]): ImportRelation[] {
    return importRelations.map(relation => ({
      ...relation,
      metadata: {
        ...relation.metadata,
        isRelative: this.isRelativeImport(relation.imported),
        isNodeModule: this.isNodeModuleImport(relation.imported),
        isCrossLanguage: this.isCrossLanguageImport(relation)
      }
    }));
  }

  /**
   * 检测跨语言调用
   */
  private detectCrossLanguageCalls(callRelations: CallRelation[], symbols: Symbol[]): CallRelation[] {
    return callRelations.filter(relation => {
      const callerFile = relation.caller?.filePath;
      const calleeFile = relation.callee?.filePath;

      if (!callerFile || !calleeFile) return false;

      const callerLang = Utils.getFileLanguage(callerFile);
      const calleeLang = Utils.getFileLanguage(calleeFile);

      return callerLang !== calleeLang && callerLang !== 'unknown' && calleeLang !== 'unknown';
    });
  }

  /**
   * 计算语言分布
   */
  private calculateLanguageDistribution(files: string[]): any {
    const distribution = {
      typescript: 0,
      javascript: 0,
      total: files.length
    };

    for (const file of files) {
      if (Utils.isTypeScriptFile(file)) {
        distribution.typescript++;
      } else if (Utils.isJavaScriptFile(file)) {
        distribution.javascript++;
      }
    }

    return {
      ...distribution,
      typescriptPercentage: Math.round((distribution.typescript / distribution.total) * 100),
      javascriptPercentage: Math.round((distribution.javascript / distribution.total) * 100)
    };
  }

  /**
   * 计算复杂度指标
   */
  private calculateComplexityMetrics(result: AnalysisResult): any {
    return {
      avgCallsPerSymbol: Math.round(result.callRelations.length / Math.max(result.symbols.length, 1) * 100) / 100,
      avgImportsPerFile: Math.round(result.importRelations.length / Math.max(result.files.length, 1) * 100) / 100,
      cyclomaticComplexity: this.calculateCyclomaticComplexity(result.callRelations),
      couplingDegree: this.calculateCouplingDegree(result.importRelations, result.files.length)
    };
  }

  // 辅助方法
  private calculateCallDepth(relation: CallRelation, allRelations: CallRelation[]): number {
    // 简化实现，实际应该递归计算
    return 1;
  }

  private isRecursiveCall(relation: CallRelation, allRelations: CallRelation[]): boolean {
    return relation.caller?.name === relation.callee?.name &&
           relation.caller?.className === relation.callee?.className;
  }

  private isCrossFileCall(relation: CallRelation): boolean {
    return relation.caller?.filePath !== relation.callee?.filePath;
  }

  private identifyCallPattern(relation: CallRelation, symbols: Symbol[]): string {
    // 识别调用模式：直接调用、链式调用、回调等
    if (relation.callType === 'method') return 'method_call';
    if (relation.callType === 'constructor') return 'instantiation';
    if (relation.callType === 'function') return 'function_call';
    return 'unknown';
  }

  private identifyJSPatterns(symbol: Symbol): string[] {
    const patterns: string[] = [];
    
    // 基于符号类型和内容检测模式
    if (symbol.type === 'variable') {
      patterns.push('variable_declaration');
    }
    
    // 可以扩展更多模式检测
    return patterns;
  }

  private detectModuleSystem(symbol: Symbol): 'commonjs' | 'esm' | 'umd' | 'unknown' {
    const filePath = symbol.location.filePath;
    
    if (Utils.isESModuleFile(filePath)) return 'esm';
    if (Utils.isCommonJSFile(filePath)) return 'commonjs';
    
    // 可以通过内容分析进一步判断
    return 'unknown';
  }

  private isRelativeImport(imported: string): boolean {
    return imported.startsWith('./') || imported.startsWith('../');
  }

  private isNodeModuleImport(imported: string): boolean {
    return !this.isRelativeImport(imported) && !path.isAbsolute(imported);
  }

  private isCrossLanguageImport(relation: ImportRelation): boolean {
    const importerLang = Utils.getFileLanguage(relation.importer);
    // 需要解析imported路径来确定目标文件语言
    return false; // 简化实现
  }

  private calculateCyclomaticComplexity(callRelations: CallRelation[]): number {
    // 简化的圈复杂度计算
    return Math.max(1, callRelations.length - callRelations.filter(r => r.callType === 'function').length + 2);
  }

  private calculateCouplingDegree(importRelations: ImportRelation[], fileCount: number): number {
    if (fileCount === 0) return 0;
    return Math.round((importRelations.length / fileCount) * 100) / 100;
  }

  private createEmptyResult(): AnalysisResult {
    return {
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
  }
}