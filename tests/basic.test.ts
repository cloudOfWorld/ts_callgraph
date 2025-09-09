import { TypeScriptAnalyzer } from '../src/core/analyzer';
import { JsonFormatter } from '../src/formatters/json';
import * as path from 'path';

describe('TypeScript CallGraph Analyzer', () => {
  test('should analyze simple TypeScript files', async () => {
    const analyzer = new TypeScriptAnalyzer(process.cwd());
    
    // 分析示例文件
    const patterns = [path.join(process.cwd(), 'examples/*.ts')];
    const result = await analyzer.analyze(patterns);

    // 验证基本结果
    expect(result.symbols).toBeDefined();
    expect(result.callRelations).toBeDefined();
    expect(result.importRelations).toBeDefined();
    expect(result.files).toHaveLength(2);
    expect(result.symbols.length).toBeGreaterThan(0);
  });

  test('should format results as JSON', () => {
    const mockResult = {
      symbols: [],
      callRelations: [],
      importRelations: [],
      exportRelations: [],
      files: ['test.ts'],
      metadata: {
        analysisDate: new Date(),
        totalFiles: 1,
        totalSymbols: 0,
        totalCallRelations: 0
      }
    };

    const formatter = new JsonFormatter();
    const json = formatter.format(mockResult);
    
    expect(() => JSON.parse(json)).not.toThrow();
    
    const parsed = JSON.parse(json);
    expect(parsed.files).toEqual(['test.ts']);
    expect(parsed.metadata.totalFiles).toBe(1);
  });
});