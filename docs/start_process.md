# start_process.js 分析

## 概述
该文件演示了如何在 E2B 沙箱中执行 Shell 命令，特别是使用管道组合多个命令来获取系统信息。

## 主要功能
1. 创建 E2B 沙箱环境
2. 执行复杂的 Shell 命令管道
3. 获取并显示系统进程信息
4. 处理命令输出

## 代码结构分析

### 1. 沙箱初始化
```javascript
const sandbox = await Sandbox.create({
  template: 'base',
  apiKey: process.env.E2B_API_KEY,
})
```
- 使用 `base` 模板创建沙箱
- 从环境变量读取 API Key

### 2. 执行 Shell 命令
```javascript
let proc = await sandbox.process.start({
  cmd: 'ps aux | tr -s \' \' | cut -d \' \' -f 11',
  onStderr: (data) => console.log(data.line),
  onStdout: (data) => console.log(data.line),
})
```

### 命令解析
该命令是一个典型的 Unix 管道操作：
1. `ps aux`: 列出所有运行中的进程
   - `a`: 显示所有用户的进程
   - `u`: 以用户友好的格式显示
   - `x`: 显示没有控制终端的进程

2. `tr -s ' '`: 压缩连续的空格
   - `-s`: squeeze，将连续的空格压缩为单个空格

3. `cut -d ' ' -f 11`: 提取第 11 列
   - `-d ' '`: 使用空格作为分隔符
   - `-f 11`: 提取第 11 个字段（进程名称）

### 3. 等待执行完成
```javascript
await proc.wait()
```
- 等待命令执行完成
- 确保所有输出都被捕获

### 4. 访问输出结果
```javascript
const output = proc.output
```
- 可以通过 `proc.output` 访问完整的输出
- 包含所有标准输出和错误输出

### 5. 清理资源
```javascript
await sandbox.close()
```
- 关闭沙箱，释放资源

## 关键 API 使用

### Process API
- `sandbox.process.start()`: 执行 Shell 命令
- 支持复杂的管道操作
- 实时流式输出处理

### 输出处理
- `onStdout`: 处理标准输出
- `onStderr`: 处理错误输出
- `proc.output`: 获取完整输出

## 技术要点

### Shell 命令执行
- 支持完整的 Shell 语法
- 可以使用管道、重定向等高级特性
- 在隔离环境中安全执行

### 进程信息提取
- 展示沙箱内运行的所有进程
- 仅提取进程名称，简化输出
- 可用于监控和调试

## 应用场景
1. **系统监控**: 查看沙箱内的进程状态
2. **调试工具**: 了解运行环境
3. **自动化脚本**: 执行复杂的 Shell 操作
4. **教学演示**: 展示 Unix 命令的使用

## 注意事项
1. 命令在 Linux 环境中执行，使用 Unix 工具
2. 输出显示沙箱内部的进程列表
3. 某些系统进程可能对安全性有影响
4. 复杂的管道命令可能影响性能

## 输出示例
执行后可能看到的进程名称：
- `/bin/bash`
- `node`
- `ps`
- 其他系统进程