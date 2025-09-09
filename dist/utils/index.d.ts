import * as ts from 'typescript';
import { Location } from '../types';
/**
 * 工具函数集合
 */
export declare class Utils {
    /**
     * 获取TypeScript源文件中节点的位置信息
     */
    static getLocation(node: ts.Node, sourceFile: ts.SourceFile): Location;
    /**
     * 生成唯一ID
     */
    static generateId(name: string, location: Location): string;
    /**
     * 获取节点的可见性修饰符
     */
    static getVisibility(node: ts.Node): 'public' | 'private' | 'protected' | undefined;
    /**
     * 检查节点是否被导出
     */
    static isExported(node: ts.Node): boolean;
    /**
     * 检查节点是否为静态成员
     */
    static isStatic(node: ts.Node): boolean;
    /**
     * 检查节点是否为抽象成员
     */
    static isAbstract(node: ts.Node): boolean;
    /**
     * 检查节点是否为只读属性
     */
    static isReadonly(node: ts.Node): boolean;
    /**
     * 获取类型信息的字符串表示
     */
    static getTypeString(typeChecker: ts.TypeChecker, node: ts.Node): string | undefined;
    /**
     * 获取JSDoc注释
     */
    static getDocumentation(node: ts.Node): string | undefined;
    /**
     * 匹配文件模式
     */
    static findFiles(patterns: string[], excludePatterns?: string[]): Promise<string[]>;
    /**
     * 规范化文件路径
     */
    static normalizePath(filePath: string): string;
    /**
     * 检查文件是否为TypeScript文件
     */
    static isTypeScriptFile(filePath: string): boolean;
    /**
     * 获取相对路径
     */
    static getRelativePath(from: string, to: string): string;
    /**
     * 深度克隆对象
     */
    static deepClone<T>(obj: T): T;
    /**
     * 格式化时间
     */
    static formatDate(date: Date): string;
}
//# sourceMappingURL=index.d.ts.map