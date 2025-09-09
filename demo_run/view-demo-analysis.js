#!/usr/bin/env node

/**
 * 查看demo项目分析结果概要
 */

const fs = require('fs');
const path = require('path');

function analyzeResults() {
  const jsonPath = path.join(__dirname, 'demo-analysis.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('分析结果文件不存在:', jsonPath);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log('📊 Demo项目分析结果概要');
    console.log('='.repeat(50));
    
    // 基本统计
    console.log(`📁 总文件数: ${data.files.length}`);
    console.log(`🔧 总符号数: ${data.symbols.length}`);
    console.log(`📞 调用关系: ${data.callRelations.length}`);
    console.log(`📦 导入关系: ${data.importRelations.length}`);
    console.log(`📤 导出关系: ${data.exportRelations.length}`);
    
    // 文件分类
    console.log('\n📋 文件分类:');
    const filesByLang = {
      typescript: data.files.filter(f => /\.(ts|tsx)$/.test(f)).length,
      javascript: data.files.filter(f => /\.(js|jsx|mjs|cjs)$/.test(f)).length
    };
    
    console.log(`  TypeScript: ${filesByLang.typescript} 文件`);
    console.log(`  JavaScript: ${filesByLang.javascript} 文件`);
    
    // 符号类型分布
    console.log('\n🏷️ 符号类型分布:');
    const symbolTypes = {};
    data.symbols.forEach(symbol => {
      symbolTypes[symbol.type] = (symbolTypes[symbol.type] || 0) + 1;
    });
    
    Object.entries(symbolTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // 调用类型分布
    console.log('\n📞 调用类型分布:');
    const callTypes = {};
    data.callRelations.forEach(call => {
      callTypes[call.callType] = (callTypes[call.callType] || 0) + 1;
    });
    
    Object.entries(callTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // 跨文件调用统计
    console.log('\n🔗 跨文件调用分析:');
    let crossFileCount = 0;
    let crossLanguageCount = 0;
    
    data.callRelations.forEach(call => {
      if (call.caller.filePath && call.callee.filePath) {
        if (call.caller.filePath !== call.callee.filePath) {
          crossFileCount++;
          
          const callerLang = /\.(ts|tsx)$/.test(call.caller.filePath) ? 'ts' : 'js';
          const calleeLang = /\.(ts|tsx)$/.test(call.callee.filePath) ? 'ts' : 'js';
          
          if (callerLang !== calleeLang) {
            crossLanguageCount++;
          }
        }
      }
    });
    
    console.log(`  跨文件调用: ${crossFileCount}`);
    console.log(`  跨语言调用: ${crossLanguageCount}`);
    console.log(`  同文件调用: ${data.callRelations.length - crossFileCount}`);
    
    // 导入分析
    console.log('\n📦 导入关系分析:');
    const importTypes = {};
    data.importRelations.forEach(imp => {
      importTypes[imp.importType] = (importTypes[imp.importType] || 0) + 1;
    });
    
    Object.entries(importTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // 文件详情
    console.log('\n📁 文件详情:');
    data.files.forEach(file => {
      const lang = /\.(ts|tsx)$/.test(file) ? 'TS' : 'JS';
      const basename = path.basename(file);
      const symbolsInFile = data.symbols.filter(s => s.location.filePath === file).length;
      console.log(`  [${lang}] ${basename} - ${symbolsInFile} 符号`);
    });
    
    // 元数据
    if (data.metadata) {
      console.log('\n📈 增强分析信息:');
      
      if (data.metadata.languageDistribution) {
        const dist = data.metadata.languageDistribution;
        console.log(`  TypeScript占比: ${dist.typescriptPercentage}%`);
        console.log(`  JavaScript占比: ${dist.javascriptPercentage}%`);
      }
      
      if (data.metadata.complexityMetrics) {
        const metrics = data.metadata.complexityMetrics;
        console.log(`  平均每符号调用数: ${metrics.avgCallsPerSymbol}`);
        console.log(`  平均每文件导入数: ${metrics.avgImportsPerFile}`);
        console.log(`  耦合度: ${metrics.couplingDegree}`);
      }
      
      if (data.metadata.crossLanguageCalls !== undefined) {
        console.log(`  跨语言调用总数: ${data.metadata.crossLanguageCalls}`);
      }
    }
    
    console.log('\n='.repeat(50));
    console.log('✅ 分析完成');
    
  } catch (error) {
    console.error('读取分析结果失败:', error.message);
  }
}

analyzeResults();