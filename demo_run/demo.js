#!/usr/bin/env node

/**
 * TypeScript CallGraph Analyzer - 演示脚本
 * 展示工具的核心功能
 */

const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('🚀 TypeScript CallGraph Analyzer 演示'));
console.log(chalk.gray('=' * 50));

// 演示命令列表
const demos = [
  {
    title: '📊 基本分析 - JSON格式',
    command: 'node',
    args: ['dist/cli.js', 'examples/*.ts', '--format', 'json', '--output', 'demo-analysis.json']
  },
  {
    title: '🎨 Mermaid图表生成',
    command: 'node', 
    args: ['dist/cli.js', 'examples/*.ts', '--format', 'mermaid', '--output', 'demo-diagram.mmd']
  },
  {
    title: '🌐 HTML可视化报告',
    command: 'node',
    args: ['dist/cli.js', 'examples/*.ts', '--format', 'html', '--output', 'demo-report.html']
  },
  {
    title: '🔍 详细分析（包含私有成员）',
    command: 'node',
    args: ['dist/cli.js', 'examples/*.ts', '--include-private', '--verbose', '--json', 'demo-detailed.json']
  }
];

async function runDemo(demo, index) {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow(`\n${index + 1}. ${demo.title}`));
    console.log(chalk.gray(`   命令: ${demo.command} ${demo.args.join(' ')}`));
    
    const child = spawn(demo.command, demo.args, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('   ✅ 成功完成'));
        // 显示输出的关键信息
        const lines = stdout.split('\n');
        lines.forEach(line => {
          if (line.includes('分析完成') || line.includes('输出:') || line.includes('耗时:')) {
            console.log(chalk.gray(`   ${line.trim()}`));
          }
        });
        resolve();
      } else {
        console.log(chalk.red('   ❌ 执行失败'));
        if (stderr) {
          console.log(chalk.red(`   错误: ${stderr}`));
        }
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log(chalk.blue('\n🔧 正在运行演示...'));
  
  try {
    for (let i = 0; i < demos.length; i++) {
      await runDemo(demos[i], i);
    }
    
    console.log(chalk.green.bold('\n🎉 所有演示完成！'));
    console.log(chalk.blue('\n📁 生成的文件:'));
    console.log(chalk.gray('   • demo-analysis.json - JSON格式分析结果'));
    console.log(chalk.gray('   • demo-diagram.mmd - Mermaid图表代码'));
    console.log(chalk.gray('   • demo-report.html - 交互式HTML报告'));
    console.log(chalk.gray('   • demo-detailed.json - 详细分析结果'));
    
    console.log(chalk.blue('\n🌐 查看HTML报告:'));
    console.log(chalk.cyan('   在浏览器中打开: demo-report.html'));
    
    console.log(chalk.blue('\n📊 查看Mermaid图表:'));
    console.log(chalk.cyan('   访问: https://mermaid.live/ 并粘贴 demo-diagram.mmd 的内容'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ 演示过程中出现错误:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}