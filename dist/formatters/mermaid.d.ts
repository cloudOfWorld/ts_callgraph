import { AnalysisResult } from '../types';
import { BaseFormatter } from './base';
/**
 * Mermaid 格式化器
 */
export declare class MermaidFormatter extends BaseFormatter {
    /**
     * 格式化为Mermaid图表
     */
    format(result: AnalysisResult): string;
    /**
     * 生成类图格式
     */
    formatAsClassDiagram(result: AnalysisResult): string;
    /**
     * 生成节点定义
     */
    private generateNodes;
    /**
     * 格式化节点标签
     */
    private formatNodeLabel;
    /**
     * 获取节点形状
     */
    private getNodeShape;
    /**
     * 生成调用关系边
     */
    private generateCallEdges;
    /**
     * 获取调用边标签
     */
    private getCallEdgeLabel;
    /**
     * 生成导入关系边
     */
    private generateImportEdges;
    /**
     * 获取导入边标签
     */
    private getImportEdgeLabel;
    /**
     * 按文件分组符号
     */
    private groupSymbolsByFile;
    /**
     * 生成类定义
     */
    private generateClassDefinition;
    /**
     * 生成接口定义
     */
    private generateInterfaceDefinition;
    /**
     * 生成类关系
     */
    private generateClassRelationships;
    /**
     * 获取可见性符号
     */
    private getVisibilitySymbol;
    /**
     * 生成样式定义
     */
    private generateStyles;
}
//# sourceMappingURL=mermaid.d.ts.map