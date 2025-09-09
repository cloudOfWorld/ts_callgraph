import * as ts from 'typescript';
import { glob } from 'glob';
import * as path from 'path';
import { Position, Location } from '../types';

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
   */
  static isTypeScriptFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.d.ts'].includes(ext);
  }

  /**
   * 检查文件是否为JavaScript文件
   */
  static isJavaScriptFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx', '.mjs', '.cjs'].includes(ext);
  }

  /**
   * 检查文件是否为支持的文件类型
   */
  static isSupportedFile(filePath: string): boolean {
    return this.isTypeScriptFile(filePath) || this.isJavaScriptFile(filePath);
  }

  /**
   * 获取文件的语言类型
   */
  static getFileLanguage(filePath: string): 'typescript' | 'javascript' | 'unknown' {
    if (this.isTypeScriptFile(filePath)) {
      return 'typescript';
    }
    if (this.isJavaScriptFile(filePath)) {
      return 'javascript';
    }
    return 'unknown';
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
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 格式化时间
   */
  static formatDate(date: Date): string {
    return date.toISOString();
  }
}