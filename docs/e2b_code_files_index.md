# E2B 核心代码文件开发文档索引

> 基于五步显化法的 E2B 源码深度解析

## 🏗️ 系统架构总览

- [E2B 整体架构与运作流程解析](docs/e2b_architecture_flow.md) - **必读** 🔥
  - 系统分层架构和组件关系
  - 完整的运作流程（创建、执行、文件操作）
  - Python SDK vs TypeScript SDK 实现差异
  - Firecracker 集成原理和调用时机
  - 性能特征和最佳实践

本索引包含了 E2B 项目核心代码文件的详细开发文档，每个文档都采用五步显化法进行系统化分析。

## 📋 文档结构说明

每个代码文件文档都包含以下五个部分：
1. **定位与使命** - 文件在整个系统中的角色和目标
2. **设计思想与哲学基石** - 设计理念和核心原则
3. **核心数据结构定义** - 关键的数据结构和类型
4. **核心接口与逻辑实现** - 主要的函数和方法
5. **依赖关系与交互** - 与其他模块的关系

---

## 🗂️ Protocol Buffer 定义文档

### 核心接口定义
- [filesystem.proto - 文件系统接口定义](docs/e2b_filesystem_proto.md) ✅
- [process.proto - 进程管理接口定义](docs/e2b_process_proto.md) ✅
- [openapi.yml - REST API 规范](docs/e2b_openapi_yml.md) ✅

---

## 📦 JavaScript/TypeScript SDK 文档

### SDK 核心模块
- [index.ts - SDK 主入口](docs/e2b_js_sdk_index.md) ✅
- [sandbox/index.ts - Sandbox 类实现](docs/e2b_sandbox_index.md) ✅
- [connectionConfig.ts - 连接配置管理](docs/e2b_connection_config.md) 🚧

### 文件系统模块
- [sandbox/filesystem/index.ts - 文件系统操作](docs/e2b_filesystem_index.md) ✅
- [envd/filesystem/filesystem_connect.ts - 文件系统 gRPC 客户端](docs/e2b_filesystem_connect.md) 🚧

### 进程管理模块
- [sandbox/commands/index.ts - 命令执行模块](docs/e2b_commands_index.md) ✅
- [sandbox/commands/commandHandle.ts - 命令句柄管理](docs/e2b_command_handle.md) ✅
- [envd/process/process_connect.ts - 进程管理 gRPC 客户端](docs/e2b_process_connect.md) 🚧

### API 通信模块
- [envd/api.ts - envd 服务通信](docs/e2b_envd_api.md) ✅
- [sandbox/sandboxApi.ts - 沙箱 API 基础类](docs/e2b_sandbox_api.md) 🚧
- [sandbox/signature.ts - 访问签名管理](docs/e2b_signature.md) 🚧

---

## 🐍 Python SDK 文档

### SDK 核心模块
- [__init__.py - Python SDK 入口](docs/e2b_python_init.md) ✅
- [connection_config.py - 连接配置](docs/e2b_python_connection_config.md) 🚧

### 沙箱实现
- [sandbox_sync/main.py - 同步 Sandbox 实现](docs/e2b_sandbox_sync.md) ✅
- [sandbox_async/main.py - 异步 Sandbox 实现](docs/e2b_sandbox_async.md) ✅
- [sandbox/sandbox_api.py - 沙箱 API 基类](docs/e2b_python_sandbox_api.md)

### 功能模块
- [sandbox/filesystem/filesystem.py - 文件系统操作](docs/e2b_python_filesystem.md) ✅
- [sandbox/commands/main.py - 命令执行](docs/e2b_python_commands.md) ✅

### gRPC 客户端
- [envd/filesystem/filesystem_connect.py - 文件系统客户端](docs/e2b_python_filesystem_connect.md)
- [envd/process/process_connect.py - 进程管理客户端](docs/e2b_python_process_connect.md)

---

## 🛠️ CLI 工具文档

### 沙箱管理命令
- [sandbox/spawn.ts - 创建沙箱命令](docs/e2b_cli_spawn.md) ✅
- [sandbox/connect.ts - 连接沙箱命令](docs/e2b_cli_connect.md) ✅
- [sandbox/list.ts - 列出沙箱命令](docs/e2b_cli_list.md) ✅
- [sandbox/kill.ts - 终止沙箱命令](docs/e2b_cli_kill.md) ✅

---

## 🔧 代码生成器文档

- [protoc-gen-connect-python/main.go - Python gRPC 代码生成器](docs/e2b_protoc_gen.md)

---

## 📚 如何使用这些文档

1. **学习 E2B 架构**：从 Protocol Buffer 定义开始，了解系统的接口设计
2. **深入 SDK 实现**：通过 SDK 核心模块文档了解客户端实现细节
3. **理解模块交互**：每个文档的第五部分详细说明了模块间的依赖关系
4. **对比多语言实现**：比较 JavaScript 和 Python SDK 的实现差异

## 🎯 文档阅读建议

### 初学者路径
1. 先阅读 [openapi.yml](docs/e2b_openapi_yml.md) 了解 REST API
2. 然后看 [sandbox/index.ts](docs/e2b_sandbox_index.md) 理解核心概念
3. 最后查看具体功能模块的实现

### 深度学习路径
1. 从 Protocol Buffer 定义开始
2. 追踪 gRPC 客户端的生成和使用
3. 分析各语言 SDK 的实现细节
4. 研究 CLI 工具的命令实现

### 功能专项路径
- **文件系统**：filesystem.proto → filesystem/index.ts → filesystem.py
- **进程管理**：process.proto → commands/index.ts → commands/main.py
- **连接管理**：connectionConfig.ts → connection_config.py

---

> 💡 **提示**：每个文档都是独立完整的，可以单独阅读。但结合相关文档一起学习，能够获得更全面的理解。