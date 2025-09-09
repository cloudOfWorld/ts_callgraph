/**
 * 核心数据结构定义
 */

export interface Position {
  line: number;
  column: number;
}

export interface Location {
  filePath: string;
  start: Position;
  end: Position;
}

export interface BaseSymbol {
  id: string;
  name: string;
  location: Location;
  visibility?: 'public' | 'private' | 'protected';
  isExported?: boolean;
  documentation?: string;
}

export interface ClassSymbol extends BaseSymbol {
  type: 'class';
  isAbstract?: boolean;
  extends?: string[];
  implements?: string[];
  properties: PropertySymbol[];
  methods: MethodSymbol[];
  constructors: ConstructorSymbol[];
}

export interface InterfaceSymbol extends BaseSymbol {
  type: 'interface';
  extends?: string[];
  properties: PropertySymbol[];
  methods: MethodSymbol[];
}

export interface FunctionSymbol extends BaseSymbol {
  type: 'function';
  parameters: ParameterSymbol[];
  returnType?: string;
  isAsync?: boolean;
  isGenerator?: boolean;
}

export interface MethodSymbol extends BaseSymbol {
  type: 'method';
  parameters: ParameterSymbol[];
  returnType?: string;
  isAsync?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface ConstructorSymbol extends BaseSymbol {
  type: 'constructor';
  parameters: ParameterSymbol[];
}

export interface PropertySymbol extends BaseSymbol {
  type: 'property';
  propertyType?: string;
  isStatic?: boolean;
  isReadonly?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface VariableSymbol extends BaseSymbol {
  type: 'variable';
  variableType?: string;
  isConst?: boolean;
  isLet?: boolean;
}

export interface ParameterSymbol {
  name: string;
  type?: string;
  isOptional?: boolean;
  isRest?: boolean;
}

export type Symbol = ClassSymbol | InterfaceSymbol | FunctionSymbol | MethodSymbol | 
                    ConstructorSymbol | PropertySymbol | VariableSymbol;

export interface CallRelationParticipant {
  name: string;
  id?: string;
  className?: string;
  filePath?: string;
  type?: 'method' | 'function' | 'constructor' | 'property';
}

export interface CallRelation {
  caller: CallRelationParticipant;
  callee: CallRelationParticipant;
  callType: 'method' | 'function' | 'constructor' | 'property';
  location: Location;
}

export interface ImportRelation {
  importer: string;
  imported: string;
  importType: 'default' | 'named' | 'namespace' | 'sideEffect';
  importName?: string;
  location: Location;
}

export interface ExportRelation {
  exporter: string;
  exported: string;
  exportType: 'default' | 'named' | 'reexport';
  exportName?: string;
  location: Location;
}

export interface AnalysisResult {
  symbols: Symbol[];
  callRelations: CallRelation[];
  importRelations: ImportRelation[];
  exportRelations: ExportRelation[];
  files: string[];
  metadata: {
    analysisDate: Date;
    totalFiles: number;
    totalSymbols: number;
    totalCallRelations: number;
  };
}

export interface AnalysisOptions {
  includePrivate?: boolean;
  includeNodeModules?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  followImports?: boolean;
}