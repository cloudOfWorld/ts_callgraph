# Demo Run 目录说明

这个目录包含了 CallGraph 多语言分析器的演示和测试脚本。

## 📁 文件结构

```
demo_run/
├── test-multi-lang.js     # 多语言分析功能测试
├── test-js-analysis.js    # JavaScript专用分析测试  
├── run-demo.js            # 完整CLI演示脚本
├── demo.js               # 简单演示脚本
└── view-demo-analysis.js  # 分析结果查看器
```

## 🚀 使用方法

### 1. 多语言分析测试
```bash
cd demo_run
node test-multi-lang.js
```
- 测试TypeScript和JavaScript混合分析
- 显示语言分布和跨语言调用统计
- 展示复杂度指标

### 2. JavaScript专用测试  
```bash
cd demo_run
node test-js-analysis.js
```
- 仅分析JavaScript文件
- 显示JavaScript特有的符号类型
- 展示调用关系示例

### 3. 完整CLI演示
```bash
cd demo_run
node run-demo.js
```
- 运行8个不同的分析演示
- 生成JSON、HTML、Mermaid等多种格式
- 提供详细的性能统计和文件对比

### 4. 查看分析结果
```bash
cd demo_run
node view-demo-analysis.js [文件名]
```
- 查看和分析生成的JSON结果
- 显示详细的统计信息
- 支持跨语言调用分析

## 📊 演示内容

### CLI演示 (run-demo.js)
1. **演示1**: 分析所有文件 (TypeScript + JavaScript)
2. **演示2**: 仅分析TypeScript文件
3. **演示3**: 仅分析JavaScript文件  
4. **演示4**: 生成HTML可视化报告
5. **演示5**: 生成Mermaid类图
6. **演示6**: 生成简化类图
7. **演示7**: 多格式同时输出
8. **演示8**: 包含私有成员分析

### API测试
- **test-multi-lang.js**: 直接使用 MultiLanguageAnalyzer API
- **test-js-analysis.js**: JavaScript专用分析测试

## 🔧 路径配置

所有脚本都已配置为从 `demo_run` 子目录运行，路径引用已修复：

- CLI路径: `../dist/cli/index.js`
- Demo项目: `../examples/demo-project`  
- API引用: `../dist/index`

## 📈 输出文件

运行演示后会在 `demo_run/demo-outputs/` 目录生成：

- `all-files.json` - 完整项目分析
- `typescript-only.json` - 仅TypeScript分析
- `javascript-only.json` - 仅JavaScript分析
- `visualization.html` - 交互式可视化报告
- `class-diagram.mmd` - Mermaid类图
- `simple-class.mmd` - 简化类图
- `multi.*` - 多格式输出文件

## ⚡ 性能统计

演示会显示：
- 分析耗时
- 文件数量统计
- 符号和调用关系数量
- 跨语言调用统计
- 语言分布比例
- 复杂度指标

## 🎯 适用场景

1. **功能验证**: 验证多语言分析器功能
2. **性能测试**: 测试分析器在不同文件类型上的性能  
3. **演示展示**: 向用户展示工具的完整功能
4. **开发调试**: 开发过程中的功能测试

## 📝 注意事项

- 从 `demo_run` 目录运行脚本
- 确保项目已构建 (`npm run build`)
- 演示项目位于 `../examples/demo-project`
- 生成的文件会保存在当前目录的 `demo-outputs` 子目录中