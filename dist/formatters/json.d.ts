import { AnalysisResult } from '../types';
import { BaseFormatter } from './base';
/**
 * JSON 格式化器
 */
export declare class JsonFormatter extends BaseFormatter {
    /**
     * 格式化为JSON
     */
    format(result: AnalysisResult): string;
    /**
     * 格式化为压缩的JSON
     */
    formatCompact(result: AnalysisResult): string;
    /**
     * 格式化为带统计信息的JSON
     */
    formatWithStats(result: AnalysisResult): string;
    /**
     * 生成统计信息
     */
    private generateStats;
}
//# sourceMappingURL=json.d.ts.map