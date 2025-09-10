import { AnalysisResult } from '../types';
import { BaseFormatter } from './base';
import * as path from 'path';

/**
 * HTML 格式化器 - 生成交互式可视化界面
 */
export class HtmlFormatter extends BaseFormatter {
  /**
   * 格式化为HTML报告
   */
  format(result: AnalysisResult): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeScript Call Graph Analysis Report</title>
    <style>
        ${this.getStyles()}
    </style>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        /* D3.js 交互式图表样式 - 基于TS-Call-Graph思想 */
        .force-graph {
            width: 100%;
            height: 600px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .node {
            cursor: pointer;
            stroke-width: 2px;
            transition: all 0.3s ease;
        }
        
        .node.class { fill: #667eea; stroke: #4c63d2; }
        .node.function { fill: #10b981; stroke: #059669; }
        .node.method { fill: #f59e0b; stroke: #d97706; }
        .node.interface { fill: #8b5cf6; stroke: #7c3aed; }
        
        .node.private { stroke: #ef4444; stroke-width: 3px; }
        .node.protected { stroke: #f97316; stroke-width: 3px; }
        .node.public { stroke: #22c55e; }
        
        .node:hover {
            stroke-width: 4px;
            filter: brightness(1.2);
        }
        
        .link {
            stroke: #4b5563;
            stroke-width: 1.5px;
            fill: none;
            opacity: 0.6;
        }
        
        .link.highlighted {
            stroke: #667eea;
            stroke-width: 3px;
            opacity: 1;
        }
        
        .node-label {
            font-size: 12px;
            fill: #e4e4e7;
            text-anchor: middle;
            pointer-events: none;
            font-weight: 500;
        }
        
        .graph-controls {
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .control-group label {
            font-size: 0.9rem;
            color: #a1a1aa;
        }
        
        .control-group input[type="range"] {
            width: 150px;
        }
        
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 0.75rem;
            border-radius: 6px;
            font-size: 0.9rem;
            pointer-events: none;
            z-index: 1000;
            max-width: 300px;
            border: 1px solid #333;
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>TypeScript 调用图分析报告</h1>
        <div class="metadata">
            <span>生成时间: ${result.metadata.analysisDate.toLocaleString('zh-CN')}</span>
            <span>文件数: ${result.metadata.totalFiles}</span>
            <span>符号数: ${result.metadata.totalSymbols}</span>
            <span>调用关系: ${result.metadata.totalCallRelations}</span>
        </div>
    </header>

    <nav class="tabs">
        <button class="tab-button active" onclick="showTab('overview')">概览</button>
        <button class="tab-button" onclick="showTab('symbols')">符号</button>
        <button class="tab-button" onclick="showTab('calls')">调用关系</button>
        <button class="tab-button" onclick="showTab('imports')">导入关系</button>
        <button class="tab-button" onclick="showTab('graph')">D3.js交互图</button>
        <button class="tab-button" onclick="showTab('class-diagram')">类图</button>
    </nav>

    <main class="content">
        ${this.generateOverviewTab(result)}
        ${this.generateSymbolsTab(result)}
        ${this.generateCallsTab(result)}
        ${this.generateImportsTab(result)}
        ${this.generateGraphTab(result)}
        ${this.generateClassDiagramTab(result)}
    </main>

    <script>
        ${this.getJavaScript(result)}
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * 生成CSS样式
   */
  private getStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .metadata {
            display: flex;
            justify-content: center;
            gap: 2rem;
            font-size: 1.1rem;
        }

        .tabs {
            background: white;
            display: flex;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        }

        .tab-button {
            background: none;
            border: none;
            padding: 1rem 2rem;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 1rem;
            white-space: nowrap;
        }

        .tab-button:hover {
            background: #f0f0f0;
        }

        .tab-button.active {
            background: #667eea;
            color: white;
        }

        .content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .tab-content {
            display: none;
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .tab-content.active {
            display: block;
        }

        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card h3 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }

        .table-container {
            overflow-x: auto;
            margin: 1rem 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }

        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .symbol-type {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .symbol-type.class {
            background: #e3f2fd;
            color: #1565c0;
        }

        .symbol-type.interface {
            background: #f3e5f5;
            color: #7b1fa2;
        }

        .symbol-type.function {
            background: #e8f5e8;
            color: #2e7d32;
        }

        .symbol-type.method {
            background: #fff3e0;
            color: #f57c00;
        }

        .symbol-type.property {
            background: #fce4ec;
            color: #c2185b;
        }

        .symbol-type.variable {
            background: #f1f8e9;
            color: #558b2f;
        }

        .visibility {
            font-family: monospace;
            font-weight: bold;
        }

        .visibility.private {
            color: #d32f2f;
        }

        .visibility.protected {
            color: #f57c00;
        }

        .visibility.public {
            color: #388e3c;
        }

        .graph-container {
            width: 100%;
            height: 600px;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
        }

        .mermaid-container {
            width: 100%;
            height: 500px;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: auto;
            background: white;
        }

        .controls {
            margin-bottom: 1rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        select, input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .filter-info {
            background: #e3f2fd;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }

        .node-info {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 1rem;
            border-radius: 4px;
            display: none;
            max-width: 300px;
        }

        .legend {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 2px;
        }

        .class-name {
            background: #e8f4fd;
            color: #1565c0;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: 500;
        }
    `;
  }

  /**
   * 生成概览标签页
   */
  private generateOverviewTab(result: AnalysisResult): string {
    const stats = this.generateStatistics(result);
    
    return `
    <div id="overview" class="tab-content active">
        <h2>项目概览</h2>
        
        <div class="stat-grid">
            <div class="stat-card">
                <h3>${result.files.length}</h3>
                <p>TypeScript 文件</p>
            </div>
            <div class="stat-card">
                <h3>${result.symbols.length}</h3>
                <p>总符号数</p>
            </div>
            <div class="stat-card">
                <h3>${result.callRelations.length}</h3>
                <p>调用关系</p>
            </div>
            <div class="stat-card">
                <h3>${result.importRelations.length}</h3>
                <p>导入关系</p>
            </div>
        </div>

        <h3>符号类型分布</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>类型</th>
                        <th>数量</th>
                        <th>百分比</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(stats.symbolsByType).map(([type, count]) => `
                        <tr>
                            <td><span class="symbol-type ${type}">${type}</span></td>
                            <td>${count}</td>
                            <td>${((count / result.symbols.length) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <h3>文件列表</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>文件路径</th>
                        <th>符号数量</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.files.map(file => {
                        const symbolCount = result.symbols.filter(s => s.location.filePath === file).length;
                        const fileName = path.basename(file);
                        return `
                            <tr>
                                <td title="${file}">${fileName}</td>
                                <td>${symbolCount}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
  }

  /**
   * 生成符号标签页
   */
  private generateSymbolsTab(result: AnalysisResult): string {
    return `
    <div id="symbols" class="tab-content">
        <h2>符号列表</h2>
        
        <div class="controls">
            <div class="control-group">
                <label>类型过滤:</label>
                <select id="symbol-type-filter">
                    <option value="">全部</option>
                    <option value="class">类</option>
                    <option value="interface">接口</option>
                    <option value="function">函数</option>
                    <option value="method">方法</option>
                    <option value="property">属性</option>
                    <option value="variable">变量</option>
                </select>
            </div>
            <div class="control-group">
                <label>搜索:</label>
                <input type="text" id="symbol-search" placeholder="搜索符号名称...">
            </div>
        </div>

        <div class="table-container">
            <table id="symbols-table">
                <thead>
                    <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>可见性</th>
                        <th>文件</th>
                        <th>位置</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.symbols.map(symbol => `
                        <tr data-type="${symbol.type}">
                            <td>${this.escapeHtml(symbol.name)}</td>
                            <td><span class="symbol-type ${symbol.type}">${symbol.type}</span></td>
                            <td>
                                ${this.getVisibilityBadge(symbol)}
                            </td>
                            <td title="${symbol.location.filePath}">
                                ${path.basename(symbol.location.filePath)}
                            </td>
                            <td>${symbol.location.start.line}:${symbol.location.start.column}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
  }

  /**
   * 生成调用关系标签页
   */
  private generateCallsTab(result: AnalysisResult): string {
    return `
    <div id="calls" class="tab-content">
        <h2>调用关系</h2>
        
        <div class="filter-info">
            <p>显示函数、方法和构造函数之间的调用关系，包含调用者所属类和文件信息。</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>调用者</th>
                        <th>调用者类</th>
                        <th>被调用者</th>
                        <th>被调用者类</th>
                        <th>调用类型</th>
                        <th>文件</th>
                        <th>位置</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.callRelations.map(call => {
                      // 处理新旧格式兼容性
                      const callerName = typeof call.caller === 'string' ? call.caller : call.caller.name;
                      const calleeName = typeof call.callee === 'string' ? call.callee : call.callee.name;
                      const callerClass = typeof call.caller === 'string' ? '' : (call.caller.className || '');
                      const calleeClass = typeof call.callee === 'string' ? '' : (call.callee.className || '');
                      const callerFile = typeof call.caller === 'string' ? '' : (call.caller.filePath ? path.basename(call.caller.filePath) : '');
                      const calleeFile = typeof call.callee === 'string' ? '' : (call.callee.filePath ? path.basename(call.callee.filePath) : '');
                      
                      return `
                        <tr>
                            <td title="${callerFile}">${this.escapeHtml(callerName)}</td>
                            <td>${callerClass ? `<span class="class-name">${this.escapeHtml(callerClass)}</span>` : '-'}</td>
                            <td title="${calleeFile}">${this.escapeHtml(calleeName)}</td>
                            <td>${calleeClass ? `<span class="class-name">${this.escapeHtml(calleeClass)}</span>` : '-'}</td>
                            <td><span class="symbol-type ${call.callType}">${call.callType}</span></td>
                            <td title="${call.location.filePath}">
                                ${path.basename(call.location.filePath)}
                            </td>
                            <td>${call.location.start.line}:${call.location.start.column}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
  }

  /**
   * 生成导入关系标签页
   */
  private generateImportsTab(result: AnalysisResult): string {
    return `
    <div id="imports" class="tab-content">
        <h2>导入关系</h2>
        
        <div class="filter-info">
            <p>显示文件之间的导入依赖关系。</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>导入者</th>
                        <th>被导入者</th>
                        <th>导入类型</th>
                        <th>导入名称</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.importRelations.map(imp => `
                        <tr>
                            <td title="${imp.importer}">
                                ${path.basename(imp.importer)}
                            </td>
                            <td>${this.escapeHtml(imp.imported)}</td>
                            <td><span class="symbol-type ${imp.importType}">${imp.importType}</span></td>
                            <td>${imp.importName || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
  }

  /**
   * 生成调用图标签页
   */
  private generateGraphTab(result: AnalysisResult): string {
    return `
    <div id="graph" class="tab-content">
        <h2>D3.js 交互式调用图 - 基于TS-Call-Graph的力导向布局</h2>
        
        <div class="graph-controls">
            <div class="control-group">
                <label>引力强度</label>
                <input type="range" id="gravity-slider" min="-1000" max="-50" value="-300">
                <span id="gravity-value">-300</span>
            </div>
            
            <div class="control-group">
                <label>链接距离</label>
                <input type="range" id="distance-slider" min="30" max="200" value="100">
                <span id="distance-value">100</span>
            </div>
            
            <div class="control-group">
                <label>节点排斥力</label>
                <input type="range" id="charge-slider" min="-1000" max="-50" value="-300">
                <span id="charge-value">-300</span>
            </div>
            
            <div class="control-group">
                <label>节点类型过滤</label>
                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                    <label><input type="checkbox" checked data-filter="class"> 类</label>
                    <label><input type="checkbox" checked data-filter="function"> 函数</label>
                    <label><input type="checkbox" checked data-filter="method"> 方法</label>
                    <label><input type="checkbox" checked data-filter="interface"> 接口</label>
                </div>
            </div>
            
            <div class="control-group">
                <label>可见性过滤</label>
                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                    <label><input type="checkbox" checked data-visibility="public"> Public</label>
                    <label><input type="checkbox" checked data-visibility="private"> Private</label>
                    <label><input type="checkbox" checked data-visibility="protected"> Protected</label>
                </div>
            </div>
        </div>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color node class"></div>
                <span>类 (蓝色)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color node function"></div>
                <span>函数 (绿色)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color node method"></div>
                <span>方法 (橙色)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color node interface"></div>
                <span>接口 (紫色)</span>
            </div>
        </div>

        <div id="force-graph" class="force-graph"></div>
        <div id="graph-tooltip" class="tooltip" style="display: none;"></div>
    </div>`;
  }

  /**
   * 生成类图标签页
   */
  private generateClassDiagramTab(result: AnalysisResult): string {
    return `
    <div id="class-diagram" class="tab-content">
        <h2>类图</h2>
        
        <div class="filter-info">
            <p>显示类和接口的结构以及它们之间的关系。</p>
        </div>

        <div class="mermaid-container">
            <div class="mermaid" id="class-mermaid">
                ${this.generateMermaidClassDiagram(result)}
            </div>
        </div>
    </div>`;
  }

  /**
   * 生成Mermaid类图
   */
  private generateMermaidClassDiagram(result: AnalysisResult): string {
    const classes = result.symbols.filter(s => s.type === 'class' || s.type === 'interface');
    
    let diagram = 'classDiagram\n';
    
    // 为每个类/接口生成定义
    classes.forEach(cls => {
      const className = this.sanitizeClassName(cls.name);
      
      if (cls.type === 'interface') {
        diagram += `  class ${className} {\n`;
        diagram += `    <<interface>>\n`;
      } else {
        diagram += `  class ${className} {\n`;
      }

      // 添加属性（限制数量避免过于复杂）
      if (cls.type === 'class') {
        const classSymbol = cls as any;
        
        const properties = classSymbol.properties?.slice(0, 8) || [];
        properties.forEach((prop: any) => {
          const visibility = this.getMermaidVisibility(prop.accessibility);
          const propName = this.sanitizeName(prop.name);
          const propType = this.getSimpleMermaidType(prop.propertyType);
          const staticMark = prop.isStatic ? '$' : '';
          
          if (propType) {
            diagram += `    ${visibility}${propName}${staticMark} ${propType}\n`;
          } else {
            diagram += `    ${visibility}${propName}${staticMark}\n`;
          }
        });

        const methods = classSymbol.methods?.slice(0, 8) || [];
        methods.forEach((method: any) => {
          const visibility = this.getMermaidVisibility(method.accessibility);
          const methodName = this.sanitizeName(method.name);
          const staticMark = method.isStatic ? '$' : '';
          const abstractMark = method.isAbstract ? '*' : '';
          const returnType = this.getSimpleMermaidType(this.extractMethodReturnType(method.returnType));
          
          if (returnType) {
            diagram += `    ${visibility}${methodName}()${staticMark}${abstractMark} ${returnType}\n`;
          } else {
            diagram += `    ${visibility}${methodName}()${staticMark}${abstractMark}\n`;
          }
        });
      } else if (cls.type === 'interface') {
        // 接口属性和方法
        const interfaceSymbol = cls as any;
        
        const properties = interfaceSymbol.properties?.slice(0, 6) || [];
        properties.forEach((prop: any) => {
          const propName = this.sanitizeName(prop.name);
          const propType = this.getSimpleMermaidType(prop.propertyType);
          
          if (propType) {
            diagram += `    +${propName} ${propType}\n`;
          } else {
            diagram += `    +${propName}\n`;
          }
        });

        const methods = interfaceSymbol.methods?.slice(0, 6) || [];
        methods.forEach((method: any) => {
          const methodName = this.sanitizeName(method.name);
          const returnType = this.getSimpleMermaidType(this.extractMethodReturnType(method.returnType));
          
          if (returnType) {
            diagram += `    +${methodName}() ${returnType}\n`;
          } else {
            diagram += `    +${methodName}()\n`;
          }
        });
      }

      diagram += '  }\n';
    });
    
    // 添加类之间的关系
    classes.forEach(cls => {
      if (cls.type === 'class') {
        const classSymbol = cls as any;
        const className = this.sanitizeClassName(cls.name);
        
        // 继承关系
        classSymbol.extends?.forEach((parent: string) => {
          const parentName = this.sanitizeClassName(parent.trim());
          diagram += `  ${parentName} <|-- ${className}\n`;
        });

        // 实现关系
        classSymbol.implements?.forEach((iface: string) => {
          const interfaceName = this.sanitizeClassName(iface.trim());
          diagram += `  ${interfaceName} <|.. ${className}\n`;
        });
      }
    });

    return diagram;
  }

  /**
   * 获取Mermaid可见性符号
   */
  private getMermaidVisibility(accessibility?: string): string {
    switch (accessibility) {
      case 'private': return '-';
      case 'protected': return '#';
      case 'public': return '+';
      default: return '+';
    }
  }
  
  /**
   * 清理类名称
   */
  private sanitizeClassName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  /**
   * 清理名称
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  
  /**
   * 获取简单的Mermaid类型
   */
  private getSimpleMermaidType(typeStr?: string): string {
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
      return this.getSimpleMermaidType(baseType) + '[]';
    }
    
    // 处理复杂类型
    if (typeStr.includes('<') || typeStr.includes('|') || typeStr.includes('&')) {
      // 提取第一个类型名
      const firstType = typeStr.split(/[<|&]/)[0].trim();
      return firstType.length > 15 ? firstType.substring(0, 12) + '...' : firstType;
    }
    
    // 限制长度
    return typeStr.length > 15 ? typeStr.substring(0, 12) + '...' : typeStr;
  }
  
  /**
   * 提取方法返回类型
   */
  private extractMethodReturnType(returnTypeStr?: string): string {
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
   * 生成JavaScript代码
   */
  private getJavaScript(result: AnalysisResult): string {
    return `
        // 全局数据
        const analysisData = ${JSON.stringify(result)};
        
        // 类型过滤器和可见性过滤器状态
        const filterState = {
            types: new Set(['class', 'function', 'method', 'interface']),
            visibility: new Set(['public', 'private', 'protected']),
            graphParams: {
                gravity: -300,
                distance: 100,
                charge: -300
            }
        };
        
        // 初始化增强的控制功能
        document.addEventListener('DOMContentLoaded', function() {
            setupEnhancedControls();
        });
        
        function setupEnhancedControls() {
            // 节点类型过滤器
            const typeFilters = document.querySelectorAll('[data-filter]');
            typeFilters.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const filterType = e.target.dataset.filter;
                    if (e.target.checked) {
                        filterState.types.add(filterType);
                    } else {
                        filterState.types.delete(filterType);
                    }
                    updateInteractiveGraph();
                });
            });
            
            // 可见性过滤器
            const visibilityFilters = document.querySelectorAll('[data-visibility]');
            visibilityFilters.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const visibility = e.target.dataset.visibility;
                    if (e.target.checked) {
                        filterState.visibility.add(visibility);
                    } else {
                        filterState.visibility.delete(visibility);
                    }
                    updateInteractiveGraph();
                });
            });
            
            // 图形参数滑块
            const gravitySlider = document.getElementById('gravity-slider');
            const distanceSlider = document.getElementById('distance-slider');
            const chargeSlider = document.getElementById('charge-slider');
            
            if (gravitySlider) {
                gravitySlider.addEventListener('input', (e) => {
                    filterState.graphParams.gravity = parseInt(e.target.value);
                    document.getElementById('gravity-value').textContent = e.target.value;
                    updateInteractiveGraph();
                });
            }
            
            if (distanceSlider) {
                distanceSlider.addEventListener('input', (e) => {
                    filterState.graphParams.distance = parseInt(e.target.value);
                    document.getElementById('distance-value').textContent = e.target.value;
                    updateInteractiveGraph();
                });
            }
            
            if (chargeSlider) {
                chargeSlider.addEventListener('input', (e) => {
                    filterState.graphParams.charge = parseInt(e.target.value);
                    document.getElementById('charge-value').textContent = e.target.value;
                    updateInteractiveGraph();
                });
            }
        }
        
        // 增强的交互式图表更新函数
        function updateInteractiveGraph() {
            if (document.getElementById('graph').classList.contains('active')) {
                renderInteractiveGraph();
            }
        }
        
        // 标签切换
        function showTab(tabName) {
            // 隐藏所有标签内容
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // 移除所有标签按钮的active类
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 显示选中的标签
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // 特殊处理
            if (tabName === 'graph') {
                setTimeout(renderInteractiveGraph, 100);
            } else if (tabName === 'class-diagram') {
                setTimeout(renderMermaid, 100);
            }
        }
        
        // 基于TS-Call-Graph的交互式力导向图
        function renderInteractiveGraph() {
            const container = document.getElementById('force-graph');
            if (!container) return;
            
            // 清空容器
            d3.select(container).selectAll('*').remove();
            
            const width = container.clientWidth || 900;
            const height = container.clientHeight || 600;
            
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background', '#0a0a0a');
                
            // 根据过滤器创建节点数据
            const nodes = analysisData.symbols
                .filter(symbol => filterState.types.has(symbol.type))
                .filter(symbol => !symbol.visibility || filterState.visibility.has(symbol.visibility))
                .map(symbol => ({
                    id: symbol.id,
                    name: symbol.name,
                    type: symbol.type,
                    visibility: symbol.visibility || 'public',
                    location: symbol.location,
                    x: Math.random() * width,
                    y: Math.random() * height
                }));
                
            // 创建链接数据
            const nodeMap = new Map();
            nodes.forEach(node => {
                nodeMap.set(node.id, node);
                nodeMap.set(node.name, node);
            });
            
            const links = analysisData.callRelations
                .map(rel => {
                    const sourceNode = nodeMap.get(rel.caller?.id) || nodeMap.get(rel.caller?.name);
                    const targetNode = nodeMap.get(rel.callee?.id) || nodeMap.get(rel.callee?.name);
                    
                    if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
                        return {
                            source: sourceNode.id,
                            target: targetNode.id,
                            type: rel.callType
                        };
                    }
                    return null;
                })
                .filter(link => link !== null);
            
            console.log('交互式图表: ' + nodes.length + ' 个节点, ' + links.length + ' 个链接');
            
            if (nodes.length === 0) {
                svg.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#e4e4e7')
                    .attr('font-size', 16)
                    .text('没有符合过滤条件的数据');
                return;
            }
            
            // 力仿真 - 使用自定义参数
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(filterState.graphParams.distance))
                .force('charge', d3.forceManyBody().strength(filterState.graphParams.charge))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide(25));
            
            // 添加箭头标记
            const defs = svg.append('defs');
            defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 20)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .append('path')
                .attr('d', 'M 0,-5 L 10,0 L 0,5')
                .attr('fill', '#4b5563');
            
            // 创建链接
            const link = svg.append('g')
                .selectAll('line')
                .data(links)
                .enter().append('line')
                .attr('class', 'link')
                .attr('marker-end', 'url(#arrowhead)');
            
            // 创建节点
            const node = svg.append('g')
                .selectAll('circle')
                .data(nodes)
                .enter().append('circle')
                .attr('class', d => \`node \${d.type} \${d.visibility}\`)
                .attr('r', d => getNodeRadius(d.type))
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended))
                .on('click', (event, d) => {
                    selectNode(d, event);
                })
                .on('mouseover', (event, d) => {
                    showTooltip(event, d);
                    highlightConnections(d, nodes, links, node, link);
                })
                .on('mouseout', () => {
                    hideTooltip();
                    resetHighlight(node, link);
                });
            
            // 创建标签
            const labels = svg.append('g')
                .selectAll('text')
                .data(nodes)
                .enter().append('text')
                .attr('class', 'node-label')
                .text(d => d.name.length > 12 ? d.name.substring(0, 10) + '...' : d.name);
            
            // 更新位置
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => Math.max(20, Math.min(width - 20, d.x)))
                    .attr('cy', d => Math.max(20, Math.min(height - 20, d.y)));
                
                labels
                    .attr('x', d => Math.max(20, Math.min(width - 20, d.x)))
                    .attr('y', d => Math.max(20, Math.min(height - 20, d.y)) + 30);
            });
            
            // 拖拽事件
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            
            // 节点选中事件
            function selectNode(d, event) {
                // 移除所有选中状态
                node.classed('selected', false);
                
                // 选中当前节点
                d3.select(event.target).classed('selected', true);
                
                // 显示详细信息
                showNodeDetails(d);
            }
            
            // 高亮连接
            function highlightConnections(selectedNode, allNodes, allLinks, nodeSelection, linkSelection) {
                const connectedNodes = new Set([selectedNode.id]);
                
                allLinks.forEach(link => {
                    if (link.source.id === selectedNode.id || link.target.id === selectedNode.id) {
                        connectedNodes.add(link.source.id);
                        connectedNodes.add(link.target.id);
                    }
                });
                
                nodeSelection.style('opacity', d => connectedNodes.has(d.id) ? 1 : 0.3);
                linkSelection.classed('highlighted', l => 
                    l.source.id === selectedNode.id || l.target.id === selectedNode.id
                ).style('opacity', l => 
                    l.source.id === selectedNode.id || l.target.id === selectedNode.id ? 1 : 0.1
                );
            }
            
            // 重置高亮
            function resetHighlight(nodeSelection, linkSelection) {
                nodeSelection.style('opacity', 1);
                linkSelection.classed('highlighted', false).style('opacity', 0.6);
            }
        }
        
        // 节点半径获取函数
        function getNodeRadius(type) {
            switch(type) {
                case 'class': return 18;
                case 'interface': return 16;
                case 'function': return 14;
                case 'method': return 12;
                default: return 10;
            }
        }
        
        // 显示工具提示
        function showTooltip(event, d) {
            const tooltip = document.getElementById('graph-tooltip');
            if (!tooltip) return;
            
            tooltip.innerHTML = \`
                <strong>\${d.name}</strong><br>
                <em>\${d.type}</em><br>
                可见性: \${d.visibility}<br>
                文件: \${d.location.filePath.split('/').pop()}<br>
                行号: \${d.location.start.line}
            \`;
            
            tooltip.style.display = 'block';
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        }
        
        // 隐藏工具提示
        function hideTooltip() {
            const tooltip = document.getElementById('graph-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        }
        
        // 显示节点详细信息
        function showNodeDetails(d) {
            console.log('选中节点:', d);
            // 这里可以添加更多的节点详细信息显示逻辑
        }

        // 符号过滤
        function setupSymbolFilters() {
            const typeFilter = document.getElementById('symbol-type-filter');
            const searchInput = document.getElementById('symbol-search');
            const table = document.getElementById('symbols-table');
            
            function filterSymbols() {
                const typeValue = typeFilter.value.toLowerCase();
                const searchValue = searchInput.value.toLowerCase();
                const rows = table.getElementsByTagName('tr');
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const type = row.getAttribute('data-type');
                    const name = row.cells[0].textContent.toLowerCase();
                    
                    const typeMatch = !typeValue || type === typeValue;
                    const nameMatch = !searchValue || name.includes(searchValue);
                    
                    row.style.display = typeMatch && nameMatch ? '' : 'none';
                }
            }
            
            typeFilter.addEventListener('change', filterSymbols);
            searchInput.addEventListener('input', filterSymbols);
        }

        // 渲染调用图
        function renderCallGraph() {
            const container = document.getElementById('call-graph');
            if (!container) return;
            
            // 清空容器
            d3.select(container).selectAll('*').remove();
            
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 600;
            
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height);
                
            // 创建节点数据（只包含参与调用关系的符号）
            const participatingSymbols = new Set();
            
            // 从调用关系中提取参与的符号
            analysisData.callRelations.forEach(call => {
                if (call.caller) {
                    if (call.caller.id) participatingSymbols.add(call.caller.id);
                    if (call.caller.name) participatingSymbols.add(call.caller.name);
                }
                if (call.callee) {
                    if (call.callee.id) participatingSymbols.add(call.callee.id);
                    if (call.callee.name) participatingSymbols.add(call.callee.name);
                }
            });
            
            // 创建节点映射
            const nodeMap = new Map();
            const nodes = [];
            
            // 添加所有符号作为节点
            analysisData.symbols.forEach(symbol => {
                if (participatingSymbols.has(symbol.id) || participatingSymbols.has(symbol.name)) {
                    const node = {
                        id: symbol.id,
                        name: symbol.name,
                        type: symbol.type,
                        group: symbol.type,
                        fullName: symbol.name + (symbol.type ? ' (' + symbol.type + ')' : '')
                    };
                    nodes.push(node);
                    nodeMap.set(symbol.id, node);
                    nodeMap.set(symbol.name, node);
                }
            });
            
            // 如果没有参与调用的符号，添加前20个符号
            if (nodes.length === 0) {
                analysisData.symbols.slice(0, 20).forEach(symbol => {
                    const node = {
                        id: symbol.id,
                        name: symbol.name,
                        type: symbol.type,
                        group: symbol.type,
                        fullName: symbol.name + (symbol.type ? ' (' + symbol.type + ')' : '')
                    };
                    nodes.push(node);
                    nodeMap.set(symbol.id, node);
                    nodeMap.set(symbol.name, node);
                });
            }
            
            // 创建链接数据
            const links = [];
            analysisData.callRelations.forEach(call => {
                let sourceNode = null;
                let targetNode = null;
                
                // 查找调用者节点
                if (call.caller) {
                    if (call.caller.id) {
                        sourceNode = nodeMap.get(call.caller.id);
                    }
                    if (!sourceNode && call.caller.name) {
                        sourceNode = nodeMap.get(call.caller.name);
                    }
                }
                
                // 查找被调用者节点
                if (call.callee) {
                    if (call.callee.id) {
                        targetNode = nodeMap.get(call.callee.id);
                    }
                    if (!targetNode && call.callee.name) {
                        targetNode = nodeMap.get(call.callee.name);
                    }
                }
                
                if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
                    links.push({
                        source: sourceNode.id,
                        target: targetNode.id,
                        type: call.callType,
                        callType: call.callType
                    });
                }
            });
            
            console.log('调用图数据: ' + nodes.length + ' 个节点, ' + links.length + ' 个链接');
            
            // 如果没有数据，显示提示
            if (nodes.length === 0) {
                svg.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 16)
                    .text('没有找到调用关系数据');
                return;
            }
            
            // 颜色映射
            const color = d3.scaleOrdinal()
                .domain(['class', 'interface', 'function', 'method', 'property', 'variable', 'constructor'])
                .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#17becf']);
            
            // 创建力导向模拟
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(30));
            
            // 添加箭头标记
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 18)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#999')
                .style('stroke', 'none');
            
            // 添加链接
            const link = svg.append('g')
                .selectAll('line')
                .data(links)
                .join('line')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => d.type === 'method' ? 3 : 2)
                .attr('marker-end', 'url(#arrowhead)');
            
            // 获取节点大小控制器的值
            function getNodeSize() {
                const sizeSlider = document.getElementById('node-size');
                return sizeSlider ? parseInt(sizeSlider.value) : 10;
            }
            
            // 添加节点
            const node = svg.append('g')
                .selectAll('circle')
                .data(nodes)
                .join('circle')
                .attr('r', getNodeSize)
                .attr('fill', d => color(d.type))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));
            
            // 添加标签
            const label = svg.append('g')
                .selectAll('text')
                .data(nodes)
                .join('text')
                .text(d => d.name)
                .attr('font-size', 10)
                .attr('font-family', 'Arial')
                .attr('text-anchor', 'middle')
                .attr('dy', d => getNodeSize() + 15)
                .attr('fill', '#333');
            
            // 鼠标事件
            node.on('mouseover', function(event, d) {
                // 高亮相关节点和链接
                const relatedNodeIds = new Set();
                relatedNodeIds.add(d.id);
                
                links.forEach(link => {
                    if (link.source.id === d.id || link.target.id === d.id) {
                        relatedNodeIds.add(link.source.id);
                        relatedNodeIds.add(link.target.id);
                    }
                });
                
                node.style('opacity', n => relatedNodeIds.has(n.id) ? 1 : 0.3);
                link.style('opacity', l => 
                    (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
                );
                label.style('opacity', n => relatedNodeIds.has(n.id) ? 1 : 0.3);
                
            }).on('mouseout', function() {
                node.style('opacity', 1);
                link.style('opacity', 1);
                label.style('opacity', 1);
            });
            
            // 节点大小控制
            const nodeSizeSlider = document.getElementById('node-size');
            if (nodeSizeSlider) {
                nodeSizeSlider.addEventListener('input', function() {
                    const newSize = parseInt(this.value);
                    node.attr('r', newSize);
                    label.attr('dy', newSize + 15);
                });
            }
            
            // 更新位置
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => Math.max(getNodeSize(), Math.min(width - getNodeSize(), d.x)))
                    .attr('cy', d => Math.max(getNodeSize(), Math.min(height - getNodeSize(), d.y)));
                    
                label
                    .attr('x', d => Math.max(getNodeSize(), Math.min(width - getNodeSize(), d.x)))
                    .attr('y', d => Math.max(getNodeSize(), Math.min(height - getNodeSize(), d.y)));
            });
            
            // 拖拽函数
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            
            // 布局控制
            const layoutSelector = document.getElementById('graph-layout');
            if (layoutSelector) {
                layoutSelector.addEventListener('change', function() {
                    const layout = this.value;
                    simulation.stop();
                    
                    if (layout === 'hierarchy') {
                        // 层次布局
                        simulation
                            .force('link', d3.forceLink(links).id(d => d.id).distance(80))
                            .force('charge', null)
                            .force('center', d3.forceCenter(width / 2, height / 2))
                            .force('y', d3.forceY(d => d.type === 'class' ? height * 0.2 : 
                                                      d.type === 'method' ? height * 0.5 : height * 0.8).strength(0.5));
                    } else if (layout === 'circular') {
                        // 环形布局
                        nodes.forEach((d, i) => {
                            const angle = (i / nodes.length) * 2 * Math.PI;
                            const radius = Math.min(width, height) * 0.3;
                            d.fx = width / 2 + radius * Math.cos(angle);
                            d.fy = height / 2 + radius * Math.sin(angle);
                        });
                        simulation.force('charge', null);
                    } else {
                        // 力导向布局（默认）
                        nodes.forEach(d => { d.fx = null; d.fy = null; });
                        simulation
                            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
                            .force('charge', d3.forceManyBody().strength(-300))
                            .force('center', d3.forceCenter(width / 2, height / 2));
                    }
                    
                    simulation.alpha(1).restart();
                });
            }
        }

        // 渲染Mermaid图表
        function renderMermaid() {
            try {
                // 重新初始化Mermaid
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'Arial, sans-serif'
                });
                
                // 获取Mermaid容器
                const element = document.querySelector('#class-mermaid');
                if (element) {
                    // 清空容器
                    element.innerHTML = '';
                    
                    // 重新设置类名
                    element.className = 'mermaid';
                    
                    // 获取类图数据
                    const classData = analysisData.symbols.filter(s => s.type === 'class' || s.type === 'interface');
                    
                    if (classData.length === 0) {
                        element.innerHTML = '<p>没有找到类或接口数据</p>';
                        return;
                    }
                    
                    // 生成简化的Mermaid类图
                    let diagram = 'classDiagram' + '\\n';
                    
                    classData.slice(0, 10).forEach(cls => {
                        const className = cls.name.replace(/[^a-zA-Z0-9_]/g, '_');
                        
                        if (cls.type === 'interface') {
                            diagram += '  class ' + className + ' {' + '\\n';
                            diagram += '    <<interface>>' + '\\n';
                        } else {
                            diagram += '  class ' + className + ' {' + '\\n';
                        }
                        
                        // 添加主要属性和方法
                        if (cls.properties && cls.properties.length > 0) {
                            cls.properties.slice(0, 4).forEach(prop => {
                                const visibility = prop.accessibility === 'private' ? '-' : 
                                                 prop.accessibility === 'protected' ? '#' : '+';
                                const propName = prop.name.replace(/[^a-zA-Z0-9_]/g, '_');
                                diagram += '    ' + visibility + propName + '\\n';
                            });
                        }
                        
                        if (cls.methods && cls.methods.length > 0) {
                            cls.methods.slice(0, 4).forEach(method => {
                                const visibility = method.accessibility === 'private' ? '-' : 
                                                 method.accessibility === 'protected' ? '#' : '+';
                                const methodName = method.name.replace(/[^a-zA-Z0-9_]/g, '_');
                                diagram += '    ' + visibility + methodName + '()' + '\\n';
                            });
                        }
                        
                        diagram += '  }' + '\\n';
                    });
                    
                    // 添加关系
                    classData.forEach(cls => {
                        if (cls.type === 'class') {
                            const className = cls.name.replace(/[^a-zA-Z0-9_]/g, '_');
                            
                            if (cls.extends && cls.extends.length > 0) {
                                cls.extends.forEach(parent => {
                                    const parentName = parent.replace(/[^a-zA-Z0-9_]/g, '_');
                                    diagram += '  ' + parentName + ' <|-- ' + className + '\\n';
                                });
                            }
                            
                            if (cls.implements && cls.implements.length > 0) {
                                cls.implements.forEach(iface => {
                                    const interfaceName = iface.replace(/[^a-zA-Z0-9_]/g, '_');
                                    diagram += '  ' + interfaceName + ' <|.. ' + className + '\\n';
                                });
                            }
                        }
                    });
                    
                    console.log('Mermaid diagram:', diagram);
                    
                    // 设置内容
                    element.textContent = diagram;
                    
                    // 渲染
                    mermaid.init(undefined, element);
                }
            } catch (error) {
                console.error('Mermaid rendering error:', error);
                const element = document.querySelector('#class-mermaid');
                if (element) {
                    element.innerHTML = '<p style="color: red;">类图渲染失败: ' + error.message + '</p>';
                }
            }
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            setupSymbolFilters();
            
            // 初始化Mermaid
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default'
            });
        });
    `;
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(result: AnalysisResult) {
    const symbolsByType: { [key: string]: number } = {};
    const callsByType: { [key: string]: number } = {};

    result.symbols.forEach(symbol => {
      symbolsByType[symbol.type] = (symbolsByType[symbol.type] || 0) + 1;
    });

    result.callRelations.forEach(call => {
      callsByType[call.callType] = (callsByType[call.callType] || 0) + 1;
    });

    return {
      symbolsByType,
      callsByType
    };
  }

  /**
   * 获取可见性徽章
   */
  private getVisibilityBadge(symbol: any): string {
    const visibility = symbol.visibility || symbol.accessibility;
    if (!visibility) return '-';
    
    return `<span class="visibility ${visibility}">${visibility[0].toUpperCase()}</span>`;
  }

  /**
   * 转义HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}