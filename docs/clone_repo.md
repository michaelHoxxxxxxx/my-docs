# clone_repo.js 分析

## 概述
该文件演示了如何使用 E2B SDK 在沙箱环境中克隆 Git 仓库并安装依赖。

## 主要功能
1. 创建 E2B 沙箱环境
2. 使用 git clone 命令克隆远程仓库
3. 列出克隆后的仓库内容
4. 在克隆的项目中安装 npm 依赖

## 代码结构分析

### 1. 沙箱初始化
```javascript
const sandbox = await Sandbox.create({
  template: 'base',
  apiKey: process.env.E2B_API_KEY,
})
```
- 使用 `base` 模板创建沙箱
- API Key 从环境变量读取

### 2. 克隆仓库
```javascript
let proc = await sandbox.process.start({
  cmd: 'git clone https://github.com/cruip/open-react-template.git /code/open-react-template',
  onStderr: (data) => console.log(data.line),
  onStdout: (data) => console.log(data.line),
})
await proc.wait()
```
- 克隆指定的 GitHub 仓库到 `/code/open-react-template` 目录
- 实时输出标准输出和错误信息
- 等待克隆过程完成

### 3. 查看克隆内容
```javascript
const content = await sandbox.filesystem.list('/code/open-react-template')
console.log(content)
```
- 使用文件系统 API 列出克隆后的目录内容

### 4. 安装依赖
```javascript
proc = await sandbox.process.start({
  cmd: 'npm install',
  cwd: '/code/open-react-template',
  onStdout: (data) => console.log(data.line),
  onStderr: (data) => console.log(data.line),
})
await proc.wait()
```
- 在克隆的项目目录中执行 `npm install`
- 设置工作目录为克隆的项目路径
- 实时输出安装过程信息

### 5. 清理资源
```javascript
await sandbox.close()
```
- 关闭沙箱，释放资源

## 关键 API 使用

### Process API
- `sandbox.process.start()`: 启动新进程
- `proc.wait()`: 等待进程结束
- `onStdout/onStderr`: 实时流式处理输出

### Filesystem API
- `sandbox.filesystem.list()`: 列出目录内容

## 应用场景
1. **自动化项目设置**: 自动克隆和配置项目环境
2. **CI/CD 流程**: 在隔离环境中构建和测试项目
3. **代码分析**: 安全地分析第三方代码库
4. **教学演示**: 展示 Git 和 npm 工作流程

## 注意事项
1. 需要确保沙箱环境有网络访问权限
2. 克隆大型仓库可能需要较长时间
3. 安装依赖可能需要额外的系统包支持
4. 记得在操作完成后关闭沙箱以释放资源