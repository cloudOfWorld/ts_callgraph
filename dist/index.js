"use strict";
/**
 * TypeScript CallGraph Analyzer
 *
 * 一个综合的TypeScript工程分析工具，结合了三个优秀项目的思想：
 * - TS-Call-Graph: 类的可视化分析
 * - TypeScript-Call-Graph: CLI工具和多种可视化
 * - Jelly: 学术级静态分析
 *
 * 功能特性：
 * - 类、接口、函数、变量的提取
 * - 调用关系分析
 * - 导入/导出依赖关系分析
 * - 多种输出格式（JSON、Mermaid、HTML）
 * - 交互式可视化界面
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = exports.BaseFormatter = exports.HtmlFormatter = exports.MermaidFormatter = exports.JsonFormatter = exports.Utils = exports.TypeScriptAnalyzer = void 0;
// 核心分析器
var analyzer_1 = require("./core/analyzer");
Object.defineProperty(exports, "TypeScriptAnalyzer", { enumerable: true, get: function () { return analyzer_1.TypeScriptAnalyzer; } });
// 类型定义
__exportStar(require("./types"), exports);
// 工具函数
var utils_1 = require("./utils");
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return utils_1.Utils; } });
// 格式化器
var json_1 = require("./formatters/json");
Object.defineProperty(exports, "JsonFormatter", { enumerable: true, get: function () { return json_1.JsonFormatter; } });
var mermaid_1 = require("./formatters/mermaid");
Object.defineProperty(exports, "MermaidFormatter", { enumerable: true, get: function () { return mermaid_1.MermaidFormatter; } });
var html_1 = require("./formatters/html");
Object.defineProperty(exports, "HtmlFormatter", { enumerable: true, get: function () { return html_1.HtmlFormatter; } });
var base_1 = require("./formatters/base");
Object.defineProperty(exports, "BaseFormatter", { enumerable: true, get: function () { return base_1.BaseFormatter; } });
// CLI
var index_1 = require("./cli/index");
Object.defineProperty(exports, "CLI", { enumerable: true, get: function () { return index_1.CLI; } });
// 默认导出主分析器
const analyzer_2 = require("./core/analyzer");
exports.default = analyzer_2.TypeScriptAnalyzer;
//# sourceMappingURL=index.js.map