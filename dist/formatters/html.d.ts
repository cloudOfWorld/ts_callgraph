import { AnalysisResult } from '../types';
import { BaseFormatter } from './base';
/**
 * HTML 格式化器 - 生成交互式可视化界面
 */
export declare class HtmlFormatter extends BaseFormatter {
    /**
     * 格式化为HTML报告
     */
    format(result: AnalysisResult): string;
    /**
     * 生成CSS样式
     */
    private getStyles;
    /**
     * 生成概览标签页
     */
    private generateOverviewTab;
    /**
     * 生成符号标签页
     */
    private generateSymbolsTab;
    /**
     * 生成调用关系标签页
     */
    private generateCallsTab;
    /**
     * 生成导入关系标签页
     */
    private generateImportsTab;
    /**
     * 生成调用图标签页
     */
    private generateGraphTab;
    /**
     * 生成类图标签页
     */
    private generateClassDiagramTab;
    /**
     * 生成Mermaid类图
     */
    private generateMermaidClassDiagram;
    /**
     * 获取Mermaid可见性符号
     */
    private getMermaidVisibility;
    /**
     * 生成JavaScript代码
     */
    private getJavaScript;
    /**
     * 生成统计信息
     */
    private generateStatistics;
    /**
     * 获取可见性徽章
     */
    private getVisibilityBadge;
    /**
     * 转义HTML
     */
    private escapeHtml;
}
//# sourceMappingURL=html.d.ts.map