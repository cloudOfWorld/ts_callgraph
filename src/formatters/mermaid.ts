import { AnalysisResult, Symbol, CallRelation, ImportRelation } from '../types';
import { BaseFormatter } from './base';
import * as path from 'path';

/**
 * Mermaid 格式化器
 */
export class MermaidFormatter extends BaseFormatter {
  /**
   * 格式化为Mermaid图表
   */
  format(result: AnalysisResult): string {
    const sections: string[] = [];
    
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
  formatAsClassDiagram(result: AnalysisResult): string {
    const sections: string[] = [];
    
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
          sections.push(...this.generateClassDefinition(symbol as any));
        } else if (symbol.type === 'interface') {
          sections.push(...this.generateInterfaceDefinition(symbol as any));
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
  private generateNodes(symbols: Symbol[]): string[] {
    const nodes: string[] = [];
    
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
  private formatNodeLabel(symbol: Symbol): string {
    let label = symbol.name;
    
    // 添加类型信息
    if (symbol.type === 'method' || symbol.type === 'function') {
      const func = symbol as any;
      const params = func.parameters?.map((p: any) => p.name).join(', ') || '';
      label += `(${params})`;
      
      if (func.returnType) {
        label += `: ${func.returnType}`;
      }
    } else if (symbol.type === 'property' || symbol.type === 'variable') {
      const prop = symbol as any;
      if (prop.propertyType || prop.variableType) {
        label += `: ${prop.propertyType || prop.variableType}`;
      }
    }

    // 添加可见性标记
    if ('accessibility' in symbol) {
      const accessibility = (symbol as any).accessibility;
      if (accessibility === 'private') {
        label = '- ' + label;
      } else if (accessibility === 'protected') {
        label = '# ' + label;
      } else if (accessibility === 'public') {
        label = '+ ' + label;
      }
    }

    return this.escapeString(label);
  }

  /**
   * 获取节点形状
   */
  private getNodeShape(symbol: Symbol): string {
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
  private generateCallEdges(callRelations: CallRelation[], symbols: Symbol[]): string[] {
    const edges: string[] = [];
    const symbolMap = new Map(symbols.map(s => [s.name, s.id]));

    callRelations.forEach(call => {
      const callerName = typeof call.caller === 'string' ? call.caller : call.caller.name;
      const calleeName = typeof call.callee === 'string' ? call.callee : call.callee.name;
      
      const callerId = symbolMap.get(callerName);
      const calleeId = symbolMap.get(calleeName);
      
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
  private getCallEdgeLabel(call: CallRelation): string {
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
  private generateImportEdges(importRelations: ImportRelation[]): string[] {
    const edges: string[] = [];
    const fileNodes = new Map<string, string>();

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
  private getImportEdgeLabel(imp: ImportRelation): string {
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
  private groupSymbolsByFile(symbols: Symbol[]): Map<string, Symbol[]> {
    const grouped = new Map<string, Symbol[]>();
    
    symbols.forEach(symbol => {
      const filePath = symbol.location.filePath;
      if (!grouped.has(filePath)) {
        grouped.set(filePath, []);
      }
      grouped.get(filePath)!.push(symbol);
    });

    return grouped;
  }

  /**
   * 生成类定义
   */
  private generateClassDefinition(classSymbol: any): string[] {
    const lines: string[] = [];
    const className = this.cleanId(classSymbol.name);
    
    lines.push(`  class ${className} {`);
    
    // 添加属性
    classSymbol.properties?.forEach((prop: any) => {
      const visibility = this.getVisibilitySymbol(prop.accessibility);
      const type = prop.propertyType ? ` : ${prop.propertyType}` : '';
      lines.push(`    ${visibility}${prop.name}${type}`);
    });

    // 添加方法
    classSymbol.methods?.forEach((method: any) => {
      const visibility = this.getVisibilitySymbol(method.accessibility);
      const params = method.parameters?.map((p: any) => `${p.name}: ${p.type || 'any'}`).join(', ') || '';
      const returnType = method.returnType ? ` : ${method.returnType}` : '';
      lines.push(`    ${visibility}${method.name}(${params})${returnType}`);
    });

    lines.push('  }');
    
    return lines;
  }

  /**
   * 生成接口定义
   */
  private generateInterfaceDefinition(interfaceSymbol: any): string[] {
    const lines: string[] = [];
    const interfaceName = this.cleanId(interfaceSymbol.name);
    
    lines.push(`  class ${interfaceName} {`);
    lines.push(`    <<interface>>`);
    
    // 添加属性
    interfaceSymbol.properties?.forEach((prop: any) => {
      const type = prop.propertyType ? ` : ${prop.propertyType}` : '';
      lines.push(`    +${prop.name}${type}`);
    });

    // 添加方法
    interfaceSymbol.methods?.forEach((method: any) => {
      const params = method.parameters?.map((p: any) => `${p.name}: ${p.type || 'any'}`).join(', ') || '';
      const returnType = method.returnType ? ` : ${method.returnType}` : '';
      lines.push(`    +${method.name}(${params})${returnType}`);
    });

    lines.push('  }');
    
    return lines;
  }

  /**
   * 生成类关系
   */
  private generateClassRelationships(result: AnalysisResult): string[] {
    const relationships: string[] = [];
    
    result.symbols.forEach(symbol => {
      if (symbol.type === 'class') {
        const classSymbol = symbol as any;
        
        // 继承关系
        classSymbol.extends?.forEach((parent: string) => {
          const parentId = this.cleanId(parent);
          const childId = this.cleanId(classSymbol.name);
          relationships.push(`  ${parentId} <|-- ${childId}`);
        });

        // 实现关系
        classSymbol.implements?.forEach((iface: string) => {
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
  private getVisibilitySymbol(accessibility?: string): string {
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
  private generateStyles(): string[] {
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