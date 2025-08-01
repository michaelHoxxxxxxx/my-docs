# install_deps_npm.js 分析

## 概述
该文件演示了如何在 E2B 沙箱中使用 npm 安装依赖包，并在代码中使用这些依赖。

## 主要功能
1. 创建 E2B 沙箱环境
2. 使用 npm 安装第三方包（lodash）
3. 创建使用已安装包的代码
4. 执行代码验证包安装成功

## 代码结构分析

### 1. 沙箱初始化
```javascript
const sandbox = await Sandbox.create({
  template: 'base',
  apiKey: process.env.E2B_API_KEY,
})
```
- 使用 `base` 模板创建沙箱
- 显式指定 API Key

### 2. 安装 npm 包
```javascript
console.log('Installing lodash...')
const proc = await sandbox.process.start({
  cmd: 'npm install lodash',
  cwd: '/code',
  onStdout: (data) => console.log('[INFO] ', data.line),
  onStderr: (data) => console.log('[WARN | ERROR] ', data.line),
})
await proc.wait()
```
- 在 `/code` 目录下安装 lodash 包
- 设置工作目录确保包安装在正确位置
- 区分标准输出和错误输出，便于调试
- 等待安装过程完成

### 3. 创建使用依赖的代码
```javascript
const code = `
  const _ = require('lodash');
  console.log(_.camelCase('Hello World'));
`
await sandbox.filesystem.write('/code/index.js', code)
```
- 创建一个使用 lodash 的示例代码
- 使用 `_.camelCase()` 方法转换字符串
- 将代码保存到文件系统

### 4. 运行验证代码
```javascript
console.log('Running code...')
const codeRun = await sandbox.process.start({
  cmd: 'node /code/index.js',
  onStdout: (data) => console.log('[INFO] ', data.line),
  onStderr: (data) => console.log('[WARN | ERROR] ', data.line),
})
await codeRun.wait()
```
- 执行包含 lodash 调用的代码
- 验证包安装成功并可正常使用
- 输出应该显示 "helloWorld"

### 5. 清理资源
```javascript
await sandbox.close()
```
- 关闭沙箱，释放资源

## 关键 API 使用

### Process API
- `cwd` 参数: 设置进程的工作目录
- 分离的输出处理: 区分 INFO 和 ERROR 信息

### Filesystem API
- `sandbox.filesystem.write()`: 创建代码文件

## 技术要点

### 工作目录管理
- 使用 `cwd` 确保 npm 在正确目录安装包
- node_modules 将创建在 `/code` 目录下

### 输出格式化
- 使用前缀 `[INFO]` 和 `[WARN | ERROR]` 区分输出类型
- 便于日志分析和问题排查

## 应用场景
1. **动态环境配置**: 根据需求安装不同的包
2. **包管理演示**: 教学 npm 包管理流程
3. **依赖测试**: 测试不同版本的包兼容性
4. **代码生成器**: 生成需要特定依赖的项目

## 注意事项
1. npm 安装需要网络连接
2. 安装过程可能较慢，特别是大型包
3. 需要确保 `/code` 目录存在
4. 某些包可能需要编译，需要相应的系统工具
5. 包安装后会占用沙箱存储空间