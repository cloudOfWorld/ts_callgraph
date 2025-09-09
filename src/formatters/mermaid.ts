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
      const cssClass = this.getNodeCssClass(symbol);
      
      nodes.push(`  ${nodeId}["${label}"]`);
      if (cssClass) {
        nodes.push(`  ${nodeId}:::${cssClass}`);
      }
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
      
      if (func.returnType && func.returnType.length < 30) {
        // 限制返回类型长度避免标签过长
        const returnType = func.returnType.replace(/\(.*?\) => /, '');
        label += `: ${returnType}`;
      }
    } else if (symbol.type === 'property' || symbol.type === 'variable') {
      const prop = symbol as any;
      const propType = prop.propertyType || prop.variableType;
      if (propType && propType.length < 20) {
        // 限制属性类型长度
        label += `: ${propType}`;
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

    // 清理标签中的特殊字符
    return label.replace(/["/\\\n\r]/g, ' ');
  }

  /**
   * 获取节点CSS类
   */
  private getNodeCssClass(symbol: Symbol): string {
    switch (symbol.type) {
      case 'class':
        return 'class';
      case 'interface':
        return 'interface';
      case 'function':
        return 'function';
      case 'method':
        return 'method';
      case 'property':
      case 'variable':
        return 'property';
      case 'constructor':
        return 'constructor';
      default:
        return '';
    }
  }

  /**
   * 生成调用关系边
   */
  private generateCallEdges(callRelations: CallRelation[], symbols: Symbol[]): string[] {
    const edges: string[] = [];
    const symbolIdMap = new Map(symbols.map(s => [s.id, s]));

    callRelations.forEach(call => {
      try {
        const caller = call.caller;
        const callee = call.callee;
        
        if (!caller || !callee) return;
        
        // 优先使用ID查找，其次使用名称
        let callerSymbol: Symbol | undefined;
        let calleeSymbol: Symbol | undefined;
        
        if (caller.id) {
          callerSymbol = symbolIdMap.get(caller.id);
        }
        if (!callerSymbol && caller.name) {
          callerSymbol = symbols.find(s => s.name === caller.name);
        }
        
        if (callee.id) {
          calleeSymbol = symbolIdMap.get(callee.id);
        }
        if (!calleeSymbol && callee.name) {
          calleeSymbol = symbols.find(s => s.name === callee.name);
        }
        
        if (callerSymbol && calleeSymbol) {
          const cleanCallerId = this.cleanId(callerSymbol.id);
          const cleanCalleeId = this.cleanId(calleeSymbol.id);
          const edgeLabel = this.getCallEdgeLabel(call);
          
          // 确保边不重复且节点ID合法
          if (cleanCallerId !== cleanCalleeId && this.isValidId(cleanCallerId) && this.isValidId(cleanCalleeId)) {
            edges.push(`  ${cleanCallerId} -->${edgeLabel} ${cleanCalleeId}`);
          }
        }
      } catch (error) {
        // 静默忽略错误，避免中断整个生成过程
        console.warn(`Error generating call edge: ${error}`);
      }
    });

    return edges;
  }
  
  /**
   * 验证ID是否合法
   */
  private isValidId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9_]+$/.test(id);
  }

  /**
   * 获取调用边标签
   */
  private getCallEdgeLabel(call: CallRelation): string {
    const labels = {
      'method': '|calls|',
      'function': '|invokes|',
      'constructor': '|new|',
      'property': '|access|'
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
    const className = classSymbol.name;
    
    lines.push(`  class ${className} {`);
    
    // 添加属性
    classSymbol.properties?.forEach((prop: any) => {
      const visibility = this.getVisibilitySymbol(prop.accessibility);
      const propType = this.simplifyType(prop.propertyType);
      const staticMark = prop.isStatic ? '$' : '';
      lines.push(`    ${visibility}${prop.name}${staticMark} ${propType}`);
    });

    // 添加方法
    classSymbol.methods?.forEach((method: any) => {
      const visibility = this.getVisibilitySymbol(method.accessibility);
      const staticMark = method.isStatic ? '$' : '';
      const abstractMark = method.isAbstract ? '*' : '';
      const params = method.parameters?.map((p: any) => `${p.name}`).join(', ') || '';
      const returnType = this.simplifyType(this.extractReturnType(method.returnType));
      lines.push(`    ${visibility}${method.name}${staticMark}${abstractMark}(${params}) ${returnType}`);
    });

    // 添加构造函数
    classSymbol.constructors?.forEach((ctor: any) => {
      const params = ctor.parameters?.map((p: any) => `${p.name}`).join(', ') || '';
      lines.push(`    +${ctor.name}(${params})`);
    });

    lines.push('  }');
    
    return lines;
  }

  /**
   * 生成接口定义
   */
  private generateInterfaceDefinition(interfaceSymbol: any): string[] {
    const lines: string[] = [];
    const interfaceName = interfaceSymbol.name;
    
    lines.push(`  class ${interfaceName} {`);
    lines.push(`    <<interface>>`);
    
    // 添加属性
    interfaceSymbol.properties?.forEach((prop: any) => {
      const propType = this.simplifyType(prop.propertyType);
      lines.push(`    +${prop.name} ${propType}`);
    });

    // 添加方法
    interfaceSymbol.methods?.forEach((method: any) => {
      const params = method.parameters?.map((p: any) => `${p.name}`).join(', ') || '';
      const returnType = this.simplifyType(this.extractReturnType(method.returnType));
      lines.push(`    +${method.name}(${params}) ${returnType}`);
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
          const parentName = parent.trim();
          const childName = classSymbol.name;
          relationships.push(`  ${parentName} <|-- ${childName}`);
        });

        // 实现关系
        classSymbol.implements?.forEach((iface: string) => {
          const interfaceName = iface.trim();
          const className = classSymbol.name;
          relationships.push(`  ${interfaceName} <|.. ${className}`);
        });
      }
    });

    return relationships;
  }
  
  /**
   * 简化类型表达式
   */
  private simplifyType(typeStr?: string): string {
    if (!typeStr) return '';
    
    // 移除函数签名，只保留返回类型
    if (typeStr.includes('=>')) {
      const parts = typeStr.split('=>');
      if (parts.length > 1) {
        typeStr = parts[parts.length - 1].trim();
      }
    }
    
    // 简化泛型表达式
    typeStr = typeStr.replace(/Map<([^,]+),\s*([^>]+)>/g, 'Map~$1,$2~');
    typeStr = typeStr.replace(/Promise<([^>]+)>/g, 'Promise~$1~');
    typeStr = typeStr.replace(/Array<([^>]+)>/g, '$1[]');
    typeStr = typeStr.replace(/Partial<([^>]+)>/g, '$1');
    
    // 移除复杂的联合类型
    if (typeStr.includes('|') && typeStr.length > 20) {
      const parts = typeStr.split('|');
      typeStr = parts[0].trim();
    }
    
    // 限制长度
    if (typeStr.length > 30) {
      typeStr = typeStr.substring(0, 27) + '...';
    }
    
    return typeStr;
  }
  
  /**
   * 提取返回类型
   */
  private extractReturnType(returnTypeStr?: string): string {
    if (!returnTypeStr) return 'void';
    
    // 如果是函数类型，提取返回类型
    if (returnTypeStr.includes('=>')) {
      const parts = returnTypeStr.split('=>');
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
    }
    
    return returnTypeStr;
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
  
  /**
   * 生成保守的类图格式（确保兼容性）
   */
  formatAsSimpleClassDiagram(result: AnalysisResult): string {
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
          sections.push(...this.generateSimpleClassDefinition(symbol as any));
        } else if (symbol.type === 'interface') {
          sections.push(...this.generateSimpleInterfaceDefinition(symbol as any));
        }
      }
      sections.push('');
    }

    // 生成关系
    const relationships = this.generateSimpleClassRelationships(result);
    if (relationships.length > 0) {
      sections.push('  %% Relationships');
      sections.push(...relationships);
    }

    sections.push('```');

    return sections.join('\n');
  }
  
  /**
   * 生成简单类定义
   */
  private generateSimpleClassDefinition(classSymbol: any): string[] {
    const lines: string[] = [];
    const className = this.sanitizeClassName(classSymbol.name);
    
    lines.push(`  class ${className} {`);
    
    // 添加主要属性（限制数量和复杂度）
    const mainProperties = classSymbol.properties?.slice(0, 8) || [];
    mainProperties.forEach((prop: any) => {
      const visibility = this.getVisibilitySymbol(prop.accessibility);
      const propType = this.getSimpleType(prop.propertyType);
      const staticMark = prop.isStatic ? '$' : '';
      lines.push(`    ${visibility}${prop.name}${staticMark} ${propType}`);
    });

    // 添加主要方法（限制数量）
    const mainMethods = classSymbol.methods?.slice(0, 8) || [];
    mainMethods.forEach((method: any) => {
      const visibility = this.getVisibilitySymbol(method.accessibility);
      const staticMark = method.isStatic ? '$' : '';
      const abstractMark = method.isAbstract ? '*' : '';
      const returnType = this.getSimpleType(this.extractReturnType(method.returnType));
      lines.push(`    ${visibility}${method.name}()${staticMark}${abstractMark} ${returnType}`);
    });

    lines.push('  }');
    
    return lines;
  }
  
  /**
   * 生成简单接口定义
   */
  private generateSimpleInterfaceDefinition(interfaceSymbol: any): string[] {
    const lines: string[] = [];
    const interfaceName = this.sanitizeClassName(interfaceSymbol.name);
    
    lines.push(`  class ${interfaceName} {`);
    lines.push(`    <<interface>>`);
    
    // 添加属性
    const properties = interfaceSymbol.properties?.slice(0, 6) || [];
    properties.forEach((prop: any) => {
      const propType = this.getSimpleType(prop.propertyType);
      lines.push(`    +${prop.name} ${propType}`);
    });

    // 添加方法
    const methods = interfaceSymbol.methods?.slice(0, 6) || [];
    methods.forEach((method: any) => {
      const returnType = this.getSimpleType(this.extractReturnType(method.returnType));
      lines.push(`    +${method.name}() ${returnType}`);
    });

    lines.push('  }');
    
    return lines;
  }
  
  /**
   * 生成简单类关系
   */
  private generateSimpleClassRelationships(result: AnalysisResult): string[] {
    const relationships: string[] = [];
    
    result.symbols.forEach(symbol => {
      if (symbol.type === 'class') {
        const classSymbol = symbol as any;
        const className = this.sanitizeClassName(classSymbol.name);
        
        // 继承关系
        classSymbol.extends?.forEach((parent: string) => {
          const parentName = this.sanitizeClassName(parent.trim());
          relationships.push(`  ${parentName} <|-- ${className}`);
        });

        // 实现关系
        classSymbol.implements?.forEach((iface: string) => {
          const interfaceName = this.sanitizeClassName(iface.trim());
          relationships.push(`  ${interfaceName} <|.. ${className}`);
        });
      }
    });

    return relationships;
  }
  
  /**
   * 清理类名
   */
  private sanitizeClassName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  /**
   * 获取简单类型
   */
  private getSimpleType(typeStr?: string): string {
    if (!typeStr) return '';
    
    // 基本类型映射
    const typeMap: { [key: string]: string } = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'void': 'void',
      'Date': 'Date'
    };
    
    // 如果是基本类型，直接返回
    if (typeMap[typeStr]) {
      return typeMap[typeStr];
    }
    
    // 处理数组类型
    if (typeStr.endsWith('[]')) {
      const baseType = typeStr.replace('[]', '');
      return this.getSimpleType(baseType) + '[]';
    }
    
    // 处理泛型（简化为基本形式）
    if (typeStr.includes('<')) {
      if (typeStr.startsWith('Promise<')) {
        return 'Promise';
      }
      if (typeStr.startsWith('Map<')) {
        return 'Map';
      }
      if (typeStr.startsWith('Array<')) {
        const innerType = typeStr.match(/Array<([^>]+)>/)?.[1] || 'any';
        return this.getSimpleType(innerType) + '[]';
      }
      // 其他泛型类型，取第一部分
      return typeStr.split('<')[0];
    }
    
    // 处理联合类型，只取第一个
    if (typeStr.includes('|')) {
      return this.getSimpleType(typeStr.split('|')[0].trim());
    }
    
    // 如果包含函数签名，简化为返回类型
    if (typeStr.includes('=>')) {
      const parts = typeStr.split('=>');
      if (parts.length > 1) {
        return this.getSimpleType(parts[parts.length - 1].trim());
      }
    }
    
    // 限制长度
    if (typeStr.length > 15) {
      return typeStr.substring(0, 12) + '...';
    }
    
    return typeStr;
  }
}