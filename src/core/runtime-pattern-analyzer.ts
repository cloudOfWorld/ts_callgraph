import * as ts from 'typescript';
import { Symbol, CallRelation, Location } from '../types';

/**
 * JavaScript运行时模式分析器
 * 基于Jelly的深度JavaScript理解，处理动态特性和错误模式
 */
export class RuntimePatternAnalyzer {
  private sourceFile: ts.SourceFile;
  private typeChecker: ts.TypeChecker;

  constructor(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    this.sourceFile = sourceFile;
    this.typeChecker = typeChecker;
  }

  /**
   * 分析JavaScript运行时模式
   */
  analyzeRuntimePatterns(): RuntimeAnalysisResult {
    const patterns: RuntimePattern[] = [];
    const errorPatterns: ErrorPattern[] = [];
    const dynamicPatterns: DynamicPattern[] = [];

    const visitNode = (node: ts.Node) => {
      // 检测异步模式
      if (this.isAsyncPattern(node)) {
        patterns.push(this.analyzeAsyncPattern(node));
      }

      // 检测Promise模式
      if (this.isPromisePattern(node)) {
        patterns.push(this.analyzePromisePattern(node as ts.CallExpression));
      }

      // 检测回调地狱
      if (this.isCallbackHell(node)) {
        errorPatterns.push(this.analyzeCallbackHell(node as ts.CallExpression));
      }

      // 检测动态属性访问
      if (this.isDynamicPropertyAccess(node)) {
        dynamicPatterns.push(this.analyzeDynamicPropertyAccess(node as ts.ElementAccessExpression));
      }

      // 检测eval使用
      if (this.isEvalUsage(node)) {
        errorPatterns.push(this.analyzeEvalUsage(node as ts.CallExpression));
      }

      // 检测全局变量污染
      if (this.isGlobalVariablePollution(node)) {
        errorPatterns.push(this.analyzeGlobalPollution(node as ts.VariableDeclaration));
      }

      // 检测内存泄漏模式
      if (this.isMemoryLeakPattern(node)) {
        errorPatterns.push(this.analyzeMemoryLeakPattern(node as ts.CallExpression));
      }

      // 检测this绑定问题
      if (this.isThisBindingIssue(node)) {
        errorPatterns.push(this.analyzeThisBindingIssue(node as ts.CallExpression));
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(this.sourceFile);

    return {
      runtimePatterns: patterns,
      errorPatterns,
      dynamicPatterns,
      recommendations: this.generateRecommendations(errorPatterns)
    };
  }

  /**
   * 检测异步模式
   */
  private isAsyncPattern(node: ts.Node): boolean {
    return (ts.isFunctionDeclaration(node) && 
           node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) ||
           (ts.isArrowFunction(node) && 
           node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) || false;
  }

  /**
   * 分析异步模式
   */
  private analyzeAsyncPattern(node: ts.Node): RuntimePattern {
    const location = this.getNodeLocation(node);
    
    return {
      type: 'async-pattern',
      location,
      severity: 'info',
      description: '异步函数模式',
      details: {
        hasAwait: this.hasAwaitKeyword(node),
        hasErrorHandling: this.hasErrorHandling(node),
        awaitCount: this.countAwaitUsage(node)
      }
    };
  }

  /**
   * 检测Promise模式
   */
  private isPromisePattern(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;
    
    const text = node.expression.getText(this.sourceFile);
    return text.includes('.then') || 
           text.includes('.catch') || 
           text.includes('.finally') ||
           text.includes('Promise.');
  }

  /**
   * 分析Promise模式
   */
  private analyzePromisePattern(node: ts.CallExpression): RuntimePattern {
    const location = this.getNodeLocation(node);
    const expressionText = node.expression.getText(this.sourceFile);
    
    return {
      type: 'promise-pattern',
      location,
      severity: 'info',
      description: 'Promise链模式',
      details: {
        chainLength: this.calculatePromiseChainLength(node),
        hasErrorHandling: expressionText.includes('.catch'),
        hasFinally: expressionText.includes('.finally'),
        isNested: this.isNestedPromise(node)
      }
    };
  }

  /**
   * 检测回调地狱
   */
  private isCallbackHell(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;
    
    const depth = this.calculateCallbackDepth(node);
    return depth > 3; // 超过3层嵌套认为是回调地狱
  }

  /**
   * 分析回调地狱
   */
  private analyzeCallbackHell(node: ts.CallExpression): ErrorPattern {
    const location = this.getNodeLocation(node);
    const depth = this.calculateCallbackDepth(node);
    
    return {
      type: 'callback-hell',
      location,
      severity: 'warning',
      description: `回调地狱检测 (嵌套深度: ${depth})`,
      recommendation: '建议使用Promise或async/await重构',
      details: {
        nestingDepth: depth,
        callbackCount: this.countCallbacks(node)
      }
    };
  }

  /**
   * 检测动态属性访问
   */
  private isDynamicPropertyAccess(node: ts.Node): boolean {
    return ts.isElementAccessExpression(node) && 
           !ts.isNumericLiteral(node.argumentExpression) &&
           !ts.isStringLiteral(node.argumentExpression);
  }

  /**
   * 分析动态属性访问
   */
  private analyzeDynamicPropertyAccess(node: ts.ElementAccessExpression): DynamicPattern {
    const location = this.getNodeLocation(node);
    
    return {
      type: 'dynamic-property-access',
      location,
      severity: 'info',
      description: '动态属性访问',
      details: {
        object: node.expression.getText(this.sourceFile),
        property: node.argumentExpression?.getText(this.sourceFile) || '',
        isComputed: true,
        riskLevel: this.assessDynamicAccessRisk(node)
      }
    };
  }

  /**
   * 检测eval使用
   */
  private isEvalUsage(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;
    
    const text = node.expression.getText(this.sourceFile);
    return text === 'eval' || 
           text === 'Function' || 
           text.includes('setTimeout') && this.hasStringCallback(node) ||
           text.includes('setInterval') && this.hasStringCallback(node);
  }

  /**
   * 分析eval使用
   */
  private analyzeEvalUsage(node: ts.CallExpression): ErrorPattern {
    const location = this.getNodeLocation(node);
    const functionName = node.expression.getText(this.sourceFile);
    
    return {
      type: 'eval-usage',
      location,
      severity: 'error',
      description: `危险的代码执行: ${functionName}`,
      recommendation: '避免使用eval、Function构造器或字符串形式的setTimeout/setInterval',
      details: {
        function: functionName,
        hasUserInput: this.hasUserInputInEval(node),
        securityRisk: 'high'
      }
    };
  }

  /**
   * 检测全局变量污染
   */
  private isGlobalVariablePollution(node: ts.Node): boolean {
    if (!ts.isVariableDeclaration(node)) return false;
    
    // 检查是否在全局作用域
    const isGlobal = this.isInGlobalScope(node);
    const isImplicitGlobal = this.isImplicitGlobalVariable(node);
    
    return isGlobal || isImplicitGlobal;
  }

  /**
   * 分析全局变量污染
   */
  private analyzeGlobalPollution(node: ts.VariableDeclaration): ErrorPattern {
    const location = this.getNodeLocation(node);
    const variableName = node.name.getText(this.sourceFile);
    
    return {
      type: 'global-pollution',
      location,
      severity: 'warning',
      description: `全局变量污染: ${variableName}`,
      recommendation: '使用模块化或命名空间来避免全局变量污染',
      details: {
        variableName,
        isImplicit: this.isImplicitGlobalVariable(node),
        conflictRisk: this.assessGlobalConflictRisk(variableName)
      }
    };
  }

  /**
   * 检测内存泄漏模式
   */
  private isMemoryLeakPattern(node: ts.Node): boolean {
    // 检测可能的内存泄漏模式：
    // 1. 未清理的事件监听器
    // 2. 循环引用
    // 3. 闭包中的大对象引用
    
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText(this.sourceFile);
      
      // 事件监听器未清理
      if (text.includes('addEventListener') || text.includes('on')) {
        return !this.hasCorrespondingRemoveListener(node);
      }
      
      // 定时器未清理
      if (text.includes('setTimeout') || text.includes('setInterval')) {
        return !this.hasClearTimer(node);
      }
    }
    
    return false;
  }

  /**
   * 分析内存泄漏模式
   */
  private analyzeMemoryLeakPattern(node: ts.CallExpression): ErrorPattern {
    const location = this.getNodeLocation(node);
    const functionCall = node.expression.getText(this.sourceFile);
    
    return {
      type: 'memory-leak',
      location,
      severity: 'warning',
      description: `潜在内存泄漏: ${functionCall}`,
      recommendation: '确保清理事件监听器、定时器和其他资源',
      details: {
        leakType: this.identifyLeakType(node),
        hasCleanup: false,
        riskLevel: 'medium'
      }
    };
  }

  /**
   * 检测this绑定问题
   */
  private isThisBindingIssue(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;
    
    // 检测可能的this绑定问题
    const hasThisReference = this.hasThisReference(node);
    const isMethodCall = ts.isPropertyAccessExpression(node.expression);
    const isArrowFunction = this.isInArrowFunction(node);
    
    return hasThisReference && isMethodCall && !isArrowFunction;
  }

  /**
   * 分析this绑定问题
   */
  private analyzeThisBindingIssue(node: ts.CallExpression): ErrorPattern {
    const location = this.getNodeLocation(node);
    
    return {
      type: 'this-binding',
      location,
      severity: 'warning',
      description: 'this绑定可能存在问题',
      recommendation: '使用箭头函数、bind()或明确的this绑定',
      details: {
        context: 'method-call',
        hasArrowFunction: this.isInArrowFunction(node),
        hasBind: this.hasBindCall(node)
      }
    };
  }

  // 辅助方法实现
  private hasAwaitKeyword(node: ts.Node): boolean {
    let hasAwait = false;
    const visit = (child: ts.Node) => {
      if (ts.isAwaitExpression(child)) {
        hasAwait = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return hasAwait;
  }

  private hasErrorHandling(node: ts.Node): boolean {
    let hasError = false;
    const visit = (child: ts.Node) => {
      if (ts.isTryStatement(child) || 
          (ts.isCallExpression(child) && 
           child.expression.getText(this.sourceFile).includes('.catch'))) {
        hasError = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return hasError;
  }

  private countAwaitUsage(node: ts.Node): number {
    let count = 0;
    const visit = (child: ts.Node) => {
      if (ts.isAwaitExpression(child)) {
        count++;
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return count;
  }

  private calculatePromiseChainLength(node: ts.CallExpression): number {
    let length = 1;
    let current = node.expression;
    
    while (ts.isCallExpression(current)) {
      if (ts.isPropertyAccessExpression(current.expression)) {
        const methodName = current.expression.name.text;
        if (['then', 'catch', 'finally'].includes(methodName)) {
          length++;
          current = current.expression.expression;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return length;
  }

  private isNestedPromise(node: ts.CallExpression): boolean {
    // 检测Promise嵌套
    return node.arguments.some(arg => {
      if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) {
        return this.hasPromiseInFunction(arg);
      }
      return false;
    });
  }

  private hasPromiseInFunction(func: ts.FunctionExpression | ts.ArrowFunction): boolean {
    let hasPromise = false;
    const visit = (child: ts.Node) => {
      if (ts.isCallExpression(child)) {
        const text = child.expression.getText(this.sourceFile);
        if (text.includes('Promise') || text.includes('.then')) {
          hasPromise = true;
          return;
        }
      }
      ts.forEachChild(child, visit);
    };
    
    if (func.body) {
      ts.forEachChild(func.body, visit);
    }
    
    return hasPromise;
  }

  private calculateCallbackDepth(node: ts.Node, depth: number = 0): number {
    let maxDepth = depth;
    
    const visit = (child: ts.Node) => {
      if (ts.isCallExpression(child)) {
        const newDepth = depth + 1;
        maxDepth = Math.max(maxDepth, newDepth);
        
        child.arguments.forEach(arg => {
          if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) {
            if (arg.body) {
              maxDepth = Math.max(maxDepth, this.calculateCallbackDepth(arg.body, newDepth));
            }
          }
        });
      } else {
        ts.forEachChild(child, visit);
      }
    };
    
    ts.forEachChild(node, visit);
    return maxDepth;
  }

  private countCallbacks(node: ts.Node): number {
    let count = 0;
    const visit = (child: ts.Node) => {
      if (ts.isCallExpression(child)) {
        count += child.arguments.filter(arg => 
          ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)
        ).length;
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return count;
  }

  private assessDynamicAccessRisk(node: ts.ElementAccessExpression): 'low' | 'medium' | 'high' {
    const property = node.argumentExpression?.getText(this.sourceFile) || '';
    
    // 如果属性来自用户输入或外部源，风险较高
    if (property.includes('input') || property.includes('params') || property.includes('query')) {
      return 'high';
    }
    
    // 如果是变量但在当前作用域，风险中等
    if (ts.isIdentifier(node.argumentExpression)) {
      return 'medium';
    }
    
    return 'low';
  }

  private hasStringCallback(node: ts.CallExpression): boolean {
    return node.arguments.some(arg => ts.isStringLiteral(arg));
  }

  private hasUserInputInEval(node: ts.CallExpression): boolean {
    return node.arguments.some(arg => {
      const text = arg.getText(this.sourceFile);
      return text.includes('input') || text.includes('params') || text.includes('req.');
    });
  }

  private isInGlobalScope(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isFunctionDeclaration(current) || 
          ts.isMethodDeclaration(current) || 
          ts.isClassDeclaration(current)) {
        return false;
      }
      current = current.parent;
    }
    return true;
  }

  private isImplicitGlobalVariable(node: ts.VariableDeclaration): boolean {
    // 检测隐式全局变量（没有var/let/const声明）
    const parent = node.parent;
    return !ts.isVariableDeclarationList(parent) || 
           !parent.flags || 
           !(parent.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const));
  }

  private assessGlobalConflictRisk(variableName: string): 'low' | 'medium' | 'high' {
    const commonGlobals = ['window', 'document', 'console', 'global', 'process'];
    const commonLibraryNames = ['$', '_', 'React', 'Vue', 'Angular'];
    
    if (commonGlobals.includes(variableName)) {
      return 'high';
    }
    
    if (commonLibraryNames.includes(variableName)) {
      return 'medium';
    }
    
    return 'low';
  }

  private hasCorrespondingRemoveListener(node: ts.CallExpression): boolean {
    // 简化检测，实际应该分析整个作用域
    const sourceText = this.sourceFile.getFullText();
    return sourceText.includes('removeEventListener');
  }

  private hasClearTimer(node: ts.CallExpression): boolean {
    const sourceText = this.sourceFile.getFullText();
    return sourceText.includes('clearTimeout') || sourceText.includes('clearInterval');
  }

  private identifyLeakType(node: ts.CallExpression): string {
    const text = node.expression.getText(this.sourceFile);
    
    if (text.includes('addEventListener')) return 'event-listener';
    if (text.includes('setTimeout') || text.includes('setInterval')) return 'timer';
    
    return 'unknown';
  }

  private hasThisReference(node: ts.Node): boolean {
    let hasThis = false;
    const visit = (child: ts.Node) => {
      if (child.kind === ts.SyntaxKind.ThisKeyword) {
        hasThis = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return hasThis;
  }

  private isInArrowFunction(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (ts.isArrowFunction(current)) return true;
      if (ts.isFunctionDeclaration(current)) return false;
      current = current.parent;
    }
    return false;
  }

  private hasBindCall(node: ts.Node): boolean {
    const text = node.getText(this.sourceFile);
    return text.includes('.bind(');
  }

  private generateRecommendations(errorPatterns: ErrorPattern[]): string[] {
    const recommendations: string[] = [];
    
    const patternCounts = errorPatterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(patternCounts).forEach(([type, count]) => {
      switch (type) {
        case 'callback-hell':
          recommendations.push(`发现${count}个回调地狱模式，建议使用Promise或async/await重构`);
          break;
        case 'eval-usage':
          recommendations.push(`发现${count}个危险的代码执行，建议移除eval和Function构造器的使用`);
          break;
        case 'global-pollution':
          recommendations.push(`发现${count}个全局变量污染，建议使用模块化或命名空间`);
          break;
        case 'memory-leak':
          recommendations.push(`发现${count}个潜在内存泄漏，建议添加适当的清理代码`);
          break;
        case 'this-binding':
          recommendations.push(`发现${count}个this绑定问题，建议使用箭头函数或明确绑定this`);
          break;
      }
    });

    return recommendations;
  }

  private getNodeLocation(node: ts.Node): Location {
    const start = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      filePath: this.sourceFile.fileName,
      start: { line: start.line + 1, column: start.character + 1 },
      end: { line: end.line + 1, column: end.character + 1 }
    };
  }
}

// 类型定义
export interface RuntimeAnalysisResult {
  runtimePatterns: RuntimePattern[];
  errorPatterns: ErrorPattern[];
  dynamicPatterns: DynamicPattern[];
  recommendations: string[];
}

export interface RuntimePattern {
  type: string;
  location: Location;
  severity: 'info' | 'warning' | 'error';
  description: string;
  details: any;
}

export interface ErrorPattern extends RuntimePattern {
  recommendation: string;
}

export interface DynamicPattern extends RuntimePattern {
  details: {
    object: string;
    property: string;
    isComputed: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}