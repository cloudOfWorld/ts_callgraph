#!/usr/bin/env node
/**
 * CLI 主程序
 */
declare class CLI {
    private program;
    constructor();
    /**
     * 设置命令行选项
     */
    private setupCommands;
    /**
     * 处理分析命令
     */
    private handleAnalyze;
    /**
     * 处理可视化命令
     */
    private handleVisualize;
    /**
     * 输出分析结果到各种格式
     */
    private outputResults;
    /**
     * 运行CLI
     */
    run(argv?: string[]): void;
}
export { CLI };
//# sourceMappingURL=index.d.ts.map