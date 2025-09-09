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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const ts = __importStar(require("typescript"));
const glob_1 = require("glob");
const path = __importStar(require("path"));
/**
 * 工具函数集合
 */
class Utils {
    /**
     * 获取TypeScript源文件中节点的位置信息
     */
    static getLocation(node, sourceFile) {
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
    static generateId(name, location) {
        return `${name}_${path.basename(location.filePath)}_${location.start.line}_${location.start.column}`;
    }
    /**
     * 获取节点的可见性修饰符
     */
    static getVisibility(node) {
        const modifierFlags = ts.getCombinedModifierFlags(node);
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
    static isExported(node) {
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export);
    }
    /**
     * 检查节点是否为静态成员
     */
    static isStatic(node) {
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static);
    }
    /**
     * 检查节点是否为抽象成员
     */
    static isAbstract(node) {
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Abstract);
    }
    /**
     * 检查节点是否为只读属性
     */
    static isReadonly(node) {
        return !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Readonly);
    }
    /**
     * 获取类型信息的字符串表示
     */
    static getTypeString(typeChecker, node) {
        try {
            const type = typeChecker.getTypeAtLocation(node);
            return typeChecker.typeToString(type);
        }
        catch {
            return undefined;
        }
    }
    /**
     * 获取JSDoc注释
     */
    static getDocumentation(node) {
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
    static async findFiles(patterns, excludePatterns = []) {
        const allFiles = [];
        for (const pattern of patterns) {
            try {
                const files = await (0, glob_1.glob)(pattern, {
                    ignore: excludePatterns,
                    nodir: true
                });
                allFiles.push(...files);
            }
            catch (error) {
                console.warn(`Warning: Failed to process pattern ${pattern}:`, error);
            }
        }
        // 去重并返回绝对路径
        return [...new Set(allFiles)].map(file => path.resolve(file));
    }
    /**
     * 规范化文件路径
     */
    static normalizePath(filePath) {
        return path.resolve(filePath).replace(/\\/g, '/');
    }
    /**
     * 检查文件是否为TypeScript文件
     */
    static isTypeScriptFile(filePath) {
        const ext = path.extname(filePath);
        return ['.ts', '.tsx', '.d.ts'].includes(ext);
    }
    /**
     * 获取相对路径
     */
    static getRelativePath(from, to) {
        return path.relative(path.dirname(from), to);
    }
    /**
     * 深度克隆对象
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    /**
     * 格式化时间
     */
    static formatDate(date) {
        return date.toISOString();
    }
}
exports.Utils = Utils;
//# sourceMappingURL=index.js.map