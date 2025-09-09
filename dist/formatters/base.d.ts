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
export declare abstract class BaseFormatter implements IFormatter {
    abstract format(result: AnalysisResult): string;
    /**
     * 获取格式化后的元数据
     */
    protected getMetadataString(result: AnalysisResult): string;
    /**
     * 转义特殊字符
     */
    protected escapeString(str: string): string;
    /**
     * 清理文件名用于ID
     */
    protected cleanId(str: string): string;
}
//# sourceMappingURL=base.d.ts.map