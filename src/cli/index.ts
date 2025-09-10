#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { MultiLanguageAnalyzer } from '../core/multi-language-analyzer';
import { JsonFormatter } from '../formatters/json';
import { MermaidFormatter } from '../formatters/mermaid';
import { HtmlFormatter } from '../formatters/html';
import { AnalysisOptions } from '../types';

/**
 * CLI 主程序
 */
class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * 设置命令行选项
   */
  private setupCommands(): void {
    this.program
      .name('ts-callgraph')
      .description('TypeScript/JavaScript工程分析工具，生成类、属性、方法、函数等的调用和依赖关系图')
      .version('1.0.0');

    this.program
      .argument('[patterns...]', '要分析的文件或目录模式 (支持glob模式)')
      .option('-c, --config <path>', '配置文件路径')
      .option('-o, --output <path>', '输出文件路径')
      .option('-f, --format <type>', '输出格式 (json|mermaid|html)', 'json')
      .option('-j, --json <path>', 'JSON格式输出路径')
      .option('-m, --mermaid <path>', 'Mermaid格式输出路径')
      .option('--html <path>', 'HTML格式输出路径')
      .option('--class-diagram', '生成Mermaid类图而不是流程图')
      .option('--simple-class-diagram', '生成简化的Mermaid类图（确保兼容性）')
      .option('--exclude <patterns>', '排除的文件模式，逗号分隔', 'node_modules/**,**/*.d.ts')
      .option('--include-private', '包含私有成员')
      .option('--include-node-modules', '包含node_modules中的文件')
      .option('--include-js', '包含JavaScript文件 (.js, .jsx, .mjs, .cjs)', true)
      .option('--include-ts', '包含TypeScript文件 (.ts, .tsx)', true)
      .option('--js-only', '仅分析JavaScript文件')
      .option('--ts-only', '仅分析TypeScript文件')
      .option('--max-depth <number>', '最大分析深度', '10')
      .option('--follow-imports', '跟踪导入的文件')
      .option('--verbose', '详细输出')
      .action(this.handleAnalyze.bind(this));

    // 添加子命令
    this.program
      .command('analyze')
      .description('分析TypeScript/JavaScript项目')
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
  private async handleAnalyze(patterns: string[], options: any): Promise<void> {
    try {
      let finalPatterns = patterns;
      let finalOptions = options;
      
      // 如果指定了配置文件，加载配置
      if (options.config) {
        const config = this.loadConfig(options.config);
        finalPatterns = config.patterns || patterns;
        finalOptions = { ...options, ...config.options };
        if (config.output) finalOptions.output = config.output;
        if (config.format) finalOptions.format = config.format;
        if (config.excludePatterns) finalOptions.exclude = config.excludePatterns.join(',');
      }
      
      // 如果没有指定模式且没有配置文件，显示帮助
      if (finalPatterns.length === 0 && !options.config) {
        console.log(chalk.yellow('⚠️  请指定要分析的文件模式或使用配置文件'));
        console.log(chalk.gray('示例：'));
        console.log(chalk.gray('  ts-callgraph "src/**/*.ts" -f html -o report.html'));
        console.log(chalk.gray('  ts-callgraph -c analysis-config.json'));
        return;
      }

      console.log(chalk.blue('🔍 开始分析TypeScript/JavaScript项目...'));
      if (finalPatterns.length > 0) {
        console.log(chalk.gray(`模式: ${finalPatterns.join(', ')}`));
      }

      // 解析选项
      const analysisOptions: AnalysisOptions = {
        includePrivate: finalOptions.includePrivate,
        includeNodeModules: finalOptions.includeNodeModules,
        maxDepth: parseInt(finalOptions.maxDepth) || 10,
        excludePatterns: finalOptions.exclude.split(',').map((p: string) => p.trim()),
        followImports: finalOptions.followImports,
        includeJavaScript: finalOptions.jsOnly ? true : (finalOptions.tsOnly ? false : (finalOptions.includeJs !== false)),
        includeTypeScript: finalOptions.tsOnly ? true : (finalOptions.jsOnly ? false : (finalOptions.includeTs !== false)),
        analyzeCallChains: true,
        detectPatterns: true
      };

      if (finalOptions.verbose) {
        console.log(chalk.gray('分析选项:'), analysisOptions);
      }

      // 创建分析器
      const rootPath = process.cwd();
      const analyzer = new MultiLanguageAnalyzer(rootPath, analysisOptions);
      
      // 显示语言支持信息
      const languageInfo = [];
      if (analysisOptions.includeTypeScript) languageInfo.push('TypeScript');
      if (analysisOptions.includeJavaScript) languageInfo.push('JavaScript');
      console.log(chalk.gray(`支持语言: ${languageInfo.join(', ')}`));

      // 执行分析
      const startTime = Date.now();
      const result = await analyzer.analyze(finalPatterns);
      const duration = Date.now() - startTime;

      console.log(chalk.green('✅ 分析完成!'));
      console.log(chalk.gray(`耗时: ${duration}ms`));
      console.log(chalk.gray(`文件: ${result.files.length}`));
      console.log(chalk.gray(`符号: ${result.symbols.length}`));
      console.log(chalk.gray(`调用关系: ${result.callRelations.length}`));
      console.log(chalk.gray(`导入关系: ${result.importRelations.length}`));

      // 输出结果
      await this.outputResults(result, finalOptions);

    } catch (error) {
      console.error(chalk.red('❌ 分析失败:'), error);
      process.exit(1);
    }
  }

  /**
   * 处理可视化命令
   */
  private async handleVisualize(input: string, options: any): Promise<void> {
    try {
      console.log(chalk.blue('🎨 生成可视化报告...'));

      // 读取分析结果
      const inputPath = path.resolve(input);
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }

      const analysisResult = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

      // 生成HTML报告
      const formatter = new HtmlFormatter();
      const html = formatter.format(analysisResult);

      // 写入文件
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, html);

      console.log(chalk.green('✅ 可视化报告生成完成!'));
      console.log(chalk.gray(`输出: ${outputPath}`));

    } catch (error) {
      console.error(chalk.red('❌ 可视化生成失败:'), error);
      process.exit(1);
    }
  }

  /**
   * 输出分析结果到各种格式
   */
  private async outputResults(result: any, options: any): Promise<void> {
    // JSON 输出
    if (options.json || options.format === 'json' || options.output) {
      const jsonPath = options.json || 
                      (options.format === 'json' ? options.output : null) ||
                      'callgraph.json';
      
      const formatter = new JsonFormatter();
      const jsonContent = formatter.format(result);
      
      fs.writeFileSync(path.resolve(jsonPath), jsonContent);
      console.log(chalk.green(`📄 JSON输出: ${jsonPath}`));
    }

    // Mermaid 输出
    if (options.mermaid || options.format === 'mermaid') {
      const mermaidPath = options.mermaid || 
                         (options.format === 'mermaid' ? options.output : null) ||
                         'callgraph.mmd';
      
      const formatter = new MermaidFormatter();
      let mermaidContent: string;
      
      if (options.simpleClassDiagram) {
        mermaidContent = formatter.formatAsSimpleClassDiagram(result);
        console.log(chalk.green(`📊 Mermaid简化类图输出: ${mermaidPath}`));
      } else if (options.classDiagram) {
        mermaidContent = formatter.formatAsClassDiagram(result);
        console.log(chalk.green(`📊 Mermaid类图输出: ${mermaidPath}`));
      } else {
        mermaidContent = formatter.format(result);
        console.log(chalk.green(`📊 Mermaid流程图输出: ${mermaidPath}`));
      }
      
      fs.writeFileSync(path.resolve(mermaidPath), mermaidContent);
    }

    // HTML 输出
    if (options.html || options.format === 'html') {
      const htmlPath = options.html || 
                      (options.format === 'html' ? options.output : null) ||
                      'callgraph.html';
      
      const formatter = new HtmlFormatter();
      const htmlContent = formatter.format(result);
      
      fs.writeFileSync(path.resolve(htmlPath), htmlContent);
      console.log(chalk.green(`🌐 HTML输出: ${htmlPath}`));
    }
  }

  /**
   * 运行CLI
   */
  run(argv: string[] = process.argv): void {
    this.program.parse(argv);
  }

  /**
   * 加载配置文件
   */
  private loadConfig(configPath: string): any {
    try {
      const absolutePath = path.resolve(configPath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`配置文件不存在: ${absolutePath}`);
      }
      
      const configContent = fs.readFileSync(absolutePath, 'utf-8');
      const config = JSON.parse(configContent);
      
      console.log(chalk.green(`✅ 加载配置文件: ${configPath}`));
      return config;
    } catch (error) {
      console.error(chalk.red(`❌ 加载配置文件失败: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new CLI();
  cli.run();
}

export { CLI };