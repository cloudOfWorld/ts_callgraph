#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { TypeScriptAnalyzer } from '../core/analyzer';
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
      .description('TypeScript工程分析工具，生成类、属性、方法、函数等的调用和依赖关系图')
      .version('1.0.0');

    this.program
      .argument('<patterns...>', '要分析的文件或目录模式 (支持glob模式)')
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
  private async handleAnalyze(patterns: string[], options: any): Promise<void> {
    try {
      console.log(chalk.blue('🔍 开始分析TypeScript项目...'));
      console.log(chalk.gray(`模式: ${patterns.join(', ')}`));

      // 解析选项
      const analysisOptions: AnalysisOptions = {
        includePrivate: options.includePrivate,
        includeNodeModules: options.includeNodeModules,
        maxDepth: parseInt(options.maxDepth) || 10,
        excludePatterns: options.exclude.split(',').map((p: string) => p.trim()),
        followImports: options.followImports
      };

      if (options.verbose) {
        console.log(chalk.gray('分析选项:'), analysisOptions);
      }

      // 创建分析器
      const rootPath = process.cwd();
      const analyzer = new TypeScriptAnalyzer(rootPath, analysisOptions);

      // 执行分析
      const startTime = Date.now();
      const result = await analyzer.analyze(patterns);
      const duration = Date.now() - startTime;

      console.log(chalk.green('✅ 分析完成!'));
      console.log(chalk.gray(`耗时: ${duration}ms`));
      console.log(chalk.gray(`文件: ${result.files.length}`));
      console.log(chalk.gray(`符号: ${result.symbols.length}`));
      console.log(chalk.gray(`调用关系: ${result.callRelations.length}`));
      console.log(chalk.gray(`导入关系: ${result.importRelations.length}`));

      // 输出结果
      await this.outputResults(result, options);

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
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new CLI();
  cli.run();
}

export { CLI };