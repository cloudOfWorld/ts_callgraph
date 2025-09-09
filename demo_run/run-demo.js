#!/usr/bin/env node

/**
 * CallGraph Demo 演示脚本
 * 展示多语言分析器的各种功能和输出格式
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class DemoRunner {
  constructor() {
    this.cliPath = 'node ../dist/cli/index.js';  // 更新CLI路径
    this.demoPath = '../examples/demo-project';    // 更新demo路径
    this.outputDir = 'demo-outputs';
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 执行命令并返回Promise
   */
  runCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 执行: ${command}`);
      
      const startTime = Date.now();
      exec(command, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ 命令失败 (${duration}ms):`, error.message);
          reject(error);
        } else {
          console.log(`✅ 命令完成 (${duration}ms)`);
          if (stdout) console.log(stdout);
          if (stderr) console.warn(stderr);
          resolve({ stdout, stderr, duration });
        }
      });
    });
  }

  /**
   * 演示1: 分析所有文件类型
   */
  async demo1_AllFiles() {
    console.log('\n📊 演示1: 分析所有文件 (TypeScript + JavaScript)');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" "${this.demoPath}/config/**/*.js" -f json -o ${this.outputDir}/all-files.json --verbose`;
    
    const result = await this.runCommand(command);
    console.log('  结果: 生成完整项目分析报告');
    
    return result;
  }

  /**
   * 演示2: 仅分析TypeScript
   */
  async demo2_TypeScriptOnly() {
    console.log('\n🔷 演示2: 仅分析TypeScript文件');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.ts" --ts-only -f json -o ${this.outputDir}/typescript-only.json`;
    
    const result = await this.runCommand(command);
    console.log('  结果: TypeScript专用分析');
    
    return result;
  }

  /**
   * 演示3: 仅分析JavaScript
   */
  async demo3_JavaScriptOnly() {
    console.log('\n🟨 演示3: 仅分析JavaScript文件');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.js" "${this.demoPath}/config/**/*.js" --js-only -f json -o ${this.outputDir}/javascript-only.json`;
    
    const result = await this.runCommand(command);
    console.log('  结果: JavaScript专用分析');
    
    return result;
  }

  /**
   * 演示4: 生成HTML可视化报告
   */
  async demo4_HTMLVisualization() {
    console.log('\n🌐 演示4: 生成HTML可视化报告');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" -f html -o ${this.outputDir}/visualization.html`;
    
    const result = await this.runCommand(command);
    console.log('  结果: 交互式HTML报告');
    
    return result;
  }

  /**
   * 演示5: 生成Mermaid类图
   */
  async demo5_MermaidClassDiagram() {
    console.log('\n📈 演示5: 生成Mermaid类图');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" -f mermaid --class-diagram -o ${this.outputDir}/class-diagram.mmd`;
    
    const result = await this.runCommand(command);
    console.log('  结果: Mermaid类图');
    
    return result;
  }

  /**
   * 演示6: 生成简化类图
   */
  async demo6_SimpleClassDiagram() {
    console.log('\n📊 演示6: 生成简化类图 (兼容性更好)');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" -f mermaid --simple-class-diagram -o ${this.outputDir}/simple-class.mmd`;
    
    const result = await this.runCommand(command);
    console.log('  结果: 简化Mermaid类图');
    
    return result;
  }

  /**
   * 演示7: 多格式同时输出
   */
  async demo7_MultipleFormats() {
    console.log('\n🎯 演示7: 多格式同时输出');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" --json ${this.outputDir}/multi.json --html ${this.outputDir}/multi.html --mermaid ${this.outputDir}/multi.mmd`;
    
    const result = await this.runCommand(command);
    console.log('  结果: JSON + HTML + Mermaid');
    
    return result;
  }

  /**
   * 演示8: 包含私有成员分析
   */
  async demo8_IncludePrivate() {
    console.log('\n🔒 演示8: 包含私有成员分析');
    console.log('-'.repeat(60));
    
    const command = `${this.cliPath} "${this.demoPath}/src/**/*.{ts,js}" --include-private -f json -o ${this.outputDir}/with-private.json`;
    
    const result = await this.runCommand(command);
    console.log('  结果: 包含私有成员的完整分析');
    
    return result;
  }

  /**
   * 比较分析结果
   */
  async compareResults() {
    console.log('\n🔍 分析结果比较');
    console.log('='.repeat(60));
    
    const files = [
      { name: '完整项目', file: 'all-files.json' },
      { name: '仅TypeScript', file: 'typescript-only.json' },
      { name: '仅JavaScript', file: 'javascript-only.json' },
      { name: '包含私有', file: 'with-private.json' }
    ];
    
    console.log('| 分析类型 | 文件数 | 符号数 | 调用关系 | 导入关系 |');
    console.log('|----------|--------|--------|----------|----------|');
    
    files.forEach(({ name, file }) => {
      const filePath = path.join(this.outputDir, file);
      
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const fileCount = data.files?.length || 0;
          const symbolCount = data.symbols?.length || 0;
          const callCount = data.callRelations?.length || 0;
          const importCount = data.importRelations?.length || 0;
          
          console.log(`| ${name.padEnd(8)} | ${String(fileCount).padStart(6)} | ${String(symbolCount).padStart(6)} | ${String(callCount).padStart(8)} | ${String(importCount).padStart(8)} |`);
        } catch (error) {
          console.log(`| ${name.padEnd(8)} | 读取失败 |`);
        }
      } else {
        console.log(`| ${name.padEnd(8)} | 文件不存在 |`);
      }
    });
  }

  /**
   * 显示生成的文件
   */
  showGeneratedFiles() {
    console.log('\n📁 生成的文件列表');
    console.log('='.repeat(60));
    
    if (fs.existsSync(this.outputDir)) {
      const files = fs.readdirSync(this.outputDir);
      
      if (files.length === 0) {
        console.log('  (无生成文件)');
      } else {
        files.forEach(file => {
          const filePath = path.join(this.outputDir, file);
          const stats = fs.statSync(filePath);
          const size = (stats.size / 1024).toFixed(1);
          const ext = path.extname(file);
          
          let type = '';
          switch (ext) {
            case '.json': type = '📄 JSON数据'; break;
            case '.html': type = '🌐 HTML报告'; break;
            case '.mmd': type = '📈 Mermaid图'; break;
            default: type = '📄 文件'; break;
          }
          
          console.log(`  ${type} - ${file} (${size}KB)`);
        });
      }
    } else {
      console.log('  输出目录不存在');
    }
  }

  /**
   * 运行所有演示
   */
  async runAllDemos() {
    console.log('🚀 CallGraph 多语言分析器演示');
    console.log('='.repeat(80));
    console.log(`📂 Demo项目路径: ${this.demoPath}`);
    console.log(`📁 输出目录: ${this.outputDir}`);
    console.log('');

    const demos = [
      this.demo1_AllFiles,
      this.demo2_TypeScriptOnly,
      this.demo3_JavaScriptOnly,
      this.demo4_HTMLVisualization,
      this.demo5_MermaidClassDiagram,
      this.demo6_SimpleClassDiagram,
      this.demo7_MultipleFormats,
      this.demo8_IncludePrivate
    ];

    const results = [];
    let totalTime = 0;

    for (let i = 0; i < demos.length; i++) {
      try {
        const result = await demos[i].call(this);
        results.push({ demo: i + 1, success: true, duration: result.duration });
        totalTime += result.duration;
      } catch (error) {
        results.push({ demo: i + 1, success: false, error: error.message });
        console.error(`演示${i + 1}失败:`, error.message);
      }
    }

    // 显示结果比较
    await this.compareResults();

    // 显示生成的文件
    this.showGeneratedFiles();

    // 显示总结
    console.log('\n📈 演示总结');
    console.log('='.repeat(60));
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 成功: ${successCount}/${demos.length}`);
    console.log(`⏱️ 总耗时: ${totalTime}ms`);
    console.log(`📁 输出目录: ${path.resolve(this.outputDir)}`);
    
    if (successCount < demos.length) {
      console.log('\n❌ 失败的演示:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  演示${result.demo}: ${result.error}`);
      });
    }

    console.log('\n🎉 演示完成! 现在你可以:');
    console.log(`  1. 查看HTML报告: open ${this.outputDir}/visualization.html`);
    console.log(`  2. 检查JSON数据: cat ${this.outputDir}/all-files.json`);
    console.log(`  3. 查看Mermaid图: cat ${this.outputDir}/class-diagram.mmd`);
    
    return results;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const demo = new DemoRunner();
  
  demo.runAllDemos()
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 演示运行失败:', error);
      process.exit(1);
    });
}

module.exports = { DemoRunner };