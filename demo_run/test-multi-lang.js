#!/usr/bin/env node

/**
 * 测试多语言分析功能的简单脚本
 */

const { MultiLanguageAnalyzer } = require('../dist/index');
const path = require('path');

async function testMultiLanguageAnalysis() {
  console.log('🧪 测试多语言分析功能...\n');

  try {
    // 创建分析器实例
    const analyzer = new MultiLanguageAnalyzer(process.cwd(), {
      includeJavaScript: true,
      includeTypeScript: true,
      analyzeCallChains: true,
      detectPatterns: true,
      excludePatterns: ['node_modules/**', 'dist/**', 'test/**']
    });

    // 分析src目录
    const patterns = ['src/**/*.ts', 'src/**/*.js'];
    console.log(`📁 分析模式: ${patterns.join(', ')}`);
    
    const result = await analyzer.analyze(patterns);

    // 输出分析结果
    console.log('\n📊 分析结果:');
    console.log(`- 文件总数: ${result.files.length}`);
    console.log(`- 符号总数: ${result.symbols.length}`);
    console.log(`- 调用关系: ${result.callRelations.length}`);
    console.log(`- 导入关系: ${result.importRelations.length}`);
    
    if (result.metadata.languageDistribution) {
      console.log('\n🌐 语言分布:');
      const dist = result.metadata.languageDistribution;
      console.log(`- TypeScript: ${dist.typescript} (${dist.typescriptPercentage}%)`);
      console.log(`- JavaScript: ${dist.javascript} (${dist.javascriptPercentage}%)`);
    }

    if (result.metadata.complexityMetrics) {
      console.log('\n🔍 复杂度指标:');
      const metrics = result.metadata.complexityMetrics;
      console.log(`- 平均每符号调用数: ${metrics.avgCallsPerSymbol}`);
      console.log(`- 平均每文件导入数: ${metrics.avgImportsPerFile}`);
      console.log(`- 圈复杂度: ${metrics.cyclomaticComplexity}`);
      console.log(`- 耦合度: ${metrics.couplingDegree}`);
    }

    if (result.metadata.crossLanguageCalls) {
      console.log(`\n🔗 跨语言调用: ${result.metadata.crossLanguageCalls}`);
    }

    // 显示一些示例符号
    console.log('\n🔬 符号示例:');
    result.symbols.slice(0, 3).forEach((symbol, index) => {
      const lang = symbol.location.filePath.endsWith('.js') ? 'JavaScript' : 'TypeScript';
      console.log(`${index + 1}. [${lang}] ${symbol.type}: ${symbol.name}`);
    });

    console.log('\n✅ 多语言分析测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testMultiLanguageAnalysis();