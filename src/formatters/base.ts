import { AnalysisResult } from '../types';

/**
 * 格式化器基础接口
 */
export interface IFormatter {
  /**
   * 格式化分析结果
   */
  format(result: AnalysisResult): string;
}

/**
 * 格式化器基类
 */
export abstract class BaseFormatter implements IFormatter {
  abstract format(result: AnalysisResult): string;

  /**
   * 获取格式化后的元数据
   */
  protected getMetadataString(result: AnalysisResult): string {
    const metadata = result.metadata;
    return [
      `Generated on: ${metadata.analysisDate.toISOString()}`,
      `Total files: ${metadata.totalFiles}`,
      `Total symbols: ${metadata.totalSymbols}`,
      `Total call relations: ${metadata.totalCallRelations}`
    ].join('\n');
  }

  /**
   * 转义特殊字符
   */
  protected escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * 清理文件名用于ID
   */
  protected cleanId(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}