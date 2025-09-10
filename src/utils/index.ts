import * as ts from 'typescript';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { Position, Location } from '../types';

// 导入language-detect库
let LanguageDetect: any;

try {
  LanguageDetect = require('language-detect');
} catch (error) {
  console.warn('Warning: language-detect library not available, falling back to pattern matching');
  LanguageDetect = null;
}

/**
 * 工具函数集合
 */
export class Utils {
  /**
   * 获取TypeScript源文件中节点的位置信息
   */
  static getLocation(node: ts.Node, sourceFile: ts.SourceFile): Location {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      filePath: sourceFile.fileName,
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 }
    };
  }

  /**
   * 生成唯一ID
   */
  static generateId(name: string, location: Location): string {
    return `${name}_${path.basename(location.filePath)}_${location.start.line}_${location.start.column}`;
  }

  /**
   * 获取节点的可见性修饰符
   */
  static getVisibility(node: ts.Node): 'public' | 'private' | 'protected' | undefined {
    const modifierFlags = ts.getCombinedModifierFlags(node as ts.Declaration);
    if (modifierFlags & ts.ModifierFlags.Private) {
      return 'private';
    }
    if (modifierFlags & ts.ModifierFlags.Protected) {
      return 'protected';
    }
    if (modifierFlags & ts.ModifierFlags.Public) {
      return 'public';
    }
    return undefined;
  }

  /**
   * 检查节点是否被导出
   */
  static isExported(node: ts.Node): boolean {
    return !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export);
  }

  /**
   * 检查节点是否为静态成员
   */
  static isStatic(node: ts.Node): boolean {
    return !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Static);
  }

  /**
   * 检查节点是否为抽象成员
   */
  static isAbstract(node: ts.Node): boolean {
    return !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Abstract);
  }

  /**
   * 检查节点是否为只读属性
   */
  static isReadonly(node: ts.Node): boolean {
    return !!(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Readonly);
  }

  /**
   * 获取类型信息的字符串表示
   */
  static getTypeString(typeChecker: ts.TypeChecker, node: ts.Node): string | undefined {
    try {
      const type = typeChecker.getTypeAtLocation(node);
      return typeChecker.typeToString(type);
    } catch {
      return undefined;
    }
  }

  /**
   * 获取JSDoc注释
   */
  static getDocumentation(node: ts.Node): string | undefined {
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags.length > 0) {
      return jsDocTags
        .map(tag => tag.comment || '')
        .filter(comment => comment)
        .join('\n');
    }
    return undefined;
  }

  /**
   * 匹配文件模式
   */
  static async findFiles(patterns: string[], excludePatterns: string[] = []): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, { 
          ignore: excludePatterns,
          nodir: true 
        });
        allFiles.push(...files);
      } catch (error) {
        console.warn(`Warning: Failed to process pattern ${pattern}:`, error);
      }
    }

    // 去重并返回绝对路径
    return [...new Set(allFiles)].map(file => path.resolve(file));
  }

  /**
   * 规范化文件路径
   */
  static normalizePath(filePath: string): string {
    return path.resolve(filePath).replace(/\\/g, '/');
  }

  /**
   * 检查文件是否为TypeScript文件
   * @deprecated 使用 detectFileLanguage 更准确
   */
  static isTypeScriptFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.d.ts'].includes(ext);
  }

  /**
   * 检查文件是否为JavaScript文件
   * @deprecated 使用 detectFileLanguage 更准确
   */
  static isJavaScriptFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx', '.mjs', '.cjs'].includes(ext);
  }

  /**
   * 智能语言检测：结合文件扩展名和文件内容分析
   * 优先级：文件扩展名 > 文件内容分析 > Shebang
   */
  static detectFileLanguage(filePath: string): {
    language: 'typescript' | 'javascript' | 'unknown';
    confidence: number;
    method: 'extension' | 'content' | 'shebang' | 'fallback';
    details?: string;
  } {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    // 1. 优先基于文件扩展名判断（最可靠）
    if (['.ts', '.tsx', '.d.ts'].includes(ext)) {
      return {
        language: 'typescript',
        confidence: 0.95,
        method: 'extension',
        details: `Extension: ${ext}`
      };
    }

    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      return {
        language: 'javascript',
        confidence: 0.95,
        method: 'extension',
        details: `Extension: ${ext}`
      };
    }

    // 2. 特殊文件名判断
    const specialFiles: Record<string, 'typescript' | 'javascript'> = {
      'tsconfig.json': 'typescript',
      'package.json': 'javascript',
      'webpack.config.js': 'javascript',
      'rollup.config.js': 'javascript'
    };

    if (basename in specialFiles) {
      return {
        language: specialFiles[basename],
        confidence: 0.9,
        method: 'extension',
        details: `Special file: ${basename}`
      };
    }

    // 3. 文件内容分析（在没有扩展名的情况下）
    try {
      if (fs.existsSync(filePath)) {
        return this.detectLanguageFromContent(filePath);
      }
    } catch (error) {
      console.warn(`Failed to read file for language detection: ${filePath}`, error);
    }

    // 4. 默认返回未知
    return {
      language: 'unknown',
      confidence: 0,
      method: 'fallback',
      details: 'No extension, content analysis failed'
    };
  }

  /**
   * 基于文件内容进行语言检测
   */
  private static detectLanguageFromContent(filePath: string): {
    language: 'typescript' | 'javascript' | 'unknown';
    confidence: number;
    method: 'content' | 'shebang';
    details?: string;
  } {
    const content = fs.readFileSync(filePath, 'utf8');
    const firstLines = content.split('\n').slice(0, 10).join('\n');

    // 1. 检查 Shebang
    if (content.startsWith('#!/')) {
      const shebang = content.split('\n')[0];
      if (shebang.includes('node') || shebang.includes('npm')) {
        return {
          language: 'javascript',
          confidence: 0.8,
          method: 'shebang',
          details: `Shebang: ${shebang}`
        };
      }
    }

    // 2. TypeScript特有语法检测
    const tsPatterns = [
      /\binterface\s+\w+/,        // interface 关键字
      /\btype\s+\w+\s*=/,         // type 别名
      /\benum\s+\w+/,            // enum 关键字
      /\w+\s*:\s*\w+/,           // 类型注解
      /\bnamespace\s+\w+/,       // namespace
      /\bas\s+\w+/,              // 类型断言
      /<\w+>/,                  // 泛型
      /\bpublic\s|\bprivate\s|\bprotected\s/, // 访问修饰符
      /\breadonly\s/,           // readonly
      /\bimplements\s/          // implements
    ];

    let tsScore = 0;
    for (const pattern of tsPatterns) {
      if (pattern.test(content)) {
        tsScore += 1;
      }
    }

    // 3. JavaScript特有模式检测
    const jsPatterns = [
      /module\.exports\s*=/,     // CommonJS exports
      /exports\.[\w\$]+\s*=/,    // CommonJS exports
      /require\s*\(/,           // CommonJS require
      /\$\(/,                   // jQuery
      /\.prototype\./,          // 原型链
      /var\s+\w+\s*=/,          // var 声明
      /function\s*\(/           // 函数声明
    ];

    let jsScore = 0;
    for (const pattern of jsPatterns) {
      if (pattern.test(content)) {
        jsScore += 1;
      }
    }

    // 4. 使用language-detect进行编程语言检测
    let languageDetectResult: string | null = null;
    if (LanguageDetect && fs.existsSync(filePath)) {
      try {
        const detector = new LanguageDetect();
        const result = detector.sync(filePath);
        if (result && typeof result === 'string') {
          languageDetectResult = result.toLowerCase();
        }
      } catch (error) {
        // language-detect 失败，忽略该结果
        console.warn(`Language detection failed for ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // 5. 综合判断
    const totalScore = tsScore + jsScore;
    
    // 先检查language-detect的结果
    if (languageDetectResult) {
      if (languageDetectResult.includes('javascript') || languageDetectResult === 'js') {
        return {
          language: 'javascript',
          confidence: 0.8,
          method: 'content',
          details: `Language-detect: ${languageDetectResult}, patterns: JS=${jsScore}, TS=${tsScore}`
        };
      } else if (languageDetectResult.includes('typescript') || languageDetectResult === 'ts') {
        return {
          language: 'typescript',
          confidence: 0.8,
          method: 'content',
          details: `Language-detect: ${languageDetectResult}, patterns: JS=${jsScore}, TS=${tsScore}`
        };
      }
    }
    
    if (totalScore === 0) {
      return {
        language: 'unknown',
        confidence: 0,
        method: 'content',
        details: `No recognizable patterns found, language-detect: ${languageDetectResult || 'none'}`
      };
    }

    // 根据分数决定语言
    if (tsScore > jsScore) {
      return {
        language: 'typescript',
        confidence: Math.min(0.9, tsScore / totalScore),
        method: 'content',
        details: `TS patterns: ${tsScore}, JS patterns: ${jsScore}`
      };
    } else if (jsScore > tsScore) {
      return {
        language: 'javascript',
        confidence: Math.min(0.9, jsScore / totalScore),
        method: 'content',
        details: `JS patterns: ${jsScore}, TS patterns: ${tsScore}`
      };
    } else {
      // 分数相同，优先判断JavaScript
      return {
        language: 'javascript',
        confidence: 0.5,
        method: 'content',
        details: `Equal scores: TS=${tsScore}, JS=${jsScore}`
      };
    }
  }

  /**
   * 检查文件是否为支持的文件类型（改进版）
   */
  static isSupportedFile(filePath: string): boolean {
    const detection = this.detectFileLanguage(filePath);
    return detection.language === 'typescript' || detection.language === 'javascript';
  }

  /**
   * 获取文件的语言类型（改进版）
   */
  static getFileLanguage(filePath: string): 'typescript' | 'javascript' | 'unknown' {
    const detection = this.detectFileLanguage(filePath);
    return detection.language;
  }

  /**
   * 获取详细的语言检测信息
   */
  static getFileLanguageDetailed(filePath: string): {
    language: 'typescript' | 'javascript' | 'unknown';
    confidence: number;
    method: 'extension' | 'content' | 'shebang' | 'fallback';
    details?: string;
  } {
    return this.detectFileLanguage(filePath);
  }

  /**
   * 检查是否为JSX/TSX文件
   */
  static isReactFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.jsx', '.tsx'].includes(ext);
  }

  /**
   * 检查是否为ES模块文件
   */
  static isESModuleFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.mjs';
  }

  /**
   * 检查是否为CommonJS模块文件
   */
  static isCommonJSFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.cjs';
  }

  /**
   * 获取相对路径
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(path.dirname(from), to);
  }

  /**
   * 批量检测文件语言
   */
  static batchDetectLanguages(filePaths: string[]): Map<string, {
    language: 'typescript' | 'javascript' | 'unknown';
    confidence: number;
    method: string;
  }> {
    const results = new Map();
    for (const filePath of filePaths) {
      const detection = this.detectFileLanguage(filePath);
      results.set(filePath, {
        language: detection.language,
        confidence: detection.confidence,
        method: detection.method
      });
    }
    return results;
  }

  /**
   * 统计语言分布
   */
  static getLanguageStatistics(filePaths: string[]): {
    typescript: { count: number; percentage: number; files: string[] };
    javascript: { count: number; percentage: number; files: string[] };
    unknown: { count: number; percentage: number; files: string[] };
    total: number;
    highConfidenceDetections: number;
  } {
    const stats = {
      typescript: { count: 0, percentage: 0, files: [] as string[] },
      javascript: { count: 0, percentage: 0, files: [] as string[] },
      unknown: { count: 0, percentage: 0, files: [] as string[] },
      total: filePaths.length,
      highConfidenceDetections: 0
    };

    for (const filePath of filePaths) {
      const detection = this.detectFileLanguage(filePath);
      
      if (detection.confidence >= 0.8) {
        stats.highConfidenceDetections++;
      }

      switch (detection.language) {
        case 'typescript':
          stats.typescript.count++;
          stats.typescript.files.push(filePath);
          break;
        case 'javascript':
          stats.javascript.count++;
          stats.javascript.files.push(filePath);
          break;
        default:
          stats.unknown.count++;
          stats.unknown.files.push(filePath);
          break;
      }
    }

    // 计算百分比
    if (stats.total > 0) {
      stats.typescript.percentage = (stats.typescript.count / stats.total) * 100;
      stats.javascript.percentage = (stats.javascript.count / stats.total) * 100;
      stats.unknown.percentage = (stats.unknown.count / stats.total) * 100;
    }

    return stats;
  }

  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 输出语言检测报告
   */
  static logLanguageDetectionReport(filePaths: string[], verbose: boolean = false): void {
    const stats = this.getLanguageStatistics(filePaths);
    
    console.log('\n📊 语言检测统计报告:');
    console.log(`   总文件数: ${stats.total}`);
    console.log(`   TypeScript: ${stats.typescript.count} 个 (${stats.typescript.percentage.toFixed(1)}%)`);
    console.log(`   JavaScript: ${stats.javascript.count} 个 (${stats.javascript.percentage.toFixed(1)}%)`);
    console.log(`   未知语言: ${stats.unknown.count} 个 (${stats.unknown.percentage.toFixed(1)}%)`);
    console.log(`   高置信度检测: ${stats.highConfidenceDetections}/${stats.total} (${((stats.highConfidenceDetections / stats.total) * 100).toFixed(1)}%)`);

    if (verbose && stats.unknown.count > 0) {
      console.log('\n⚠️  未能检测的文件:');
      stats.unknown.files.forEach(file => {
        const detection = this.detectFileLanguage(file);
        console.log(`   - ${file} (方法: ${detection.method}, 置信度: ${detection.confidence}, 详情: ${detection.details || 'N/A'})`);
      });
    }
  }

  /**
   * 格式化时间
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }
}