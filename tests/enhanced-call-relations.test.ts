import { TypeScriptAnalyzer } from '../src/core/analyzer';
import { CallRelation, CallRelationParticipant } from '../src/types';
import * as path from 'path';

describe('Enhanced Call Relation Analysis', () => {
  test('should provide detailed caller and callee information', async () => {
    const analyzer = new TypeScriptAnalyzer(process.cwd());
    
    // 分析示例文件
    const patterns = [path.join(process.cwd(), 'examples/*.ts')];
    const result = await analyzer.analyze(patterns);

    // 验证调用关系包含详细信息
    expect(result.callRelations.length).toBeGreaterThan(0);
    
    const sampleCall = result.callRelations[0];
    
    // 验证调用者信息
    expect(sampleCall.caller).toHaveProperty('name');
    expect(typeof sampleCall.caller).toBe('object');
    
    // 验证被调用者信息
    expect(sampleCall.callee).toHaveProperty('name');
    expect(typeof sampleCall.callee).toBe('object');
    
    // 验证新增字段
    const caller = sampleCall.caller as CallRelationParticipant;
    const callee = sampleCall.callee as CallRelationParticipant;
    
    expect(caller.name).toBeDefined();
    expect(caller.filePath).toBeDefined();
    
    expect(callee.name).toBeDefined();
    expect(callee.filePath).toBeDefined();
    
    console.log('Sample call relation:', {
      caller: {
        name: caller.name,
        className: caller.className,
        type: caller.type,
        filePath: caller.filePath ? path.basename(caller.filePath) : undefined
      },
      callee: {
        name: callee.name,
        className: callee.className,
        type: callee.type,
        filePath: callee.filePath ? path.basename(callee.filePath) : undefined
      },
      callType: sampleCall.callType
    });
  });

  test('should identify method calls with class information', async () => {
    const analyzer = new TypeScriptAnalyzer(process.cwd());
    
    const patterns = [path.join(process.cwd(), 'examples/*.ts')];
    const result = await analyzer.analyze(patterns);

    // 查找方法调用
    const methodCalls = result.callRelations.filter(call => call.callType === 'method');
    expect(methodCalls.length).toBeGreaterThan(0);
    
    // 验证至少有一些方法调用包含类信息
    const callsWithClass = methodCalls.filter(call => {
      const caller = call.caller as CallRelationParticipant;
      const callee = call.callee as CallRelationParticipant;
      return caller.className || callee.className;
    });
    
    expect(callsWithClass.length).toBeGreaterThan(0);
    
    // 显示示例
    const sampleMethodCall = callsWithClass[0];
    const caller = sampleMethodCall.caller as CallRelationParticipant;
    const callee = sampleMethodCall.callee as CallRelationParticipant;
    
    console.log('Sample method call with class info:', {
      caller: `${caller.className || '?'}.${caller.name}`,
      callee: `${callee.className || '?'}.${callee.name}`,
      callType: sampleMethodCall.callType
    });
  });
});