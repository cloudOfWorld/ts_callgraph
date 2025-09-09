#!/usr/bin/env node

/**
 * 增强调用关系功能演示脚本
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('🔗 TypeScript CallGraph Analyzer - 增强调用关系演示'));
console.log(chalk.gray('=' * 60));

// 读取分析结果
const analysisPath = './enhanced-analysis.json';
if (!fs.existsSync(analysisPath)) {
  console.error(chalk.red('请先运行: node dist/cli.js examples/*.ts --format json --output enhanced-analysis.json'));
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

console.log(chalk.yellow('\n📊 分析结果概览:'));
console.log(`   • 文件数: ${analysis.files.length}`);
console.log(`   • 符号数: ${analysis.symbols.length}`);
console.log(`   • 调用关系: ${analysis.callRelations.length}`);

console.log(chalk.yellow('\n🔍 调用关系详细信息示例:'));

// 按调用类型分组
const callsByType = {
  method: [],
  constructor: [],
  function: [],
  property: []
};

analysis.callRelations.forEach(call => {
  callsByType[call.callType].push(call);
});

// 显示方法调用示例
console.log(chalk.green('\n📞 方法调用 (Method Calls):'));
callsByType.method.slice(0, 5).forEach((call, index) => {
  const caller = call.caller;
  const callee = call.callee;
  const callerClass = caller.className || '(全局)';
  const calleeClass = callee.className || '(全局)';
  const callerFile = path.basename(caller.filePath || call.location.filePath);
  const calleeFile = path.basename(callee.filePath || call.location.filePath);
  
  console.log(chalk.cyan(`   ${index + 1}. ${callerClass}.${caller.name}() 调用 ${calleeClass}.${callee.name}()`));
  console.log(chalk.gray(`      调用者文件: ${callerFile}`));
  console.log(chalk.gray(`      被调用者文件: ${calleeFile}`));
  console.log(chalk.gray(`      位置: ${call.location.start.line}:${call.location.start.column}\n`));
});

// 显示构造函数调用示例
console.log(chalk.green('🏗️  构造函数调用 (Constructor Calls):'));
callsByType.constructor.slice(0, 3).forEach((call, index) => {
  const caller = call.caller;
  const callee = call.callee;
  const callerClass = caller.className || '(全局)';
  const calleeClass = callee.className || '(全局)';
  
  console.log(chalk.cyan(`   ${index + 1}. ${callerClass}.${caller.name} 创建 new ${calleeClass}()`));
  console.log(chalk.gray(`      位置: ${path.basename(call.location.filePath)}:${call.location.start.line}:${call.location.start.column}\n`));
});

// 显示跨文件调用统计
console.log(chalk.yellow('\n📂 跨文件调用统计:'));
const crossFileCalls = analysis.callRelations.filter(call => {
  const callerFile = call.caller.filePath || call.location.filePath;
  const calleeFile = call.callee.filePath || call.location.filePath;
  return callerFile !== calleeFile;
});

console.log(`   • 跨文件调用数量: ${crossFileCalls.length}/${analysis.callRelations.length}`);
console.log(`   • 跨文件调用比例: ${((crossFileCalls.length / analysis.callRelations.length) * 100).toFixed(1)}%`);

if (crossFileCalls.length > 0) {
  console.log(chalk.green('\n🌐 跨文件调用示例:'));
  crossFileCalls.slice(0, 3).forEach((call, index) => {
    const caller = call.caller;
    const callee = call.callee;
    const callerFile = path.basename(caller.filePath || call.location.filePath);
    const calleeFile = path.basename(callee.filePath || call.location.filePath);
    
    console.log(chalk.cyan(`   ${index + 1}. ${callerFile} → ${calleeFile}`));
    console.log(chalk.gray(`      ${caller.className || '(全局)'}.${caller.name} 调用 ${callee.className || '(全局)'}.${callee.name}`));
  });
}

// 显示类依赖关系
console.log(chalk.yellow('\n🏛️  类间依赖关系:'));
const classDependencies = new Map();

analysis.callRelations.forEach(call => {
  const callerClass = call.caller.className;
  const calleeClass = call.callee.className;
  
  if (callerClass && calleeClass && callerClass !== calleeClass) {
    const key = `${callerClass} → ${calleeClass}`;
    classDependencies.set(key, (classDependencies.get(key) || 0) + 1);
  }
});

const sortedDependencies = Array.from(classDependencies.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

if (sortedDependencies.length > 0) {
  sortedDependencies.forEach(([dependency, count], index) => {
    console.log(chalk.cyan(`   ${index + 1}. ${dependency} (${count} 次调用)`));
  });
} else {
  console.log(chalk.gray('   未发现类间依赖关系'));
}

console.log(chalk.blue.bold('\n✨ 增强功能总结:'));
console.log(chalk.green('   ✅ 调用者类名和文件路径'));
console.log(chalk.green('   ✅ 被调用者类名和文件路径')); 
console.log(chalk.green('   ✅ 跨文件调用关系追踪'));
console.log(chalk.green('   ✅ 类间依赖关系分析'));
console.log(chalk.green('   ✅ 符号ID关联（便于进一步查询）'));

console.log(chalk.blue('\n🎯 这些信息对以下场景特别有用:'));
console.log('   • 代码重构时了解影响范围');
console.log('   • 架构分析和依赖梳理');
console.log('   • 代码审查和质量分析');
console.log('   • 新人代码理解和学习');