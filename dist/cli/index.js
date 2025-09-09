#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const analyzer_1 = require("../core/analyzer");
const json_1 = require("../formatters/json");
const mermaid_1 = require("../formatters/mermaid");
const html_1 = require("../formatters/html");
/**
 * CLI 主程序
 */
class CLI {
    constructor() {
        this.program = new commander_1.Command();
        this.setupCommands();
    }
    /**
     * 设置命令行选项
     */
    setupCommands() {
        this.program
            .name('ts-callgraph')
            .description('TypeScript工程分析工具，生成类、属性、方法、函数等的调用和依赖关系图')
            .version('1.0.0');
        this.program
            .argument('<patterns...>', '要分析的文件或目录模式 (支持glob模式)')
            .option('-o, --output <path>', '输出文件路径')
            .option('-f, --format <type>', '输出格式 (json|mermaid|html)', 'json')
            .option('-j, --json <path>', 'JSON格式输出路径')
            .option('-m, --mermaid <path>', 'Mermaid格式输出路径')
            .option('--html <path>', 'HTML格式输出路径')
            .option('--exclude <patterns>', '排除的文件模式，逗号分隔', 'node_modules/**,**/*.d.ts')
            .option('--include-private', '包含私有成员')
            .option('--include-node-modules', '包含node_modules中的文件')
            .option('--max-depth <number>', '最大分析深度', '10')
            .option('--follow-imports', '跟踪导入的文件')
            .option('--verbose', '详细输出')
            .action(this.handleAnalyze.bind(this));
        // 添加子命令
        this.program
            .command('analyze')
            .description('分析TypeScript项目')
            .argument('<patterns...>')
            .option('-o, --output <path>', '输出文件路径')
            .option('-f, --format <type>', '输出格式', 'json')
            .action(this.handleAnalyze.bind(this));
        this.program
            .command('visualize')
            .description('生成可视化HTML报告')
            .argument('<input>', '输入的JSON分析结果文件')
            .option('-o, --output <path>', 'HTML输出路径', 'callgraph.html')
            .action(this.handleVisualize.bind(this));
    }
    /**
     * 处理分析命令
     */
    async handleAnalyze(patterns, options) {
        try {
            console.log(chalk_1.default.blue('🔍 开始分析TypeScript项目...'));
            console.log(chalk_1.default.gray(`模式: ${patterns.join(', ')}`));
            // 解析选项
            const analysisOptions = {
                includePrivate: options.includePrivate,
                includeNodeModules: options.includeNodeModules,
                maxDepth: parseInt(options.maxDepth) || 10,
                excludePatterns: options.exclude.split(',').map((p) => p.trim()),
                followImports: options.followImports
            };
            if (options.verbose) {
                console.log(chalk_1.default.gray('分析选项:'), analysisOptions);
            }
            // 创建分析器
            const rootPath = process.cwd();
            const analyzer = new analyzer_1.TypeScriptAnalyzer(rootPath, analysisOptions);
            // 执行分析
            const startTime = Date.now();
            const result = await analyzer.analyze(patterns);
            const duration = Date.now() - startTime;
            console.log(chalk_1.default.green('✅ 分析完成!'));
            console.log(chalk_1.default.gray(`耗时: ${duration}ms`));
            console.log(chalk_1.default.gray(`文件: ${result.files.length}`));
            console.log(chalk_1.default.gray(`符号: ${result.symbols.length}`));
            console.log(chalk_1.default.gray(`调用关系: ${result.callRelations.length}`));
            console.log(chalk_1.default.gray(`导入关系: ${result.importRelations.length}`));
            // 输出结果
            await this.outputResults(result, options);
        }
        catch (error) {
            console.error(chalk_1.default.red('❌ 分析失败:'), error);
            process.exit(1);
        }
    }
    /**
     * 处理可视化命令
     */
    async handleVisualize(input, options) {
        try {
            console.log(chalk_1.default.blue('🎨 生成可视化报告...'));
            // 读取分析结果
            const inputPath = path.resolve(input);
            if (!fs.existsSync(inputPath)) {
                throw new Error(`输入文件不存在: ${inputPath}`);
            }
            const analysisResult = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
            // 生成HTML报告
            const formatter = new html_1.HtmlFormatter();
            const html = formatter.format(analysisResult);
            // 写入文件
            const outputPath = path.resolve(options.output);
            fs.writeFileSync(outputPath, html);
            console.log(chalk_1.default.green('✅ 可视化报告生成完成!'));
            console.log(chalk_1.default.gray(`输出: ${outputPath}`));
        }
        catch (error) {
            console.error(chalk_1.default.red('❌ 可视化生成失败:'), error);
            process.exit(1);
        }
    }
    /**
     * 输出分析结果到各种格式
     */
    async outputResults(result, options) {
        // JSON 输出
        if (options.json || options.format === 'json' || options.output) {
            const jsonPath = options.json ||
                (options.format === 'json' ? options.output : null) ||
                'callgraph.json';
            const formatter = new json_1.JsonFormatter();
            const jsonContent = formatter.format(result);
            fs.writeFileSync(path.resolve(jsonPath), jsonContent);
            console.log(chalk_1.default.green(`📄 JSON输出: ${jsonPath}`));
        }
        // Mermaid 输出
        if (options.mermaid || options.format === 'mermaid') {
            const mermaidPath = options.mermaid ||
                (options.format === 'mermaid' ? options.output : null) ||
                'callgraph.mmd';
            const formatter = new mermaid_1.MermaidFormatter();
            const mermaidContent = formatter.format(result);
            fs.writeFileSync(path.resolve(mermaidPath), mermaidContent);
            console.log(chalk_1.default.green(`📊 Mermaid输出: ${mermaidPath}`));
        }
        // HTML 输出
        if (options.html || options.format === 'html') {
            const htmlPath = options.html ||
                (options.format === 'html' ? options.output : null) ||
                'callgraph.html';
            const formatter = new html_1.HtmlFormatter();
            const htmlContent = formatter.format(result);
            fs.writeFileSync(path.resolve(htmlPath), htmlContent);
            console.log(chalk_1.default.green(`🌐 HTML输出: ${htmlPath}`));
        }
    }
    /**
     * 运行CLI
     */
    run(argv = process.argv) {
        this.program.parse(argv);
    }
}
exports.CLI = CLI;
// 如果直接运行此文件
if (require.main === module) {
    const cli = new CLI();
    cli.run();
}
//# sourceMappingURL=index.js.map