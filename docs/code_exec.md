# code_exec.js 分析

## 概述
该文件演示了如何在 E2B 沙箱中动态创建和执行 JavaScript 代码文件。

## 主要功能
1. 创建 E2B 沙箱环境
2. 将 JavaScript 代码写入文件
3. 使用 Node.js 执行代码
4. 捕获并显示执行输出

## 代码结构分析

### 1. 沙箱初始化
```javascript
const sandbox = await Sandbox.create({
  template: 'base',
})
```
- 使用默认的 `base` 模板创建沙箱
- 未显式指定 API Key，将使用环境变量中的默认值

### 2. 准备代码内容
```javascript
const code = `
  const fs = require('fs');
  const dirContent = fs.readdirSync('/');
  dirContent.forEach((item) => {
    console.log('Root dir item inside playground:', item);
  });
`
```
- 创建一个读取根目录内容的 Node.js 脚本
- 使用 `fs` 模块读取文件系统
- 遍历并打印根目录下的所有项目

### 3. 保存代码到文件
```javascript
await sandbox.filesystem.write('/code/index.js', code)
```
- 使用文件系统 API 将代码写入 `/code/index.js`
- 创建了一个可执行的 JavaScript 文件

### 4. 执行代码
```javascript
const proc = await sandbox.process.start({
  cmd: 'node /code/index.js',
  onStdout: (data) => console.log(data.line),
  onStderr: (data) => console.log(data.line),
})
```
- 使用 Node.js 运行保存的脚本
- 实时流式输出标准输出和错误信息
- 展示沙箱内部的文件系统结构

### 5. 等待执行完成
```javascript
await proc.wait()
const output = proc.output
```
- 等待进程执行完成
- 可以访问 `proc.output` 获取完整的输出内容

### 6. 清理资源
```javascript
await sandbox.close()
```
- 关闭沙箱，释放资源

## 关键 API 使用

### Filesystem API
- `sandbox.filesystem.write()`: 写入文件内容

### Process API
- `sandbox.process.start()`: 启动进程执行命令
- `proc.wait()`: 等待进程完成
- `proc.output`: 获取进程的完整输出

## 技术要点

### 动态代码执行
- 支持运行时生成和执行代码
- 可以动态修改代码内容
- 适合代码生成和测试场景

### 输出处理
- `onStdout/onStderr`: 实时处理输出
- `proc.output`: 批量获取所有输出

## 应用场景
1. **代码执行器**: 安全执行用户提供的代码
2. **在线编程环境**: 提供交互式编程体验
3. **代码测试**: 验证生成的代码是否正确
4. **系统探索**: 了解沙箱环境的文件结构

## 注意事项
1. 执行的代码在隔离的沙箱中运行，安全性高
2. 可以访问 Node.js 的所有内置模块
3. 输出会展示沙箱内部的文件系统结构
4. 适合执行不信任的代码片段