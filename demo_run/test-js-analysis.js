#!/usr/bin/env node

/**
 * 测试JavaScript文件分析功能
 */

const { MultiLanguageAnalyzer } = require('../dist/index');
const path = require('path');

async function testJavaScriptAnalysis() {
  console.log('🟨 测试JavaScript文件分析功能...\n');

  try {
    // 获取项目根目录路径（上级目录）
    const rootPath = path.resolve(__dirname, '..');
    
    // 创建分析器实例，只分析JavaScript文件
    const analyzer = new MultiLanguageAnalyzer(rootPath, {
      includeJavaScript: true,
      includeTypeScript: false,  // 只分析JavaScript
      analyzeCallChains: true,
      detectPatterns: true,
      excludePatterns: ['node_modules/**', 'dist/**']
    });

    // 分析examples目录中的JavaScript文件
    const patterns = [
      path.join(rootPath, 'examples/demo-project/src/**/*.js'), 
      path.join(rootPath, 'examples/demo-project/config/**/*.js')
    ];
    console.log(`📁 分析模式: ${patterns.join(', ')}`);
    console.log(`📂 项目根目录: ${rootPath}`);
    
    const result = await analyzer.analyze(patterns);

    // 输出分析结果
    console.log('\n📊 JavaScript分析结果:');
    console.log(`- JavaScript文件: ${result.files.length}`);
    console.log(`- 符号总数: ${result.symbols.length}`);
    console.log(`- 调用关系: ${result.callRelations.length}`);
    console.log(`- 导入关系: ${result.importRelations.length}`);
    
    // 显示JavaScript特有的符号
    console.log('\n🔬 JavaScript符号详情:');
    const jsSymbols = result.symbols.filter(s => s.location.filePath.endsWith('.js'));
    
    const symbolsByType = {};
    jsSymbols.forEach(symbol => {
      if (!symbolsByType[symbol.type]) {
        symbolsByType[symbol.type] = [];
      }
      symbolsByType[symbol.type].push(symbol);
    });

    Object.keys(symbolsByType).forEach(type => {
      console.log(`  ${type}: ${symbolsByType[type].length}个`);
      symbolsByType[type].slice(0, 3).forEach(symbol => {
        console.log(`    - ${symbol.name}`);
      });
    });

    // 显示调用关系示例
    console.log('\n🔗 调用关系示例:');
    result.callRelations.slice(0, 5).forEach((relation, index) => {
      console.log(`${index + 1}. ${relation.caller.name} -> ${relation.callee.name} (${relation.callType})`);
    });

    console.log('\n✅ JavaScript分析测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testJavaScriptAnalysis();