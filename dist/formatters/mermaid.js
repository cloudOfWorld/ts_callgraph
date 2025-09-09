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
exports.MermaidFormatter = void 0;
const base_1 = require("./base");
const path = __importStar(require("path"));
/**
 * Mermaid 格式化器
 */
class MermaidFormatter extends base_1.BaseFormatter {
    /**
     * 格式化为Mermaid图表
     */
    format(result) {
        const sections = [];
        // 添加标题和元数据
        sections.push('```mermaid');
        sections.push('graph TB');
        sections.push('  %% TypeScript Call Graph');
        sections.push(`  %% Generated: ${result.metadata.analysisDate.toISOString()}`);
        sections.push(`  %% Files: ${result.metadata.totalFiles}`);
        sections.push(`  %% Symbols: ${result.metadata.totalSymbols}`);
        sections.push('');
        // 生成节点定义
        const nodes = this.generateNodes(result.symbols);
        sections.push('  %% Node Definitions');
        sections.push(...nodes);
        sections.push('');
        // 生成调用关系
        const callEdges = this.generateCallEdges(result.callRelations, result.symbols);
        if (callEdges.length > 0) {
            sections.push('  %% Call Relations');
            sections.push(...callEdges);
            sections.push('');
        }
        // 生成导入关系
        const importEdges = this.generateImportEdges(result.importRelations);
        if (importEdges.length > 0) {
            sections.push('  %% Import Relations');
            sections.push(...importEdges);
            sections.push('');
        }
        // 添加样式定义
        const styles = this.generateStyles();
        sections.push('  %% Styles');
        sections.push(...styles);
        sections.push('```');
        return sections.join('\n');
    }
    /**
     * 生成类图格式
     */
    formatAsClassDiagram(result) {
        const sections = [];
        sections.push('```mermaid');
        sections.push('classDiagram');
        sections.push(`  %% Generated: ${result.metadata.analysisDate.toISOString()}`);
        sections.push('');
        // 按文件分组符号
        const symbolsByFile = this.groupSymbolsByFile(result.symbols);
        for (const [filePath, symbols] of symbolsByFile.entries()) {
            const fileName = path.basename(filePath, path.extname(filePath));
            sections.push(`  %% File: ${fileName}`);
            for (const symbol of symbols) {
                if (symbol.type === 'class') {
                    sections.push(...this.generateClassDefinition(symbol));
                }
                else if (symbol.type === 'interface') {
                    sections.push(...this.generateInterfaceDefinition(symbol));
                }
            }
            sections.push('');
        }
        // 生成关系
        const relationships = this.generateClassRelationships(result);
        if (relationships.length > 0) {
            sections.push('  %% Relationships');
            sections.push(...relationships);
        }
        sections.push('```');
        return sections.join('\n');
    }
    /**
     * 生成节点定义
     */
    generateNodes(symbols) {
        const nodes = [];
        symbols.forEach(symbol => {
            const nodeId = this.cleanId(symbol.id);
            const label = this.formatNodeLabel(symbol);
            const shape = this.getNodeShape(symbol);
            nodes.push(`  ${nodeId}${shape}["${label}"]`);
        });
        return nodes;
    }
    /**
     * 格式化节点标签
     */
    formatNodeLabel(symbol) {
        let label = symbol.name;
        // 添加类型信息
        if (symbol.type === 'method' || symbol.type === 'function') {
            const func = symbol;
            const params = func.parameters?.map((p) => p.name).join(', ') || '';
            label += `(${params})`;
            if (func.returnType) {
                label += `: ${func.returnType}`;
            }
        }
        else if (symbol.type === 'property' || symbol.type === 'variable') {
            const prop = symbol;
            if (prop.propertyType || prop.variableType) {
                label += `: ${prop.propertyType || prop.variableType}`;
            }
        }
        // 添加可见性标记
        if ('accessibility' in symbol) {
            const accessibility = symbol.accessibility;
            if (accessibility === 'private') {
                label = '- ' + label;
            }
            else if (accessibility === 'protected') {
                label = '# ' + label;
            }
            else if (accessibility === 'public') {
                label = '+ ' + label;
            }
        }
        return this.escapeString(label);
    }
    /**
     * 获取节点形状
     */
    getNodeShape(symbol) {
        switch (symbol.type) {
            case 'class':
                return ':::class';
            case 'interface':
                return ':::interface';
            case 'function':
                return ':::function';
            case 'method':
                return ':::method';
            case 'property':
            case 'variable':
                return ':::property';
            case 'constructor':
                return ':::constructor';
            default:
                return '';
        }
    }
    /**
     * 生成调用关系边
     */
    generateCallEdges(callRelations, symbols) {
        const edges = [];
        const symbolMap = new Map(symbols.map(s => [s.name, s.id]));
        callRelations.forEach(call => {
            const callerId = symbolMap.get(call.caller);
            const calleeId = symbolMap.get(call.callee);
            if (callerId && calleeId) {
                const cleanCallerId = this.cleanId(callerId);
                const cleanCalleeId = this.cleanId(calleeId);
                const edgeLabel = this.getCallEdgeLabel(call);
                edges.push(`  ${cleanCallerId} -->${edgeLabel} ${cleanCalleeId}`);
            }
        });
        return edges;
    }
    /**
     * 获取调用边标签
     */
    getCallEdgeLabel(call) {
        const labels = {
            'method': '|calls|',
            'function': '|invokes|',
            'constructor': '|new|',
            'property': '|accesses|'
        };
        return labels[call.callType] || '|uses|';
    }
    /**
     * 生成导入关系边
     */
    generateImportEdges(importRelations) {
        const edges = [];
        const fileNodes = new Map();
        // 为每个文件创建节点ID
        importRelations.forEach(imp => {
            if (!fileNodes.has(imp.importer)) {
                const fileName = path.basename(imp.importer, path.extname(imp.importer));
                fileNodes.set(imp.importer, this.cleanId(`file_${fileName}`));
            }
            if (!fileNodes.has(imp.imported)) {
                const fileName = path.basename(imp.imported, path.extname(imp.imported));
                fileNodes.set(imp.imported, this.cleanId(`file_${fileName}`));
            }
        });
        // 添加文件节点定义
        fileNodes.forEach((nodeId, filePath) => {
            const fileName = path.basename(filePath, path.extname(filePath));
            edges.push(`  ${nodeId}[("${fileName}")]:::file`);
        });
        // 添加导入边
        importRelations.forEach(imp => {
            const importerNode = fileNodes.get(imp.importer);
            const importedNode = fileNodes.get(imp.imported);
            if (importerNode && importedNode && importerNode !== importedNode) {
                const edgeLabel = this.getImportEdgeLabel(imp);
                edges.push(`  ${importerNode} -.${edgeLabel}.-> ${importedNode}`);
            }
        });
        return edges;
    }
    /**
     * 获取导入边标签
     */
    getImportEdgeLabel(imp) {
        const labels = {
            'default': '|default|',
            'named': '|named|',
            'namespace': '|*|',
            'sideEffect': '|side-effect|'
        };
        return labels[imp.importType] || '|import|';
    }
    /**
     * 按文件分组符号
     */
    groupSymbolsByFile(symbols) {
        const grouped = new Map();
        symbols.forEach(symbol => {
            const filePath = symbol.location.filePath;
            if (!grouped.has(filePath)) {
                grouped.set(filePath, []);
            }
            grouped.get(filePath).push(symbol);
        });
        return grouped;
    }
    /**
     * 生成类定义
     */
    generateClassDefinition(classSymbol) {
        const lines = [];
        const className = this.cleanId(classSymbol.name);
        lines.push(`  class ${className} {`);
        // 添加属性
        classSymbol.properties?.forEach((prop) => {
            const visibility = this.getVisibilitySymbol(prop.accessibility);
            const type = prop.propertyType ? ` : ${prop.propertyType}` : '';
            lines.push(`    ${visibility}${prop.name}${type}`);
        });
        // 添加方法
        classSymbol.methods?.forEach((method) => {
            const visibility = this.getVisibilitySymbol(method.accessibility);
            const params = method.parameters?.map((p) => `${p.name}: ${p.type || 'any'}`).join(', ') || '';
            const returnType = method.returnType ? ` : ${method.returnType}` : '';
            lines.push(`    ${visibility}${method.name}(${params})${returnType}`);
        });
        lines.push('  }');
        return lines;
    }
    /**
     * 生成接口定义
     */
    generateInterfaceDefinition(interfaceSymbol) {
        const lines = [];
        const interfaceName = this.cleanId(interfaceSymbol.name);
        lines.push(`  class ${interfaceName} {`);
        lines.push(`    <<interface>>`);
        // 添加属性
        interfaceSymbol.properties?.forEach((prop) => {
            const type = prop.propertyType ? ` : ${prop.propertyType}` : '';
            lines.push(`    +${prop.name}${type}`);
        });
        // 添加方法
        interfaceSymbol.methods?.forEach((method) => {
            const params = method.parameters?.map((p) => `${p.name}: ${p.type || 'any'}`).join(', ') || '';
            const returnType = method.returnType ? ` : ${method.returnType}` : '';
            lines.push(`    +${method.name}(${params})${returnType}`);
        });
        lines.push('  }');
        return lines;
    }
    /**
     * 生成类关系
     */
    generateClassRelationships(result) {
        const relationships = [];
        result.symbols.forEach(symbol => {
            if (symbol.type === 'class') {
                const classSymbol = symbol;
                // 继承关系
                classSymbol.extends?.forEach((parent) => {
                    const parentId = this.cleanId(parent);
                    const childId = this.cleanId(classSymbol.name);
                    relationships.push(`  ${parentId} <|-- ${childId}`);
                });
                // 实现关系
                classSymbol.implements?.forEach((iface) => {
                    const interfaceId = this.cleanId(iface);
                    const classId = this.cleanId(classSymbol.name);
                    relationships.push(`  ${interfaceId} <|.. ${classId}`);
                });
            }
        });
        return relationships;
    }
    /**
     * 获取可见性符号
     */
    getVisibilitySymbol(accessibility) {
        switch (accessibility) {
            case 'private': return '-';
            case 'protected': return '#';
            case 'public': return '+';
            default: return '+';
        }
    }
    /**
     * 生成样式定义
     */
    generateStyles() {
        return [
            'classDef class fill:#e1f5fe,stroke:#01579b,stroke-width:2px',
            'classDef interface fill:#f3e5f5,stroke:#4a148c,stroke-width:2px',
            'classDef function fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px',
            'classDef method fill:#fff3e0,stroke:#e65100,stroke-width:2px',
            'classDef property fill:#fce4ec,stroke:#880e4f,stroke-width:2px',
            'classDef constructor fill:#f1f8e9,stroke:#33691e,stroke-width:2px',
            'classDef file fill:#f5f5f5,stroke:#424242,stroke-width:1px'
        ];
    }
}
exports.MermaidFormatter = MermaidFormatter;
//# sourceMappingURL=mermaid.js.map