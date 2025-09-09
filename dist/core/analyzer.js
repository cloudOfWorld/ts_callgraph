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
exports.TypeScriptAnalyzer = void 0;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
/**
 * TypeScript AST 分析器核心类
 */
class TypeScriptAnalyzer {
    constructor(rootPath, options = {}) {
        this.rootPath = rootPath;
        this.options = options;
        this.symbols = [];
        this.callRelations = [];
        this.importRelations = [];
        this.exportRelations = [];
        this.processedFiles = new Set();
        this.initialize();
    }
    /**
     * 初始化TypeScript程序和类型检查器
     */
    initialize() {
        // 创建TypeScript编译选项
        const compilerOptions = {
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
            const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
            Object.assign(compilerOptions, parsedConfig.options);
        }
        // 创建程序
        this.program = ts.createProgram([], compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }
    /**
     * 分析指定的文件或目录
     */
    async analyze(patterns) {
        this.reset();
        // 查找所有匹配的文件
        const excludePatterns = this.options.excludePatterns || ['node_modules/**', '**/*.d.ts'];
        const files = await utils_1.Utils.findFiles(patterns, excludePatterns);
        const tsFiles = files.filter(file => utils_1.Utils.isTypeScriptFile(file));
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
    reset() {
        this.symbols = [];
        this.callRelations = [];
        this.importRelations = [];
        this.exportRelations = [];
        this.processedFiles.clear();
    }
    /**
     * 分析单个文件
     */
    async analyzeFile(filePath) {
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
    visitNode(node, sourceFile) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                this.analyzeClass(node, sourceFile);
                break;
            case ts.SyntaxKind.InterfaceDeclaration:
                this.analyzeInterface(node, sourceFile);
                break;
            case ts.SyntaxKind.FunctionDeclaration:
                this.analyzeFunction(node, sourceFile);
                break;
            case ts.SyntaxKind.VariableDeclaration:
                this.analyzeVariable(node, sourceFile);
                break;
            case ts.SyntaxKind.ImportDeclaration:
                this.analyzeImport(node, sourceFile);
                break;
            case ts.SyntaxKind.ExportDeclaration:
            case ts.SyntaxKind.ExportAssignment:
                this.analyzeExport(node, sourceFile);
                break;
            case ts.SyntaxKind.CallExpression:
            case ts.SyntaxKind.NewExpression:
                this.analyzeCall(node, sourceFile);
                break;
        }
        // 递归访问子节点
        ts.forEachChild(node, child => this.visitNode(child, sourceFile));
    }
    /**
     * 分析类声明
     */
    analyzeClass(node, sourceFile) {
        if (!node.name)
            return;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        // 提取继承和实现的类型
        const extendsClause = node.heritageClauses
            ?.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)
            .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));
        const implementsClause = node.heritageClauses
            ?.filter(clause => clause.token === ts.SyntaxKind.ImplementsKeyword)
            .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));
        // 分析类成员
        const properties = [];
        const methods = [];
        const constructors = [];
        for (const member of node.members) {
            if (ts.isPropertyDeclaration(member)) {
                properties.push(this.analyzeProperty(member, sourceFile));
            }
            else if (ts.isMethodDeclaration(member)) {
                methods.push(this.analyzeMethod(member, sourceFile));
            }
            else if (ts.isConstructorDeclaration(member)) {
                constructors.push(this.analyzeConstructor(member, sourceFile));
            }
        }
        this.symbols.push({
            type: 'class',
            id,
            name,
            location,
            visibility: utils_1.Utils.getVisibility(node),
            isExported: utils_1.Utils.isExported(node),
            documentation: utils_1.Utils.getDocumentation(node),
            isAbstract: utils_1.Utils.isAbstract(node),
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
    analyzeInterface(node, sourceFile) {
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        // 提取继承的接口
        const extendsClause = node.heritageClauses
            ?.filter(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)
            .flatMap(clause => clause.types.map(type => type.expression.getText(sourceFile)));
        // 分析接口成员
        const properties = [];
        const methods = [];
        for (const member of node.members) {
            if (ts.isPropertySignature(member)) {
                properties.push(this.analyzePropertySignature(member, sourceFile));
            }
            else if (ts.isMethodSignature(member)) {
                methods.push(this.analyzeMethodSignature(member, sourceFile));
            }
        }
        this.symbols.push({
            type: 'interface',
            id,
            name,
            location,
            isExported: utils_1.Utils.isExported(node),
            documentation: utils_1.Utils.getDocumentation(node),
            extends: extendsClause,
            properties: properties.filter(p => p),
            methods: methods.filter(m => m)
        });
    }
    /**
     * 分析函数声明
     */
    analyzeFunction(node, sourceFile) {
        if (!node.name)
            return;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        const parameters = node.parameters.map(param => ({
            name: param.name.getText(sourceFile),
            type: utils_1.Utils.getTypeString(this.typeChecker, param),
            isOptional: !!param.questionToken,
            isRest: !!param.dotDotDotToken
        }));
        this.symbols.push({
            type: 'function',
            id,
            name,
            location,
            isExported: utils_1.Utils.isExported(node),
            documentation: utils_1.Utils.getDocumentation(node),
            parameters,
            returnType: utils_1.Utils.getTypeString(this.typeChecker, node),
            isAsync: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)),
            isGenerator: !!node.asteriskToken
        });
    }
    /**
     * 分析变量声明
     */
    analyzeVariable(node, sourceFile) {
        if (!ts.isIdentifier(node.name))
            return;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
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
            variableType: utils_1.Utils.getTypeString(this.typeChecker, node),
            isConst,
            isLet
        });
    }
    /**
     * 分析属性声明
     */
    analyzeProperty(node, sourceFile) {
        if (!ts.isIdentifier(node.name))
            return null;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        return {
            type: 'property',
            id,
            name,
            location,
            accessibility: utils_1.Utils.getVisibility(node),
            documentation: utils_1.Utils.getDocumentation(node),
            propertyType: utils_1.Utils.getTypeString(this.typeChecker, node),
            isStatic: utils_1.Utils.isStatic(node),
            isReadonly: utils_1.Utils.isReadonly(node)
        };
    }
    /**
     * 分析方法声明
     */
    analyzeMethod(node, sourceFile) {
        if (!ts.isIdentifier(node.name))
            return null;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        const parameters = node.parameters.map(param => ({
            name: param.name.getText(sourceFile),
            type: utils_1.Utils.getTypeString(this.typeChecker, param),
            isOptional: !!param.questionToken,
            isRest: !!param.dotDotDotToken
        }));
        return {
            type: 'method',
            id,
            name,
            location,
            accessibility: utils_1.Utils.getVisibility(node),
            documentation: utils_1.Utils.getDocumentation(node),
            parameters,
            returnType: utils_1.Utils.getTypeString(this.typeChecker, node),
            isStatic: utils_1.Utils.isStatic(node),
            isAbstract: utils_1.Utils.isAbstract(node),
            isAsync: !!(node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword))
        };
    }
    /**
     * 分析构造函数
     */
    analyzeConstructor(node, sourceFile) {
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId('constructor', location);
        const parameters = node.parameters.map(param => ({
            name: param.name.getText(sourceFile),
            type: utils_1.Utils.getTypeString(this.typeChecker, param),
            isOptional: !!param.questionToken,
            isRest: !!param.dotDotDotToken
        }));
        return {
            type: 'constructor',
            id,
            name: 'constructor',
            location,
            documentation: utils_1.Utils.getDocumentation(node),
            parameters
        };
    }
    /**
     * 分析属性签名（接口中的属性）
     */
    analyzePropertySignature(node, sourceFile) {
        if (!ts.isIdentifier(node.name))
            return null;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        return {
            type: 'property',
            id,
            name,
            location,
            documentation: utils_1.Utils.getDocumentation(node),
            propertyType: utils_1.Utils.getTypeString(this.typeChecker, node),
            isReadonly: utils_1.Utils.isReadonly(node)
        };
    }
    /**
     * 分析方法签名（接口中的方法）
     */
    analyzeMethodSignature(node, sourceFile) {
        if (!ts.isIdentifier(node.name))
            return null;
        const name = node.name.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
        const id = utils_1.Utils.generateId(name, location);
        const parameters = node.parameters.map(param => ({
            name: param.name.getText(sourceFile),
            type: utils_1.Utils.getTypeString(this.typeChecker, param),
            isOptional: !!param.questionToken,
            isRest: !!param.dotDotDotToken
        }));
        return {
            type: 'method',
            id,
            name,
            location,
            documentation: utils_1.Utils.getDocumentation(node),
            parameters,
            returnType: utils_1.Utils.getTypeString(this.typeChecker, node)
        };
    }
    /**
     * 分析导入声明
     */
    analyzeImport(node, sourceFile) {
        if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
            return;
        }
        const importPath = node.moduleSpecifier.text;
        const location = utils_1.Utils.getLocation(node, sourceFile);
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
                }
                else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
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
        }
        else {
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
    analyzeExport(node, sourceFile) {
        const location = utils_1.Utils.getLocation(node, sourceFile);
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
                }
                else {
                    // export * from 'module'
                    this.exportRelations.push({
                        exporter: sourceFile.fileName,
                        exported: exportPath,
                        exportType: 'reexport',
                        location
                    });
                }
            }
        }
        else if (ts.isExportAssignment(node)) {
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
    analyzeCall(node, sourceFile) {
        const location = utils_1.Utils.getLocation(node, sourceFile);
        // 获取调用者信息
        const caller = this.findContainingFunction(node, sourceFile);
        if (!caller)
            return;
        // 获取被调用者信息
        let callee;
        let callType = 'function';
        if (ts.isCallExpression(node)) {
            if (ts.isPropertyAccessExpression(node.expression)) {
                // 方法调用: obj.method()
                callee = node.expression.name.text;
                callType = 'method';
            }
            else if (ts.isIdentifier(node.expression)) {
                // 函数调用: func()
                callee = node.expression.text;
                callType = 'function';
            }
        }
        else if (ts.isNewExpression(node)) {
            // 构造函数调用: new Class()
            if (ts.isIdentifier(node.expression)) {
                callee = node.expression.text;
                callType = 'constructor';
            }
        }
        if (callee) {
            this.callRelations.push({
                caller,
                callee,
                callType,
                location
            });
        }
    }
    /**
     * 查找包含给定节点的函数
     */
    findContainingFunction(node, sourceFile) {
        let current = node.parent;
        while (current) {
            if (ts.isFunctionDeclaration(current) && current.name) {
                return current.name.text;
            }
            else if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
                return current.name.text;
            }
            else if (ts.isConstructorDeclaration(current)) {
                return 'constructor';
            }
            else if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
                // 对于箭头函数和函数表达式，继续向上查找
                current = current.parent;
                continue;
            }
            current = current.parent;
        }
        return undefined;
    }
}
exports.TypeScriptAnalyzer = TypeScriptAnalyzer;
//# sourceMappingURL=analyzer.js.map