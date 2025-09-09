import { AnalysisResult } from '../types';
import { BaseFormatter } from './base';

/**
 * JSON 格式化器
 */
export class JsonFormatter extends BaseFormatter {
  /**
   * 格式化为JSON
   */
  format(result: AnalysisResult): string {
    // 创建一个可序列化的结果对象
    const serializable = {
      ...result,
      metadata: {
        ...result.metadata,
        analysisDate: result.metadata.analysisDate.toISOString()
      }
    };

    return JSON.stringify(serializable, null, 2);
  }

  /**
   * 格式化为压缩的JSON
   */
  formatCompact(result: AnalysisResult): string {
    const serializable = {
      ...result,
      metadata: {
        ...result.metadata,
        analysisDate: result.metadata.analysisDate.toISOString()
      }
    };

    return JSON.stringify(serializable);
  }

  /**
   * 格式化为带统计信息的JSON
   */
  formatWithStats(result: AnalysisResult): string {
    const stats = this.generateStats(result);
    
    const output = {
      analysis: result,
      statistics: stats,
      generatedAt: new Date().toISOString()
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * 生成统计信息
   */
  private generateStats(result: AnalysisResult) {
    const symbolsByType: { [key: string]: number } = {};
    const callsByType: { [key: string]: number } = {};
    const importsByType: { [key: string]: number } = {};

    // 统计符号类型
    result.symbols.forEach(symbol => {
      symbolsByType[symbol.type] = (symbolsByType[symbol.type] || 0) + 1;
    });

    // 统计调用类型
    result.callRelations.forEach(call => {
      callsByType[call.callType] = (callsByType[call.callType] || 0) + 1;
    });

    // 统计导入类型
    result.importRelations.forEach(imp => {
      importsByType[imp.importType] = (importsByType[imp.importType] || 0) + 1;
    });

    return {
      symbolsByType,
      callsByType,
      importsByType,
      totalFiles: result.files.length,
      totalSymbols: result.symbols.length,
      totalCallRelations: result.callRelations.length,
      totalImportRelations: result.importRelations.length,
      totalExportRelations: result.exportRelations.length
    };
  }
}