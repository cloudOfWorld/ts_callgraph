import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { 
  AnalysisResult, 
  AnalysisOptions, 
  Symbol, 
  CallRelation, 
  CallRelationParticipant,
  ImportRelation, 
  ExportRelation 
} from '../types';
import { Utils } from '../utils';

/**
 * TypeScript AST 分析器核心类
 */
export class TypeScriptAnalyzer {
  private program!: ts.Program;
  private typeChecker!: ts.TypeChecker;
  private symbols: Symbol[] = [];
  private callRelations: CallRelation[] = [];
  private importRelations: ImportRelation[] = [];
  private exportRelations: ExportRelation[] = [];
  private processedFiles: Set<string> = new Set();

  constructor(
    private rootPath: string,
    private options: AnalysisOptions = {}
  ) {
    this.initialize();
  }

  /**
   * 初始化TypeScript程序和类型检查器
   */
  private initialize(): void {
    // 创建TypeScript编译选项
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      declaration: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      strict: false, // 为了兼容性，不要求严格模式
    };

    // 查找项目中的TypeScript配置文件
    const configPath = ts.findConfigFile(this.rootPath, ts.sys.fileExists, 'tsconfig.json');
    if (configPath) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );
      Object.assign(compilerOptions, parsedConfig.options);
    }

    // 创建程序
    this.program = ts.createProgram([], compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 分析指定的文件或目录
   */
  async analyze(patterns: string[]): Promise<AnalysisResult> {
    this.reset();

    // 查找所有匹配的文件
    const excludePatterns = this.options.excludePatterns || ['node_modules/**', '**/*.d.ts'];
    const files = await Utils.findFiles(patterns, excludePatterns);
    
    const tsFiles = files.filter(file => Utils.isTypeScriptFile(file));

    // 创建新的程序实例，包含所有找到的文件
    const compilerOptions = this.program.getCompilerOptions();
    this.program = ts.createProgram(tsFiles, compilerOptions);
    this.typeChecker = this.program.getTypeChecker();

    // 分析每个文件
    for (const filePath of tsFiles) {
      if (!this.processedFiles.has(filePath)) {
        await this.analyzeFile(filePath);
      }
    }

    // 返回分析结果
    return {
      symbols: this.symbols,
      callRelations: this.callRelations,
      importRelations: this.importRelations,
      exportRelations: this.exportRelations,
      files: Array.from(this.processedFiles),
      metadata: {
        analysisDate: new Date(),
        totalFiles: this.processedFiles.size,
        totalSymbols: this.symbols.length,
        totalCallRelations: this.callRelations.length,
      }
    };
  }

  /**
   * 重置分析状态
   */
  private reset(): void {
    this.symbols = [];
    this.callRelations = [];
    this.importRelations = [];
    this.exportRelations = [];
    this.processedFiles.clear();
  }

  /**
   * 分析单个文件
   */
  private async analyzeFile(filePath: string): Promise<void> {
    if (this.processedFiles.has(filePath)) {
      return;
    }

    this.processedFiles.add(filePath);

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      console.warn(`Could not load source file: ${filePath}`);
      return;
    }

    // 遍历AST节点
    this.visitNode(sourceFile, sourceFile);
  }

  /**
   * 递归访问AST节点
   */
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile): void {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        this.analyzeClass(node as ts.ClassDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.InterfaceDeclaration:
        this.analyzeInterface(node as ts.InterfaceDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.FunctionDeclaration:
        this.analyzeFunction(node as ts.FunctionDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.VariableDeclaration:
        this.analyzeVariable(node as ts.VariableDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.ImportDeclaration:
        this.analyzeImport(node as ts.ImportDeclaration, sourceFile);
        break;
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ExportAssignment:
        this.analyzeExport(node, sourceFile);
        break;
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression:
        this.analyzeCall(node as ts.CallExpression | ts.NewExpression, sourceFile);
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        // 分析属性访问，但跳过方法调用中的属性访问（因为已经在analyzeCall中处理了）
        if (!ts.isCallExpression(node.parent)) {
          this.analyzePropertyAccess(node as ts.PropertyAccessExpression, sourceFile);
        }
        break;
    }

    // 递归访问子节点
    ts.forEachChild(node, child => this.visitNode(child, sourceFile));
  }

  /**
   * 分析类声明
   */
  private analyzeClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.name) return;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    // 提取继承和实现的类型
    const extendsClause = node.heritageClauses
      ?.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)
      .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));

    const implementsClause = node.heritageClauses
      ?.filter(clause => clause.token === ts.SyntaxKind.ImplementsKeyword)
      .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));

    // 分析类成员
    const properties: any[] = [];
    const methods: any[] = [];
    const constructors: any[] = [];

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member)) {
        properties.push(this.analyzeProperty(member, sourceFile));
      } else if (ts.isMethodDeclaration(member)) {
        methods.push(this.analyzeMethod(member, sourceFile));
      } else if (ts.isConstructorDeclaration(member)) {
        constructors.push(this.analyzeConstructor(member, sourceFile));
      }
    }

    this.symbols.push({
      type: 'class',
      id,
      name,
      location,
      visibility: Utils.getVisibility(node),
      isExported: Utils.isExported(node),
      documentation: Utils.getDocumentation(node),
      isAbstract: Utils.isAbstract(node),
      extends: extendsClause,
      implements: implementsClause,
      properties: properties.filter(p => p),
      methods: methods.filter(m => m),
      constructors: constructors.filter(c => c)
    });
  }

  /**
   * 分析接口声明
   */
  private analyzeInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): void {
    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    // 提取继承的接口
    const extendsClause = node.heritageClauses
      ?.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)
      .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));

    // 分析接口成员
    const properties: any[] = [];
    const methods: any[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        properties.push(this.analyzePropertySignature(member, sourceFile));
      } else if (ts.isMethodSignature(member)) {
        methods.push(this.analyzeMethodSignature(member, sourceFile));
      }
    }

    this.symbols.push({
      type: 'interface',
      id,
      name,
      location,
      isExported: Utils.isExported(node),
      documentation: Utils.getDocumentation(node),
      extends: extendsClause,
      properties: properties.filter(p => p),
      methods: methods.filter(m => m)
    });
  }

  /**
   * 分析函数声明
   */
  private analyzeFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.name) return;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    const parameters = node.parameters.map(param => ({
      name: param.name.getText(sourceFile),
      type: Utils.getTypeString(this.typeChecker, param),
      isOptional: !!param.questionToken,
      isRest: !!param.dotDotDotToken
    }));

    this.symbols.push({
      type: 'function',
      id,
      name,
      location,
      isExported: Utils.isExported(node),
      documentation: Utils.getDocumentation(node),
      parameters,
      returnType: Utils.getTypeString(this.typeChecker, node),
      isAsync: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)),
      isGenerator: !!node.asteriskToken
    });
  }

  /**
   * 分析变量声明
   */
  private analyzeVariable(node: ts.VariableDeclaration, sourceFile: ts.SourceFile): void {
    if (!ts.isIdentifier(node.name)) return;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    // 获取变量声明的类型（const/let/var）
    const parent = node.parent;
    let isConst = false;
    let isLet = false;

    if (ts.isVariableDeclarationList(parent)) {
      isConst = !!(parent.flags & ts.NodeFlags.Const);
      isLet = !!(parent.flags & ts.NodeFlags.Let);
    }

    this.symbols.push({
      type: 'variable',
      id,
      name,
      location,
      variableType: Utils.getTypeString(this.typeChecker, node),
      isConst,
      isLet
    });
  }

  /**
   * 分析属性声明
   */
  private analyzeProperty(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile): any {
    if (!ts.isIdentifier(node.name)) return null;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    // 获取属性的类型信息
    const propertyTypeString = Utils.getTypeString(this.typeChecker, node);
    const typeInfo = this.analyzePropertyType(node, sourceFile, propertyTypeString);

    return {
      type: 'property',
      id,
      name,
      location,
      accessibility: Utils.getVisibility(node),
      documentation: Utils.getDocumentation(node),
      propertyType: propertyTypeString,
      typeClassName: typeInfo?.className,
      typeFilePath: typeInfo?.filePath,
      isCustomType: typeInfo?.isCustomType,
      isStatic: Utils.isStatic(node),
      isReadonly: Utils.isReadonly(node)
    };
  }

  /**
   * 分析属性类型信息
   */
  private analyzePropertyType(node: ts.PropertyDeclaration, sourceFile: ts.SourceFile, typeString?: string): {
    className?: string;
    filePath?: string;
    isCustomType?: boolean;
  } | undefined {
    try {
      // 获取属性的类型
      const type = this.typeChecker.getTypeAtLocation(node);
      const symbol = type.getSymbol();
      
      if (symbol) {
        const className = symbol.getName();
        
        // 检查是否为自定义类型（非原始类型）
        const isCustomType = this.isCustomType(className, typeString);
        
        if (isCustomType) {
          // 尝试找到类型的定义位置
          const declarations = symbol.valueDeclaration;
          if (declarations) {
            const declarationFile = declarations.getSourceFile();
            return {
              className: className,
              filePath: declarationFile.fileName,
              isCustomType: true
            };
          }
          
          // 如果没有找到声明，尝试从已知符号中查找
          const knownSymbol = this.findSymbolByName(className, sourceFile.fileName);
          if (knownSymbol) {
            return {
              className: className,
              filePath: knownSymbol.location.filePath,
              isCustomType: true
            };
          }
          
          return {
            className: className,
            isCustomType: true
          };
        }
      }
      
      // 处理数组类型，Array<CustomType> 或 CustomType[]
      if (typeString) {
        const arrayMatch = typeString.match(/^(\w+)\[\]$/) || typeString.match(/^Array<(\w+)>$/);
        if (arrayMatch) {
          const elementType = arrayMatch[1];
          if (this.isCustomType(elementType)) {
            const elementSymbol = this.findSymbolByName(elementType, sourceFile.fileName);
            return {
              className: elementType,
              filePath: elementSymbol?.location.filePath,
              isCustomType: true
            };
          }
        }
      }
    } catch (error) {
      // 类型检查失败，尝试从类型字符串推断
      if (typeString && this.isCustomType(typeString)) {
        const symbolFromString = this.findSymbolByName(typeString, sourceFile.fileName);
        if (symbolFromString) {
          return {
            className: typeString,
            filePath: symbolFromString.location.filePath,
            isCustomType: true
          };
        }
      }
    }
    
    return undefined;
  }

  /**
   * 判断是否为自定义类型
   */
  private isCustomType(typeName?: string, fullTypeString?: string): boolean {
    if (!typeName) return false;
    
    // 排除原始类型和常见内建类型
    const builtInTypes = new Set([
      'string', 'number', 'boolean', 'object', 'undefined', 'null', 'void', 'any', 'unknown',
      'Date', 'Array', 'Map', 'Set', 'Promise', 'Function', 'RegExp', 'Error',
      '__type', // TypeScript 内部类型
    ]);
    
    if (builtInTypes.has(typeName)) {
      return false;
    }
    
    // 检查是否为数字字面量类型或其他原始类型
    if (/^\d+$/.test(typeName) || typeName.includes('|') || typeName.includes('&')) {
      return false;
    }
    
    return true;
  }
  private analyzeMethod(node: ts.MethodDeclaration, sourceFile: ts.SourceFile): any {
    if (!ts.isIdentifier(node.name)) return null;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    const parameters = node.parameters.map(param => ({
      name: param.name.getText(sourceFile),
      type: Utils.getTypeString(this.typeChecker, param),
      isOptional: !!param.questionToken,
      isRest: !!param.dotDotDotToken
    }));

    return {
      type: 'method',
      id,
      name,
      location,
      accessibility: Utils.getVisibility(node),
      documentation: Utils.getDocumentation(node),
      parameters,
      returnType: Utils.getTypeString(this.typeChecker, node),
      isStatic: Utils.isStatic(node),
      isAbstract: Utils.isAbstract(node),
      isAsync: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword))
    };
  }

  /**
   * 分析构造函数
   */
  private analyzeConstructor(node: ts.ConstructorDeclaration, sourceFile: ts.SourceFile): any {
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId('constructor', location);

    const parameters = node.parameters.map(param => ({
      name: param.name.getText(sourceFile),
      type: Utils.getTypeString(this.typeChecker, param),
      isOptional: !!param.questionToken,
      isRest: !!param.dotDotDotToken
    }));

    return {
      type: 'constructor',
      id,
      name: 'constructor',
      location,
      documentation: Utils.getDocumentation(node),
      parameters
    };
  }

  /**
   * 分析属性签名（接口中的属性）
   */
  private analyzePropertySignature(node: ts.PropertySignature, sourceFile: ts.SourceFile): any {
    if (!ts.isIdentifier(node.name)) return null;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    // 获取属性的类型信息
    const propertyTypeString = Utils.getTypeString(this.typeChecker, node);
    const typeInfo = this.analyzePropertySignatureType(node, sourceFile, propertyTypeString);

    return {
      type: 'property',
      id,
      name,
      location,
      documentation: Utils.getDocumentation(node),
      propertyType: propertyTypeString,
      typeClassName: typeInfo?.className,
      typeFilePath: typeInfo?.filePath,
      isCustomType: typeInfo?.isCustomType,
      isReadonly: Utils.isReadonly(node)
    };
  }

  /**
   * 分析接口属性类型信息
   */
  private analyzePropertySignatureType(node: ts.PropertySignature, sourceFile: ts.SourceFile, typeString?: string): {
    className?: string;
    filePath?: string;
    isCustomType?: boolean;
  } | undefined {
    try {
      // 获取属性的类型
      const type = this.typeChecker.getTypeAtLocation(node);
      const symbol = type.getSymbol();
      
      if (symbol) {
        const className = symbol.getName();
        
        // 检查是否为自定义类型
        const isCustomType = this.isCustomType(className, typeString);
        
        if (isCustomType) {
          // 尝试找到类型的定义位置
          const declarations = symbol.valueDeclaration;
          if (declarations) {
            const declarationFile = declarations.getSourceFile();
            return {
              className: className,
              filePath: declarationFile.fileName,
              isCustomType: true
            };
          }
          
          // 如果没有找到声明，尝试从已知符号中查找
          const knownSymbol = this.findSymbolByName(className, sourceFile.fileName);
          if (knownSymbol) {
            return {
              className: className,
              filePath: knownSymbol.location.filePath,
              isCustomType: true
            };
          }
          
          return {
            className: className,
            isCustomType: true
          };
        }
      }
      
      // 处理数组类型
      if (typeString) {
        const arrayMatch = typeString.match(/^(\w+)\[\]$/) || typeString.match(/^Array<(\w+)>$/);
        if (arrayMatch) {
          const elementType = arrayMatch[1];
          if (this.isCustomType(elementType)) {
            const elementSymbol = this.findSymbolByName(elementType, sourceFile.fileName);
            return {
              className: elementType,
              filePath: elementSymbol?.location.filePath,
              isCustomType: true
            };
          }
        }
      }
    } catch (error) {
      // 类型检查失败，尝试从类型字符串推断
      if (typeString && this.isCustomType(typeString)) {
        const symbolFromString = this.findSymbolByName(typeString, sourceFile.fileName);
        if (symbolFromString) {
          return {
            className: typeString,
            filePath: symbolFromString.location.filePath,
            isCustomType: true
          };
        }
      }
    }
    
    return undefined;
  }
  private analyzeMethodSignature(node: ts.MethodSignature, sourceFile: ts.SourceFile): any {
    if (!ts.isIdentifier(node.name)) return null;

    const name = node.name.text;
    const location = Utils.getLocation(node, sourceFile);
    const id = Utils.generateId(name, location);

    const parameters = node.parameters.map(param => ({
      name: param.name.getText(sourceFile),
      type: Utils.getTypeString(this.typeChecker, param),
      isOptional: !!param.questionToken,
      isRest: !!param.dotDotDotToken
    }));

    return {
      type: 'method',
      id,
      name,
      location,
      documentation: Utils.getDocumentation(node),
      parameters,
      returnType: Utils.getTypeString(this.typeChecker, node)
    };
  }

  /**
   * 分析导入声明
   */
  private analyzeImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }

    const importPath = node.moduleSpecifier.text;
    const location = Utils.getLocation(node, sourceFile);

    if (node.importClause) {
      // 默认导入
      if (node.importClause.name) {
        this.importRelations.push({
          importer: sourceFile.fileName,
          imported: importPath,
          importType: 'default',
          importName: node.importClause.name.text,
          location
        });
      }

      // 命名导入
      if (node.importClause.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            this.importRelations.push({
              importer: sourceFile.fileName,
              imported: importPath,
              importType: 'named',
              importName: element.name.text,
              location
            });
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          // 命名空间导入
          this.importRelations.push({
            importer: sourceFile.fileName,
            imported: importPath,
            importType: 'namespace',
            importName: node.importClause.namedBindings.name.text,
            location
          });
        }
      }
    } else {
      // 副作用导入
      this.importRelations.push({
        importer: sourceFile.fileName,
        imported: importPath,
        importType: 'sideEffect',
        location
      });
    }
  }

  /**
   * 分析导出声明
   */
  private analyzeExport(node: ts.Node, sourceFile: ts.SourceFile): void {
    const location = Utils.getLocation(node, sourceFile);

    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        // 重新导出
        const exportPath = node.moduleSpecifier.text;
        
        if (node.exportClause) {
          if (ts.isNamedExports(node.exportClause)) {
            for (const element of node.exportClause.elements) {
              this.exportRelations.push({
                exporter: sourceFile.fileName,
                exported: exportPath,
                exportType: 'reexport',
                exportName: element.name.text,
                location
              });
            }
          }
        } else {
          // export * from 'module'
          this.exportRelations.push({
            exporter: sourceFile.fileName,
            exported: exportPath,
            exportType: 'reexport',
            location
          });
        }
      }
    } else if (ts.isExportAssignment(node)) {
      // export = 或 export default
      this.exportRelations.push({
        exporter: sourceFile.fileName,
        exported: sourceFile.fileName,
        exportType: 'default',
        location
      });
    }
  }

  /**
   * 分析函数调用
   */
  private analyzeCall(node: ts.CallExpression | ts.NewExpression, sourceFile: ts.SourceFile): void {
    const location = Utils.getLocation(node, sourceFile);
    
    // 获取调用者信息
    const caller = this.findContainingFunctionDetails(node, sourceFile);
    if (!caller) return;

    // 获取被调用者信息
    const callee = this.extractCalleeDetails(node, sourceFile);
    if (!callee) return;

    this.callRelations.push({
      caller,
      callee,
      callType: callee.type || 'function',
      location
    });
  }

  /**
   * 分析属性访问
   */
  private analyzePropertyAccess(node: ts.PropertyAccessExpression, sourceFile: ts.SourceFile): void {
    const location = Utils.getLocation(node, sourceFile);
    
    // 获取调用者信息（包含此属性访问的函数/方法）
    const caller = this.findContainingFunctionDetails(node, sourceFile);
    if (!caller) return;

    // 获取属性访问的详细信息
    const propertyAccess = this.extractPropertyAccessDetails(node, sourceFile);
    if (!propertyAccess) return;

    this.callRelations.push({
      caller,
      callee: propertyAccess,
      callType: 'property',
      location
    });
  }

  /**
   * 提取被调用者的详细信息
   */
  private extractCalleeDetails(node: ts.CallExpression | ts.NewExpression, sourceFile: ts.SourceFile): CallRelationParticipant | undefined {
    let callee: CallRelationParticipant | undefined;

    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        // 方法调用: obj.method()
        const methodName = node.expression.name.text;
        const objectExpression = node.expression.expression;
        
        // 尝试获取对象的类型信息
        const objectType = this.getObjectTypeInfo(objectExpression, sourceFile);
        
        callee = {
          name: methodName,
          type: 'method',
          className: objectType?.className,
          filePath: objectType?.filePath || sourceFile.fileName
        };
      } else if (ts.isIdentifier(node.expression)) {
        // 函数调用: func()
        const functionName = node.expression.text;
        const functionSymbol = this.findSymbolByName(functionName, sourceFile.fileName);
        
        callee = {
          name: functionName,
          type: 'function',
          id: functionSymbol?.id,
          filePath: functionSymbol?.location.filePath || sourceFile.fileName
        };
      }
    } else if (ts.isNewExpression(node)) {
      // 构造函数调用: new Class()
      if (ts.isIdentifier(node.expression)) {
        const className = node.expression.text;
        const classSymbol = this.findSymbolByName(className, sourceFile.fileName);
        
        callee = {
          name: 'constructor',
          type: 'constructor',
          className: className,
          id: classSymbol?.id,
          filePath: classSymbol?.location.filePath || sourceFile.fileName
        };
      }
    }

    return callee;
  }

  /**
   * 提取属性访问的详细信息
   */
  private extractPropertyAccessDetails(node: ts.PropertyAccessExpression, sourceFile: ts.SourceFile): CallRelationParticipant | undefined {
    const propertyName = node.name.text;
    const objectExpression = node.expression;
    
    // 获取对象的类型信息
    const objectType = this.getObjectTypeInfo(objectExpression, sourceFile);
    
    // 尝试从已知符号中查找属性定义
    let propertySymbol: Symbol | undefined;
    
    if (objectType?.className) {
      // 查找类中的属性
      const classSymbol = this.findSymbolByName(objectType.className, sourceFile.fileName);
      if (classSymbol && (classSymbol.type === 'class' || classSymbol.type === 'interface')) {
        const classData = classSymbol as any;
        propertySymbol = classData.properties?.find((prop: any) => prop.name === propertyName);
      }
    }
    
    // 如果没有找到属性定义，尝试查找所有同名属性
    if (!propertySymbol) {
      propertySymbol = this.symbols.find(s => 
        (s.type === 'property' || s.type === 'variable') && s.name === propertyName
      );
    }

    return {
      name: propertyName,
      type: 'property',
      className: objectType?.className,
      id: propertySymbol?.id,
      filePath: propertySymbol?.location.filePath || objectType?.filePath || sourceFile.fileName
    };
  }
  private getObjectTypeInfo(expression: ts.Expression, sourceFile: ts.SourceFile): { className?: string, filePath?: string } | undefined {
    try {
      const type = this.typeChecker.getTypeAtLocation(expression);
      const symbol = type.getSymbol();
      
      if (symbol) {
        const className = symbol.getName();
        
        // 尝试找到类的定义位置
        const declarations = symbol.valueDeclaration;
        if (declarations) {
          const declarationFile = declarations.getSourceFile();
          return {
            className: className,
            filePath: declarationFile.fileName
          };
        }
        
        return { className };
      }
    } catch (error) {
      // 如果类型检查失败，尝试通过表达式推断
    }

    // 如果是简单的标识符，尝试查找变量声明
    if (ts.isIdentifier(expression)) {
      const variableName = expression.text;
      const variableSymbol = this.findSymbolByName(variableName, sourceFile.fileName);
      
      if (variableSymbol && variableSymbol.type === 'variable') {
        const varSymbol = variableSymbol as any;
        // 尝试从类型字符串推断类名
        const typeString = varSymbol.variableType;
        if (typeString && typeString !== 'any') {
          return {
            className: typeString,
            filePath: variableSymbol.location.filePath
          };
        }
      }
    }

    return undefined;
  }

  /**
   * 根据名称查找符号
   */
  private findSymbolByName(name: string, currentFilePath: string): Symbol | undefined {
    // 首先在当前文件中查找
    let symbol = this.symbols.find(s => 
      s.name === name && s.location.filePath === currentFilePath
    );
    
    // 如果在当前文件中没找到，查找所有文件
    if (!symbol) {
      symbol = this.symbols.find(s => s.name === name);
    }
    
    return symbol;
  }

  /**
   * 查找包含给定节点的函数的详细信息
   */
  private findContainingFunctionDetails(node: ts.Node, sourceFile: ts.SourceFile): CallRelationParticipant | undefined {
    let current = node.parent;
    
    while (current) {
      if (ts.isFunctionDeclaration(current) && current.name) {
        const functionName = current.name.text;
        const functionSymbol = this.findSymbolByName(functionName, sourceFile.fileName);
        
        return {
          name: functionName,
          type: 'function',
          id: functionSymbol?.id,
          filePath: sourceFile.fileName
        };
      } else if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
        const methodName = current.name.text;
        const className = this.findContainingClassName(current);
        const methodSymbol = this.findSymbolByName(methodName, sourceFile.fileName);
        
        return {
          name: methodName,
          type: 'method',
          className: className,
          id: methodSymbol?.id,
          filePath: sourceFile.fileName
        };
      } else if (ts.isConstructorDeclaration(current)) {
        const className = this.findContainingClassName(current);
        const constructorSymbol = this.symbols.find(s => 
          s.type === 'constructor' && 
          s.location.filePath === sourceFile.fileName
        );
        
        return {
          name: 'constructor',
          type: 'constructor',
          className: className,
          id: constructorSymbol?.id,
          filePath: sourceFile.fileName
        };
      } else if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        // 对于箭头函数和函数表达式，继续向上查找
        current = current.parent;
        continue;
      }
      current = current.parent;
    }
    
    return undefined;
  }

  /**
   * 查找包含给定节点的类名
   */
  private findContainingClassName(node: ts.Node): string | undefined {
    let current = node.parent;
    
    while (current) {
      if (ts.isClassDeclaration(current) && current.name) {
        return current.name.text;
      }
      current = current.parent;
    }
    
    return undefined;
  }
}