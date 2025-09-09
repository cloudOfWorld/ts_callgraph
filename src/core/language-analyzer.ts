/**
 * 统一的语言分析器接口
 * 结合了三个优秀项目的设计思想：
 * - TS-Call-Graph: 类级别的详细分析
 * - TypeScript-Call-Graph: 函数调用关系分析  
 * - Jelly: 学术级静态分析精度
 */

import * as ts from 'typescript';
import { 
  AnalysisResult, 
  AnalysisOptions, 
  Symbol, 
  CallRelation,
  ImportRelation,
  ExportRelation 
} from '../types';

/**
 * 语言分析器的基础接口
 */
export interface ILanguageAnalyzer {
  /**
   * 分析文件或项目
   */
  analyze(filePaths: string[]): Promise<AnalysisResult>;

  /**
   * 获取支持的文件扩展名
   */
  getSupportedExtensions(): string[];

  /**
   * 检查是否支持指定文件
   */
  canHandle(filePath: string): boolean;

  /**
   * 重置分析状态
   */
  reset(): void;
}

/**
 * 抽象的语言分析器基类
 */
export abstract class BaseLanguageAnalyzer implements ILanguageAnalyzer {
  protected symbols: Symbol[] = [];
  protected callRelations: CallRelation[] = [];
  protected importRelations: ImportRelation[] = [];
  protected exportRelations: ExportRelation[] = [];
  protected processedFiles: Set<string> = new Set();

  constructor(
    protected rootPath: string,
    protected options: AnalysisOptions = {}
  ) {}

  abstract analyze(filePaths: string[]): Promise<AnalysisResult>;
  abstract getSupportedExtensions(): string[];
  abstract canHandle(filePath: string): boolean;

  /**
   * 重置分析状态
   */
  reset(): void {
    this.symbols = [];
    this.callRelations = [];
    this.importRelations = [];
    this.exportRelations = [];
    this.processedFiles.clear();
  }

  /**
   * 生成分析结果
   */
  protected generateResult(): AnalysisResult {
    return {
      symbols: this.symbols,
      callRelations: this.callRelations,
      importRelations: this.importRelations,
      exportRelations: this.exportRelations,
      files: Array.from(this.processedFiles),
      metadata: {
        analysisDate: new Date(),
        totalFiles: this.processedFiles.size,
        totalSymbols: this.symbols.length,
        totalCallRelations: this.callRelations.length,
      }
    };
  }
}

/**
 * TypeScript/JavaScript 统一分析器
 * 支持 .ts, .tsx, .js, .jsx 文件
 */
export class TypeScriptJavaScriptAnalyzer extends BaseLanguageAnalyzer {
  private program!: ts.Program;
  private typeChecker!: ts.TypeChecker;

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  }

  canHandle(filePath: string): boolean {
    const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
    return this.getSupportedExtensions().includes(ext);
  }

  async analyze(filePaths: string[]): Promise<AnalysisResult> {
    this.reset();
    
    // 初始化TypeScript编译器
    this.initializeCompiler(filePaths);

    // 分析每个文件
    for (const filePath of filePaths) {
      if (this.canHandle(filePath)) {
        await this.analyzeFile(filePath);
      }
    }

    return this.generateResult();
  }

  /**
   * 初始化TypeScript编译器
   * 配置支持JavaScript和TypeScript
   */
  private initializeCompiler(filePaths: string[]): void {
    // 创建TypeScript编译选项，同时支持JS和TS
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,           // 启用JavaScript支持
      checkJs: false,          // 不检查JavaScript语法错误，只做AST分析
      declaration: false,      // JavaScript文件不生成声明文件
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      strict: false,           // 宽松模式，兼容JavaScript
      noEmit: true,           // 只做分析，不生成文件
      jsx: ts.JsxEmit.Preserve, // 支持JSX
    };

    // 查找项目配置文件
    const configPath = ts.findConfigFile(this.rootPath, ts.sys.fileExists, 'tsconfig.json');
    if (configPath) {
      try {
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          this.rootPath
        );
        // 合并配置，保留JavaScript支持
        Object.assign(compilerOptions, parsedConfig.options, {
          allowJs: true,
          checkJs: false,
          noEmit: true
        });
      } catch (error) {
        console.warn('Error reading tsconfig.json:', error);
      }
    }

    // 创建程序
    this.program = ts.createProgram(filePaths, compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 分析单个文件
   */
  private async analyzeFile(filePath: string): Promise<void> {
    if (this.processedFiles.has(filePath)) {
      return;
    }

    this.processedFiles.add(filePath);

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      console.warn(`Could not load source file: ${filePath}`);
      return;
    }

    // 检测文件类型
    const isJavaScript = this.isJavaScriptFile(filePath);
    const isTypeScript = this.isTypeScriptFile(filePath);

    // 遍历AST节点
    this.visitNode(sourceFile, sourceFile, { isJavaScript, isTypeScript });
  }

  /**
   * 检查是否为JavaScript文件
   */
  private isJavaScriptFile(filePath: string): boolean {
    return /\.(js|jsx|mjs|cjs)$/i.test(filePath);
  }

  /**
   * 检查是否为TypeScript文件
   */
  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx)$/i.test(filePath);
  }

  /**
   * 递归访问AST节点
   * 适配JavaScript和TypeScript的差异
   */
  private visitNode(
    node: ts.Node, 
    sourceFile: ts.SourceFile, 
    context: { isJavaScript: boolean; isTypeScript: boolean }
  ): void {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        this.analyzeClass(node as ts.ClassDeclaration, sourceFile, context);
        break;
      case ts.SyntaxKind.InterfaceDeclaration:
        // 接口只在TypeScript中存在
        if (context.isTypeScript) {
          this.analyzeInterface(node as ts.InterfaceDeclaration, sourceFile);
        }
        break;
      case ts.SyntaxKind.FunctionDeclaration:
        this.analyzeFunction(node as ts.FunctionDeclaration, sourceFile, context);
        break;
      case ts.SyntaxKind.VariableDeclaration:
        this.analyzeVariable(node as ts.VariableDeclaration, sourceFile, context);
        break;
      case ts.SyntaxKind.ImportDeclaration:
        this.analyzeImport(node as ts.ImportDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ExportAssignment:
        this.analyzeExport(node, sourceFile);
        break;
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression:
        this.analyzeCall(node as ts.CallExpression | ts.NewExpression, sourceFile, context);
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        // 分析属性访问，但跳过方法调用中的属性访问（因为已经在analyzeCall中处理了）
        if (!ts.isCallExpression(node.parent)) {
          this.analyzePropertyAccess(node as ts.PropertyAccessExpression, sourceFile, context);
        }
        break;
      // JavaScript特有的模式识别
      case ts.SyntaxKind.ObjectLiteralExpression:
        if (context.isJavaScript) {
          this.analyzeObjectLiteral(node as ts.ObjectLiteralExpression, sourceFile);
        }
        break;
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
        this.analyzeFunctionExpression(node as ts.FunctionExpression | ts.ArrowFunction, sourceFile, context);
        break;
    }

    // 递归访问子节点
    ts.forEachChild(node, child => this.visitNode(child, sourceFile, context));
  }

  // 以下是具体的分析方法，需要适配JavaScript特性...
  // [这里会继续实现各种分析方法]

  private analyzeClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, context: any): void {
    // 实现类分析逻辑，适配JS和TS差异
  }

  private analyzeInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): void {
    // 接口分析（仅TypeScript）
  }

  private analyzeFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile, context: any): void {
    // 函数分析逻辑
  }

  private analyzeVariable(node: ts.VariableDeclaration, sourceFile: ts.SourceFile, context: any): void {
    // 变量分析逻辑
  }

  private analyzeImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): void {
    // 导入分析逻辑
  }

  private analyzeExport(node: ts.Node, sourceFile: ts.SourceFile): void {
    // 导出分析逻辑
  }

  private analyzeCall(node: ts.CallExpression | ts.NewExpression, sourceFile: ts.SourceFile, context: any): void {
    // 调用分析逻辑
  }

  private analyzePropertyAccess(node: ts.PropertyAccessExpression, sourceFile: ts.SourceFile, context: any): void {
    // 属性访问分析逻辑
  }

  private analyzeObjectLiteral(node: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): void {
    // JavaScript对象字面量分析
  }

  private analyzeFunctionExpression(node: ts.FunctionExpression | ts.ArrowFunction, sourceFile: ts.SourceFile, context: any): void {
    // 函数表达式和箭头函数分析
  }
}