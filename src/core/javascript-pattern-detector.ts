import * as ts from 'typescript';
import { Symbol, CallRelation, Position, Location } from '../types';

/**
 * JavaScript特有模式检测器
 * 基于Jelly的深度JavaScript理解能力
 */
export class JavaScriptPatternDetector {
  private sourceFile: ts.SourceFile;
  private typeChecker: ts.TypeChecker;

  constructor(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    this.sourceFile = sourceFile;
    this.typeChecker = typeChecker;
  }

  /**
   * 检测JavaScript特有模式
   */
  detectPatterns(): {
    dynamicProperties: DynamicPropertyPattern[];
    closures: ClosurePattern[];
    prototypeMethods: PrototypeMethodPattern[];
    modulePatterns: ModulePattern[];
    callbackPatterns: CallbackPattern[];
    objectLiterals: ObjectLiteralPattern[];
    functionExpressions: FunctionExpressionPattern[];
  } {
    const dynamicProperties: DynamicPropertyPattern[] = [];
    const closures: ClosurePattern[] = [];
    const prototypeMethods: PrototypeMethodPattern[] = [];
    const modulePatterns: ModulePattern[] = [];
    const callbackPatterns: CallbackPattern[] = [];
    const objectLiterals: ObjectLiteralPattern[] = [];
    const functionExpressions: FunctionExpressionPattern[] = [];

    const visitNode = (node: ts.Node) => {
      // 检测动态属性访问 obj[prop]
      if (ts.isElementAccessExpression(node)) {
        dynamicProperties.push(this.analyzeDynamicProperty(node));
      }

      // 检测原型方法定义 Constructor.prototype.method = function() {}
      if (this.isPrototypeAssignment(node)) {
        prototypeMethods.push(this.analyzePrototypeMethod(node));
      }

      // 检测闭包模式
      if (this.isClosurePattern(node)) {
        closures.push(this.analyzeClosure(node));
      }

      // 检测模块模式 (IIFE, CommonJS, AMD)
      if (this.isModulePattern(node)) {
        modulePatterns.push(this.analyzeModulePattern(node));
      }

      // 检测回调模式
      if (this.isCallbackPattern(node)) {
        callbackPatterns.push(this.analyzeCallbackPattern(node));
      }

      // 检测对象字面量
      if (ts.isObjectLiteralExpression(node)) {
        objectLiterals.push(this.analyzeObjectLiteral(node));
      }

      // 检测函数表达式
      if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
        functionExpressions.push(this.analyzeFunctionExpression(node));
      }

      ts.forEachChild(node, visitNode);
    };

    visitNode(this.sourceFile);

    return {
      dynamicProperties,
      closures,
      prototypeMethods,
      modulePatterns,
      callbackPatterns,
      objectLiterals,
      functionExpressions
    };
  }

  /**
   * 分析动态属性访问模式
   */
  private analyzeDynamicProperty(node: ts.ElementAccessExpression): DynamicPropertyPattern {
    const location = this.getNodeLocation(node);
    const expression = node.expression.getText(this.sourceFile);
    const argumentExpression = node.argumentExpression?.getText(this.sourceFile) || '';

    return {
      type: 'dynamic-property',
      location,
      object: expression,
      property: argumentExpression,
      isComputed: true,
      accessType: this.getDynamicAccessType(node)
    };
  }

  /**
   * 分析原型方法模式
   */
  private analyzePrototypeMethod(node: ts.Node): PrototypeMethodPattern {
    const location = this.getNodeLocation(node);
    const assignment = node as ts.BinaryExpression;
    const left = assignment.left.getText(this.sourceFile);
    
    // 解析 Constructor.prototype.methodName
    const match = left.match(/(\w+)\.prototype\.(\w+)/);
    const constructor = match?.[1] || '';
    const methodName = match?.[2] || '';

    return {
      type: 'prototype-method',
      location,
      constructor,
      methodName,
      implementation: assignment.right.getText(this.sourceFile)
    };
  }

  /**
   * 分析闭包模式
   */
  private analyzeClosure(node: ts.Node): ClosurePattern {
    const location = this.getNodeLocation(node);
    
    return {
      type: 'closure',
      location,
      outerVariables: this.findClosureVariables(node),
      innerFunctions: this.findInnerFunctions(node),
      capturedScope: this.analyzeCapturedScope(node)
    };
  }

  /**
   * 分析模块模式
   */
  private analyzeModulePattern(node: ts.Node): ModulePattern {
    const location = this.getNodeLocation(node);
    const patternType = this.identifyModulePatternType(node);

    return {
      type: 'module-pattern',
      location,
      patternType,
      exports: this.findModuleExports(node),
      dependencies: this.findModuleDependencies(node)
    };
  }

  /**
   * 分析回调模式
   */
  private analyzeCallbackPattern(node: ts.Node): CallbackPattern {
    const location = this.getNodeLocation(node);
    const callExpression = node as ts.CallExpression;

    return {
      type: 'callback',
      location,
      callerFunction: callExpression.expression.getText(this.sourceFile),
      callbackArguments: this.findCallbackArguments(callExpression),
      isAsync: this.isAsyncCallback(callExpression)
    };
  }

  /**
   * 分析对象字面量模式
   */
  private analyzeObjectLiteral(node: ts.ObjectLiteralExpression): ObjectLiteralPattern {
    const location = this.getNodeLocation(node);

    return {
      type: 'object-literal',
      location,
      properties: this.analyzeObjectProperties(node),
      methods: this.findObjectMethods(node),
      computedProperties: this.findComputedProperties(node)
    };
  }

  /**
   * 分析函数表达式模式
   */
  private analyzeFunctionExpression(node: ts.FunctionExpression | ts.ArrowFunction): FunctionExpressionPattern {
    const location = this.getNodeLocation(node);

    return {
      type: 'function-expression',
      location,
      isArrow: ts.isArrowFunction(node),
      isIIFE: this.isIIFE(node),
      capturesThis: this.capturesThis(node),
      parameters: node.parameters.map(p => p.getText(this.sourceFile))
    };
  }

  // 辅助方法

  private isPrototypeAssignment(node: ts.Node): boolean {
    return ts.isBinaryExpression(node) &&
           node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
           ts.isPropertyAccessExpression(node.left) &&
           node.left.getText(this.sourceFile).includes('.prototype.');
  }

  private isClosurePattern(node: ts.Node): boolean {
    // 检测立即执行函数表达式或函数内部定义的函数
    return (ts.isCallExpression(node) && ts.isFunctionExpression(node.expression)) ||
           (ts.isFunctionDeclaration(node) && this.hasNestedFunctions(node));
  }

  private isModulePattern(node: ts.Node): boolean {
    // 检测IIFE、CommonJS、AMD等模块模式
    return this.isIIFE(node) || 
           this.isCommonJSPattern(node) ||
           this.isAMDPattern(node);
  }

  private isCallbackPattern(node: ts.Node): boolean {
    return ts.isCallExpression(node) &&
           node.arguments.some(arg => 
             ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)
           );
  }

  private isIIFE(node: ts.Node): boolean {
    return ts.isCallExpression(node) &&
           (ts.isFunctionExpression(node.expression) || 
            (ts.isParenthesizedExpression(node.expression) && 
             ts.isFunctionExpression(node.expression.expression)));
  }

  private isCommonJSPattern(node: ts.Node): boolean {
    const text = node.getText(this.sourceFile);
    return text.includes('module.exports') || text.includes('exports.');
  }

  private isAMDPattern(node: ts.Node): boolean {
    return ts.isCallExpression(node) &&
           ts.isIdentifier(node.expression) &&
           (node.expression.text === 'define' || node.expression.text === 'require');
  }

  private getDynamicAccessType(node: ts.ElementAccessExpression): 'read' | 'write' | 'call' {
    const parent = node.parent;
    if (ts.isBinaryExpression(parent) && parent.left === node) {
      return 'write';
    }
    if (ts.isCallExpression(parent) && parent.expression === node) {
      return 'call';
    }
    return 'read';
  }

  private findClosureVariables(node: ts.Node): string[] {
    // 实现闭包变量检测
    const variables: string[] = [];
    // 这里需要复杂的作用域分析
    return variables;
  }

  private findInnerFunctions(node: ts.Node): string[] {
    const functions: string[] = [];
    const visit = (child: ts.Node) => {
      if (ts.isFunctionDeclaration(child) && child.name) {
        functions.push(child.name.text);
      }
      ts.forEachChild(child, visit);
    };
    ts.forEachChild(node, visit);
    return functions;
  }

  private analyzeCapturedScope(node: ts.Node): any {
    // 分析捕获的作用域
    return {};
  }

  private identifyModulePatternType(node: ts.Node): 'IIFE' | 'CommonJS' | 'AMD' | 'UMD' | 'unknown' {
    if (this.isIIFE(node)) return 'IIFE';
    if (this.isCommonJSPattern(node)) return 'CommonJS';
    if (this.isAMDPattern(node)) return 'AMD';
    return 'unknown';
  }

  private findModuleExports(node: ts.Node): string[] {
    // 查找模块导出
    return [];
  }

  private findModuleDependencies(node: ts.Node): string[] {
    // 查找模块依赖
    return [];
  }

  private findCallbackArguments(callExpression: ts.CallExpression): string[] {
    return callExpression.arguments
      .filter(arg => ts.isFunctionExpression(arg) || ts.isArrowFunction(arg))
      .map((arg, index) => `callback_${index}`);
  }

  private isAsyncCallback(callExpression: ts.CallExpression): boolean {
    // 检测是否为异步回调
    const functionName = callExpression.expression.getText(this.sourceFile).toLowerCase();
    return functionName.includes('async') || 
           functionName.includes('then') ||
           functionName.includes('catch') ||
           functionName.includes('settimeout') ||
           functionName.includes('setinterval');
  }

  private analyzeObjectProperties(node: ts.ObjectLiteralExpression): any[] {
    return node.properties.map(prop => ({
      name: prop.name?.getText(this.sourceFile) || '',
      type: ts.SyntaxKind[prop.kind],
      isMethod: ts.isMethodDeclaration(prop),
      isGetter: ts.isGetAccessorDeclaration(prop),
      isSetter: ts.isSetAccessorDeclaration(prop)
    }));
  }

  private findObjectMethods(node: ts.ObjectLiteralExpression): string[] {
    return node.properties
      .filter(prop => ts.isMethodDeclaration(prop))
      .map(prop => prop.name?.getText(this.sourceFile) || '');
  }

  private findComputedProperties(node: ts.ObjectLiteralExpression): string[] {
    return node.properties
      .filter(prop => prop.name && ts.isComputedPropertyName(prop.name))
      .map(prop => prop.name?.getText(this.sourceFile) || '');
  }

  private hasNestedFunctions(node: ts.FunctionDeclaration): boolean {
    let hasNested = false;
    const visit = (child: ts.Node) => {
      if (ts.isFunctionDeclaration(child) || ts.isFunctionExpression(child)) {
        hasNested = true;
        return;
      }
      ts.forEachChild(child, visit);
    };
    if (node.body) {
      ts.forEachChild(node.body, visit);
    }
    return hasNested;
  }

  private capturesThis(node: ts.FunctionExpression | ts.ArrowFunction): boolean {
    // 检测是否捕获了this
    return node.getText(this.sourceFile).includes('this.');
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
interface DynamicPropertyPattern {
  type: 'dynamic-property';
  location: Location;
  object: string;
  property: string;
  isComputed: boolean;
  accessType: 'read' | 'write' | 'call';
}

interface PrototypeMethodPattern {
  type: 'prototype-method';
  location: Location;
  constructor: string;
  methodName: string;
  implementation: string;
}

interface ClosurePattern {
  type: 'closure';
  location: Location;
  outerVariables: string[];
  innerFunctions: string[];
  capturedScope: any;
}

interface ModulePattern {
  type: 'module-pattern';
  location: Location;
  patternType: 'IIFE' | 'CommonJS' | 'AMD' | 'UMD' | 'unknown';
  exports: string[];
  dependencies: string[];
}

interface CallbackPattern {
  type: 'callback';
  location: Location;
  callerFunction: string;
  callbackArguments: string[];
  isAsync: boolean;
}

interface ObjectLiteralPattern {
  type: 'object-literal';
  location: Location;
  properties: any[];
  methods: string[];
  computedProperties: string[];
}

interface FunctionExpressionPattern {
  type: 'function-expression';
  location: Location;
  isArrow: boolean;
  isIIFE: boolean;
  capturesThis: boolean;
  parameters: string[];
}