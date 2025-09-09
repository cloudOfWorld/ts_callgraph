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

// 核心分析器
export { TypeScriptAnalyzer } from './core/analyzer';

// 类型定义
export * from './types';

// 工具函数
export { Utils } from './utils';

// 格式化器
export { JsonFormatter } from './formatters/json';
export { MermaidFormatter } from './formatters/mermaid';
export { HtmlFormatter } from './formatters/html';
export { BaseFormatter, IFormatter } from './formatters/base';

// CLI
export { CLI } from './cli/index';

// 默认导出主分析器
import { TypeScriptAnalyzer } from './core/analyzer';
export default TypeScriptAnalyzer;