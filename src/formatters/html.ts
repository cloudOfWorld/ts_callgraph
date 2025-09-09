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
        <button class="tab-button" onclick="showTab('graph')">调用图</button>
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
            <p>显示函数、方法和构造函数之间的调用关系。</p>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>调用者</th>
                        <th>被调用者</th>
                        <th>调用类型</th>
                        <th>文件</th>
                        <th>位置</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.callRelations.map(call => `
                        <tr>
                            <td>${this.escapeHtml(call.caller)}</td>
                            <td>${this.escapeHtml(call.callee)}</td>
                            <td><span class="symbol-type ${call.callType}">${call.callType}</span></td>
                            <td title="${call.location.filePath}">
                                ${path.basename(call.location.filePath)}
                            </td>
                            <td>${call.location.start.line}:${call.location.start.column}</td>
                        </tr>
                    `).join('')}
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
        <h2>调用图可视化</h2>
        
        <div class="controls">
            <div class="control-group">
                <label>布局:</label>
                <select id="graph-layout">
                    <option value="force">力导向布局</option>
                    <option value="hierarchy">层次布局</option>
                    <option value="circular">环形布局</option>
                </select>
            </div>
            <div class="control-group">
                <label>节点大小:</label>
                <input type="range" id="node-size" min="5" max="20" value="10">
            </div>
        </div>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background: #1f77b4"></div>
                <span>类</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ff7f0e"></div>
                <span>函数</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #2ca02c"></div>
                <span>方法</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #d62728"></div>
                <span>属性</span>
            </div>
        </div>

        <div class="graph-container">
            <svg id="call-graph"></svg>
            <div class="node-info" id="node-info"></div>
        </div>
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
    
    classes.forEach(cls => {
      const className = this.cleanId(cls.name);
      
      if (cls.type === 'interface') {
        diagram += `  class ${className}{\n`;
        diagram += `    <<interface>>\n`;
      } else {
        diagram += `  class ${className}{\n`;
      }

      // 添加属性和方法
      if (cls.type === 'class') {
        const classSymbol = cls as any;
        
        classSymbol.properties?.forEach((prop: any) => {
          const visibility = this.getMermaidVisibility(prop.accessibility);
          diagram += `    ${visibility}${prop.name}\n`;
        });

        classSymbol.methods?.forEach((method: any) => {
          const visibility = this.getMermaidVisibility(method.accessibility);
          const params = method.parameters?.map((p: any) => p.name).join(', ') || '';
          diagram += `    ${visibility}${method.name}(${params})\n`;
        });
      }

      diagram += '  }\n';
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
   * 生成JavaScript代码
   */
  private getJavaScript(result: AnalysisResult): string {
    return `
        // 全局数据
        const analysisData = ${JSON.stringify(result)};
        
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
                setTimeout(renderCallGraph, 100);
            } else if (tabName === 'class-diagram') {
                setTimeout(renderMermaid, 100);
            }
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
            if (!container || container.hasChildNodes()) return;
            
            const width = container.clientWidth || 800;
            const height = container.clientHeight || 600;
            
            // 清空容器
            d3.select(container).selectAll('*').remove();
            
            const svg = d3.select(container)
                .attr('width', width)
                .attr('height', height);
                
            // 创建节点和链接数据
            const nodes = analysisData.symbols.map(symbol => ({
                id: symbol.id,
                name: symbol.name,
                type: symbol.type,
                group: symbol.type
            }));
            
            const links = analysisData.callRelations.map(call => ({
                source: analysisData.symbols.find(s => s.name === call.caller)?.id,
                target: analysisData.symbols.find(s => s.name === call.callee)?.id,
                type: call.callType
            })).filter(link => link.source && link.target);
            
            // 颜色映射
            const color = d3.scaleOrdinal()
                .domain(['class', 'interface', 'function', 'method', 'property', 'variable'])
                .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']);
            
            // 创建力导向模拟
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2));
            
            // 添加链接
            const link = svg.append('g')
                .selectAll('line')
                .data(links)
                .join('line')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', 2);
            
            // 添加节点
            const node = svg.append('g')
                .selectAll('circle')
                .data(nodes)
                .join('circle')
                .attr('r', 8)
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
                .attr('font-size', 12)
                .attr('font-family', 'Arial')
                .attr('text-anchor', 'middle')
                .attr('dy', 25);
            
            // 鼠标事件
            node.on('mouseover', function(event, d) {
                const nodeInfo = document.getElementById('node-info');
                nodeInfo.innerHTML = \`
                    <strong>\${d.name}</strong><br>
                    类型: \${d.type}<br>
                    ID: \${d.id}
                \`;
                nodeInfo.style.display = 'block';
            }).on('mouseout', function() {
                document.getElementById('node-info').style.display = 'none';
            });
            
            // 更新位置
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                    
                label
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
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
        }

        // 渲染Mermaid图表
        function renderMermaid() {
            mermaid.initialize({ startOnLoad: true });
            mermaid.init(undefined, document.querySelector('#class-mermaid'));
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