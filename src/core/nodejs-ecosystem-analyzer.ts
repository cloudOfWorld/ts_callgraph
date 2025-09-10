import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { Symbol, ImportRelation, Location } from '../types';

/**
 * Node.js生态系统分析器
 * 基于Jelly对Node.js平台的深度支持
 */
export class NodeJSEcosystemAnalyzer {
  private static readonly NODE_CORE_MODULES = new Set([
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events',
    'stream', 'buffer', 'url', 'querystring', 'assert', 'child_process',
    'cluster', 'dns', 'net', 'readline', 'repl', 'tls', 'dgram',
    'v8', 'vm', 'zlib', 'perf_hooks', 'worker_threads', 'async_hooks'
  ]);

  private static readonly POPULAR_PACKAGES = new Map([
    // Web框架
    ['express', { category: 'web-framework', patterns: ['app.get', 'app.post', 'app.use', 'res.json'] }],
    ['koa', { category: 'web-framework', patterns: ['ctx.body', 'ctx.request', 'ctx.response'] }],
    ['fastify', { category: 'web-framework', patterns: ['fastify.register', 'reply.send'] }],
    
    // 数据库
    ['mongoose', { category: 'database', patterns: ['Schema', 'model', 'connect'] }],
    ['sequelize', { category: 'database', patterns: ['define', 'sync', 'authenticate'] }],
    ['prisma', { category: 'database', patterns: ['PrismaClient', 'findMany', 'create'] }],
    
    // 工具库
    ['lodash', { category: 'utility', patterns: ['_.map', '_.filter', '_.reduce'] }],
    ['axios', { category: 'http-client', patterns: ['axios.get', 'axios.post', 'axios.create'] }],
    ['moment', { category: 'date-time', patterns: ['moment()', '.format()', '.add()'] }],
    
    // 测试框架
    ['jest', { category: 'testing', patterns: ['describe', 'it', 'expect', 'test'] }],
    ['mocha', { category: 'testing', patterns: ['describe', 'it', 'before', 'after'] }],
    ['chai', { category: 'testing', patterns: ['expect', 'should', 'assert'] }],
    
    // 构建工具
    ['webpack', { category: 'build-tool', patterns: ['module.exports', 'plugins', 'loaders'] }],
    ['rollup', { category: 'build-tool', patterns: ['rollup.config', 'input', 'output'] }],
    ['vite', { category: 'build-tool', patterns: ['vite.config', 'defineConfig'] }],
    
    // React生态
    ['react', { category: 'ui-framework', patterns: ['useState', 'useEffect', 'createElement'] }],
    ['next', { category: 'ui-framework', patterns: ['getServerSideProps', 'getStaticProps'] }],
    ['gatsby', { category: 'ui-framework', patterns: ['graphql', 'StaticQuery'] }],
    
    // Vue生态
    ['vue', { category: 'ui-framework', patterns: ['createApp', 'ref', 'reactive'] }],
    ['nuxt', { category: 'ui-framework', patterns: ['asyncData', 'nuxtServerInit'] }],
    
    // 其他重要库
    ['socket.io', { category: 'realtime', patterns: ['io.on', 'socket.emit', 'socket.on'] }],
    ['redis', { category: 'cache', patterns: ['createClient', 'get', 'set'] }],
    ['winston', { category: 'logging', patterns: ['createLogger', 'info', 'error'] }]
  ]);

  private rootPath: string;
  private packageJsonCache: Map<string, any> = new Map();

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * 分析Node.js生态系统使用情况
   */
  analyzeEcosystem(symbols: Symbol[], importRelations: ImportRelation[]): EcosystemAnalysisResult {
    const dependencies = this.analyzeDependencies();
    const moduleUsage = this.analyzeModuleUsage(importRelations);
    const apiUsage = this.analyzeAPIUsage(symbols);
    const securityIssues = this.analyzeSecurityIssues(dependencies, symbols);
    const performanceIssues = this.analyzePerformanceIssues(symbols, apiUsage);
    
    return {
      dependencies,
      moduleUsage,
      apiUsage,
      securityIssues,
      performanceIssues,
      recommendations: this.generateEcosystemRecommendations(dependencies, moduleUsage, securityIssues)
    };
  }

  /**
   * 分析项目依赖
   */
  private analyzeDependencies(): DependencyAnalysis {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return {
        total: 0,
        production: [],
        development: [],
        coreModules: [],
        outdated: [],
        vulnerable: [],
        categories: new Map()
      };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const prodDeps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    
    // 识别Node.js核心模块使用
    const coreModules = this.identifyCoreModuleUsage();
    
    // 按类别分类依赖
    const categories = this.categorizeDependencies([...prodDeps, ...devDeps]);
    
    // 检测过时的依赖（这里简化处理）
    const outdated = this.detectOutdatedDependencies(packageJson);
    
    return {
      total: prodDeps.length + devDeps.length,
      production: prodDeps,
      development: devDeps,
      coreModules,
      outdated,
      vulnerable: [], // 需要集成安全扫描工具
      categories
    };
  }

  /**
   * 分析模块使用情况
   */
  private analyzeModuleUsage(importRelations: ImportRelation[]): ModuleUsageAnalysis {
    const usage: Map<string, ModuleUsage> = new Map();
    
    for (const relation of importRelations) {
      const moduleName = this.extractModuleName(relation.imported);
      
      if (!usage.has(moduleName)) {
        usage.set(moduleName, {
          name: moduleName,
          importCount: 0,
          importTypes: new Set(),
          files: new Set(),
          isNodeModule: relation.metadata?.isNodeModule || false,
          isCoreModule: NodeJSEcosystemAnalyzer.NODE_CORE_MODULES.has(moduleName),
          category: this.getModuleCategory(moduleName)
        });
      }
      
      const moduleUsage = usage.get(moduleName)!;
      moduleUsage.importCount++;
      moduleUsage.importTypes.add(relation.importType);
      moduleUsage.files.add(relation.importer);
    }

    return {
      modules: Array.from(usage.values()),
      topUsed: this.getTopUsedModules(usage),
      coreModuleUsage: this.getCoreModuleUsage(usage),
      thirdPartyUsage: this.getThirdPartyUsage(usage)
    };
  }

  /**
   * 分析API使用情况
   */
  private analyzeAPIUsage(symbols: Symbol[]): APIUsageAnalysis {
    const apiUsage: Map<string, APIUsage> = new Map();
    
    for (const symbol of symbols) {
      // 检测Node.js API模式
      const nodeAPIs = this.detectNodeJSAPIs(symbol);
      
      for (const api of nodeAPIs) {
        if (!apiUsage.has(api.name)) {
          apiUsage.set(api.name, {
            name: api.name,
            module: api.module,
            usageCount: 0,
            locations: [],
            patterns: [],
            isDeprecated: api.isDeprecated || false,
            securityRisk: api.securityRisk || 'low'
          });
        }
        
        const usage = apiUsage.get(api.name)!;
        usage.usageCount++;
        usage.locations.push(symbol.location);
        
        if (api.pattern) {
          usage.patterns.push(api.pattern);
        }
      }
    }

    return {
      apis: Array.from(apiUsage.values()),
      deprecatedAPIs: Array.from(apiUsage.values()).filter(api => api.isDeprecated),
      securitySensitiveAPIs: Array.from(apiUsage.values()).filter(api => api.securityRisk === 'high')
    };
  }

  /**
   * 分析安全问题
   */
  private analyzeSecurityIssues(dependencies: DependencyAnalysis, symbols: Symbol[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    // 检测危险的API使用
    const dangerousAPIs = [
      { pattern: /eval\s*\(/, severity: 'high', description: '使用eval()可能导致代码注入' },
      { pattern: /Function\s*\(/, severity: 'high', description: '使用Function构造器可能导致代码注入' },
      { pattern: /child_process\.exec/, severity: 'medium', description: '使用exec()需要验证输入参数' },
      { pattern: /fs\.readFile.*req\./, severity: 'medium', description: '基于用户输入的文件读取可能导致路径遍历' }
    ];

    for (const symbol of symbols) {
      const symbolText = this.getSymbolText(symbol);
      
      for (const dangerousAPI of dangerousAPIs) {
        if (dangerousAPI.pattern.test(symbolText)) {
          issues.push({
            type: 'dangerous-api',
            severity: dangerousAPI.severity as 'low' | 'medium' | 'high',
            description: dangerousAPI.description,
            location: symbol.location,
            recommendation: this.getSecurityRecommendation(dangerousAPI.pattern)
          });
        }
      }
    }

    // 检测过时的依赖安全问题
    for (const outdatedDep of dependencies.outdated) {
      issues.push({
        type: 'outdated-dependency',
        severity: 'medium',
        description: `过时的依赖: ${outdatedDep}`,
        location: { filePath: 'package.json', start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
        recommendation: '更新到最新的安全版本'
      });
    }

    return issues;
  }

  /**
   * 分析性能问题
   */
  private analyzePerformanceIssues(symbols: Symbol[], apiUsage: APIUsageAnalysis): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    
    // 检测同步API使用
    const syncAPIs = apiUsage.apis.filter(api => 
      api.name.endsWith('Sync') && api.module.startsWith('fs')
    );
    
    for (const syncAPI of syncAPIs) {
      issues.push({
        type: 'sync-api-usage',
        severity: 'medium',
        description: `使用同步API: ${syncAPI.name}`,
        locations: syncAPI.locations,
        impact: '可能阻塞事件循环',
        recommendation: `使用异步版本 ${syncAPI.name.replace('Sync', '')} 或Promise版本`
      });
    }

    // 检测可能的内存泄漏
    const eventEmitterUsage = symbols.filter(symbol => 
      this.getSymbolText(symbol).includes('EventEmitter') ||
      this.getSymbolText(symbol).includes('addEventListener')
    );

    if (eventEmitterUsage.length > 10) {
      issues.push({
        type: 'memory-leak-risk',
        severity: 'medium',
        description: '大量事件监听器使用',
        locations: eventEmitterUsage.map(s => s.location),
        impact: '可能导致内存泄漏',
        recommendation: '确保正确移除不需要的事件监听器'
      });
    }

    return issues;
  }

  // 辅助方法实现

  private identifyCoreModuleUsage(): string[] {
    // 简化实现：扫描项目文件中的require/import语句
    const coreModulesUsed: Set<string> = new Set();
    
    try {
      const files = this.getAllJSFiles(this.rootPath);
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        
        for (const coreModule of NodeJSEcosystemAnalyzer.NODE_CORE_MODULES) {
          const patterns = [
            `require('${coreModule}')`,
            `require("${coreModule}")`,
            `from '${coreModule}'`,
            `from "${coreModule}"`
          ];
          
          if (patterns.some(pattern => content.includes(pattern))) {
            coreModulesUsed.add(coreModule);
          }
        }
      }
    } catch (error) {
      console.warn('扫描核心模块使用时出错:', error);
    }
    
    return Array.from(coreModulesUsed);
  }

  private categorizeDependencies(dependencies: string[]): Map<string, string[]> {
    const categories = new Map<string, string[]>();
    
    for (const dep of dependencies) {
      const packageInfo = NodeJSEcosystemAnalyzer.POPULAR_PACKAGES.get(dep);
      const category = packageInfo?.category || 'other';
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      categories.get(category)!.push(dep);
    }
    
    return categories;
  }

  private detectOutdatedDependencies(packageJson: any): string[] {
    // 简化实现：检测一些已知的过时包
    const outdatedPackages = ['moment', 'request', 'gulp', 'bower'];
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    return outdatedPackages.filter(pkg => dependencies[pkg]);
  }

  private extractModuleName(importPath: string): string {
    // 提取模块名（处理scoped packages）
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.slice(0, 2).join('/');
    }
    
    return importPath.split('/')[0];
  }

  private getModuleCategory(moduleName: string): string {
    if (NodeJSEcosystemAnalyzer.NODE_CORE_MODULES.has(moduleName)) {
      return 'core';
    }
    
    const packageInfo = NodeJSEcosystemAnalyzer.POPULAR_PACKAGES.get(moduleName);
    return packageInfo?.category || 'other';
  }

  private getTopUsedModules(usage: Map<string, ModuleUsage>): ModuleUsage[] {
    return Array.from(usage.values())
      .sort((a, b) => b.importCount - a.importCount)
      .slice(0, 10);
  }

  private getCoreModuleUsage(usage: Map<string, ModuleUsage>): ModuleUsage[] {
    return Array.from(usage.values()).filter(m => m.isCoreModule);
  }

  private getThirdPartyUsage(usage: Map<string, ModuleUsage>): ModuleUsage[] {
    return Array.from(usage.values()).filter(m => m.isNodeModule && !m.isCoreModule);
  }

  private detectNodeJSAPIs(symbol: Symbol): NodeJSAPI[] {
    const apis: NodeJSAPI[] = [];
    const symbolText = this.getSymbolText(symbol);
    
    // 检测文件系统API
    const fsAPIs = ['readFile', 'writeFile', 'readFileSync', 'writeFileSync', 'stat', 'statSync'];
    for (const api of fsAPIs) {
      if (symbolText.includes(`fs.${api}`) || symbolText.includes(`${api}(`)) {
        apis.push({
          name: api,
          module: 'fs',
          isDeprecated: api.endsWith('Sync'), // 简化判断
          securityRisk: api.includes('read') || api.includes('write') ? 'medium' : 'low'
        });
      }
    }
    
    // 检测HTTP API
    const httpAPIs = ['createServer', 'request', 'get'];
    for (const api of httpAPIs) {
      if (symbolText.includes(`http.${api}`) || symbolText.includes(`https.${api}`)) {
        apis.push({
          name: api,
          module: 'http',
          securityRisk: 'medium'
        });
      }
    }
    
    return apis;
  }

  private getSymbolText(symbol: Symbol): string {
    // 这里应该获取符号的实际代码文本
    // 简化实现，返回符号名称
    return symbol.name;
  }

  private getSecurityRecommendation(pattern: RegExp): string {
    if (pattern.source.includes('eval')) {
      return '避免使用eval()，考虑使用JSON.parse()或其他安全的解析方法';
    }
    if (pattern.source.includes('Function')) {
      return '避免使用Function构造器，使用预定义函数或安全的模板引擎';
    }
    if (pattern.source.includes('exec')) {
      return '验证所有用户输入，使用execFile()或spawn()代替exec()';
    }
    if (pattern.source.includes('readFile')) {
      return '验证文件路径，使用path.resolve()和边界检查防止路径遍历';
    }
    
    return '请检查此API的使用是否安全';
  }

  private getAllJSFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllJSFiles(fullPath));
        } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
    
    return files;
  }

  private generateEcosystemRecommendations(
    dependencies: DependencyAnalysis,
    moduleUsage: ModuleUsageAnalysis,
    securityIssues: SecurityIssue[]
  ): string[] {
    const recommendations: string[] = [];
    
    // 依赖管理建议
    if (dependencies.outdated.length > 0) {
      recommendations.push(`更新${dependencies.outdated.length}个过时依赖以获得安全和性能改进`);
    }
    
    if (dependencies.total > 100) {
      recommendations.push('考虑减少依赖数量，使用依赖分析工具识别未使用的包');
    }
    
    // 模块使用建议
    const syncAPIUsage = moduleUsage.modules.filter(m => 
      m.name.includes('Sync') || m.category === 'sync-api'
    );
    
    if (syncAPIUsage.length > 0) {
      recommendations.push('减少同步API的使用，转向异步API以提高性能');
    }
    
    // 安全建议
    const highSecurityIssues = securityIssues.filter(issue => issue.severity === 'high');
    if (highSecurityIssues.length > 0) {
      recommendations.push(`修复${highSecurityIssues.length}个高风险安全问题`);
    }
    
    // 生态系统建议
    const webFrameworks = dependencies.categories.get('web-framework') || [];
    if (webFrameworks.length > 1) {
      recommendations.push('项目使用了多个Web框架，考虑统一技术栈');
    }
    
    return recommendations;
  }
}

// 类型定义
export interface EcosystemAnalysisResult {
  dependencies: DependencyAnalysis;
  moduleUsage: ModuleUsageAnalysis;
  apiUsage: APIUsageAnalysis;
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  recommendations: string[];
}

export interface DependencyAnalysis {
  total: number;
  production: string[];
  development: string[];
  coreModules: string[];
  outdated: string[];
  vulnerable: string[];
  categories: Map<string, string[]>;
}

export interface ModuleUsageAnalysis {
  modules: ModuleUsage[];
  topUsed: ModuleUsage[];
  coreModuleUsage: ModuleUsage[];
  thirdPartyUsage: ModuleUsage[];
}

export interface ModuleUsage {
  name: string;
  importCount: number;
  importTypes: Set<string>;
  files: Set<string>;
  isNodeModule: boolean;
  isCoreModule: boolean;
  category: string;
}

export interface APIUsageAnalysis {
  apis: APIUsage[];
  deprecatedAPIs: APIUsage[];
  securitySensitiveAPIs: APIUsage[];
}

export interface APIUsage {
  name: string;
  module: string;
  usageCount: number;
  locations: Location[];
  patterns: string[];
  isDeprecated: boolean;
  securityRisk: 'low' | 'medium' | 'high';
}

export interface NodeJSAPI {
  name: string;
  module: string;
  pattern?: string;
  isDeprecated?: boolean;
  securityRisk?: 'low' | 'medium' | 'high';
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: Location;
  recommendation: string;
}

export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  locations: Location[];
  impact: string;
  recommendation: string;
}