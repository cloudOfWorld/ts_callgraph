import { AnalysisResult, AnalysisOptions } from '../types';
/**
 * TypeScript AST 分析器核心类
 */
export declare class TypeScriptAnalyzer {
    private rootPath;
    private options;
    private program;
    private typeChecker;
    private symbols;
    private callRelations;
    private importRelations;
    private exportRelations;
    private processedFiles;
    constructor(rootPath: string, options?: AnalysisOptions);
    /**
     * 初始化TypeScript程序和类型检查器
     */
    private initialize;
    /**
     * 分析指定的文件或目录
     */
    analyze(patterns: string[]): Promise<AnalysisResult>;
    /**
     * 重置分析状态
     */
    private reset;
    /**
     * 分析单个文件
     */
    private analyzeFile;
    /**
     * 递归访问AST节点
     */
    private visitNode;
    /**
     * 分析类声明
     */
    private analyzeClass;
    /**
     * 分析接口声明
     */
    private analyzeInterface;
    /**
     * 分析函数声明
     */
    private analyzeFunction;
    /**
     * 分析变量声明
     */
    private analyzeVariable;
    /**
     * 分析属性声明
     */
    private analyzeProperty;
    /**
     * 分析方法声明
     */
    private analyzeMethod;
    /**
     * 分析构造函数
     */
    private analyzeConstructor;
    /**
     * 分析属性签名（接口中的属性）
     */
    private analyzePropertySignature;
    /**
     * 分析方法签名（接口中的方法）
     */
    private analyzeMethodSignature;
    /**
     * 分析导入声明
     */
    private analyzeImport;
    /**
     * 分析导出声明
     */
    private analyzeExport;
    /**
     * 分析函数调用
     */
    private analyzeCall;
    /**
     * 查找包含给定节点的函数
     */
    private findContainingFunction;
}
//# sourceMappingURL=analyzer.d.ts.map