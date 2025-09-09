"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFormatter = void 0;
/**
 * 格式化器基类
 */
class BaseFormatter {
    /**
     * 获取格式化后的元数据
     */
    getMetadataString(result) {
        const metadata = result.metadata;
        return [
            `Generated on: ${metadata.analysisDate.toISOString()}`,
            `Total files: ${metadata.totalFiles}`,
            `Total symbols: ${metadata.totalSymbols}`,
            `Total call relations: ${metadata.totalCallRelations}`
        ].join('\n');
    }
    /**
     * 转义特殊字符
     */
    escapeString(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
    /**
     * 清理文件名用于ID
     */
    cleanId(str) {
        return str
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}
exports.BaseFormatter = BaseFormatter;
//# sourceMappingURL=base.js.map