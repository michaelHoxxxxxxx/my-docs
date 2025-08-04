- **1. 工作流自动化工具**
  - **1.1 n8n 工作流引擎**
    - [1.1.1 n8n 简介](docs/n8n_intro.md)
    - [1.1.2 n8n 安装与配置](docs/n8n_install.md)
    - [1.1.3 n8n 基础概念](docs/n8n_basic-concepts.md)
    - [1.1.4 n8n 节点介绍](docs/n8n_nodes.md)

- **2. 后端即服务 (BaaS)**
  - **2.1 Supabase**
    - [2.1.1 Supabase 简介](docs/supabase_intro.md)
    - [2.1.2 Supabase 安装与配置](docs/supabase_install.md)
    - [2.1.3 Supabase 基础概念](docs/supabase_basic-concepts.md)
    - [2.1.4 Rust Supabase 认证与权限](docs/rust-supabase-auth-guide.md)
    - [2.1.5 JWT (JSON Web Token) 简介](docs/jwt_intro.md)
  
  - **2.2 数据库技术**
    - **2.2.1 SurrealDB**
      - [2.2.1.1 SurrealDB 简介](docs/surrealdb_intro.md)
      - [2.2.1.2 SurrealDB 安装与配置](docs/surrealdb_install.md)
      - [2.2.1.3 SurrealDB 基础概念](docs/surrealdb_basic-concepts.md)
      - [2.2.1.4 SurrealDB 实用技巧](docs/surrealdb_advanced-concepts.md)
    - **2.2.2 HawkinsDB**
      - [2.2.2.1 HawkinsDB 简介](docs/hawkinsdb_intro.md)

- **3. AI 开发工具与框架**
  - **3.1 LLM 开发框架**
    - **3.1.1 llm-chain**
      - [3.1.1.1 llm-chain 简介](docs/llm-chain_intro.md)
      - [3.1.1.2 llm-chain 安装与配置](docs/llm-chain_install.md)
      - [3.1.1.3 llm-chain 基础概念](docs/llm-chain_basic-concepts.md)
    - **3.1.2 OWL 框架**
      - [3.1.2.1 OWL 简介](docs/owl_intro.md)
      - [3.1.2.2 OWL 安装与配置](docs/owl_install.md)
      - [3.1.2.3 OWL 基础概念](docs/owl_basic-concepts.md)
  
  - **3.2 AI Agent 系统**
    - **3.2.1 VoltAgent**
      - [3.2.1.1 VoltAgent 简介](docs/voltagent_intro.md)
    - **3.2.2 Agno**
      - [3.2.2.1 Agno 介绍](docs/agno_intro.md)
      - [3.2.2.2 对话流程实现](docs/agno_true.md)
    - **3.2.3 Suna**
      - [3.2.3.1 Suna 简介](docs/suna_intro.md)
  
  - **3.3 AI 辅助工具**
    - **3.3.1 OpenManus**
      - [3.3.1.1 OpenManus 简介](docs/openmanus_intro.md)
      - [3.3.1.2 OpenManus 安装与配置](docs/openmanus_install.md)
      - [3.3.1.3 OpenManus 基础概念](docs/openmanus_basic-concepts.md)
    - **3.3.2 NodeRAG**
      - [3.3.2.1 NodeRAG 简介](docs/nodrag_intro.md)
    - **3.3.3 mem0**
      - [3.3.3.1 MEM0 使用指南](docs/MEM0_使用指南.md)
  
  - **3.4 Claude Code**
    - [3.4.1 Claude Code 简介](docs/claude-code_intro.md)
    - [3.4.2 安装与配置](docs/claude-code_install.md)
    - [3.4.3 MCP 配置与使用](docs/claude-code_mcp.md)
    - [3.4.4 Agent 创建与管理](docs/claude-code_agents.md)
    - [3.4.5 高级功能指南](docs/claude-code_advanced.md)
    - [3.4.6 CI/CD 集成](docs/claude-code_cicd.md)
    - [3.4.7 开发工作流集成](docs/claude-code_workflow.md)
    - [3.4.8 团队协作配置](docs/claude-code_team.md)

- **4. 代码执行环境**
  - **4.1 E2B 基础文档**
    - [4.1.1 E2B 学习概述](docs/README.md)
    - [4.1.2 SDK 概述](docs/01_e2b_sdk_overview.md)
    - [4.1.3 零基础入门指南](docs/e2b_beginner_guide.md)
    - [4.1.4 完整使用指南](docs/e2b_comprehensive_guide.md)
    - [4.1.5 应用场景与最佳实践](docs/02_e2b_applications.md)
  
  - **4.2 E2B 技术深度**
    - [4.2.1 与 Firecracker 集成分析](docs/03_e2b_firecracker_integration.md)
    - [4.2.2 核心架构与技术实现](docs/05_e2b_core_architecture.md)
    - [4.2.3 沙箱生命周期管理](docs/06_e2b_sandbox_lifecycle.md)
    - [4.2.4 安全模型与认证机制](docs/07_e2b_security_authentication.md)
    - [4.2.5 性能优化与资源管理](docs/08_e2b_performance_optimization.md)
    - [4.2.6 与其他方案对比](docs/09_e2b_vs_alternatives.md)
  
  - **4.3 E2B 实践应用**
    - [4.3.1 SDK 代码示例分析](docs/04_code_examples.md)
    - [4.3.2 LLM 集成示例大全](docs/10_e2b_llm_integrations.md)
    - [4.3.3 AI 框架集成指南](docs/11_e2b_ai_frameworks.md)
    - [4.3.4 自托管部署指南](docs/12_e2b_self_hosting.md)
    - [4.3.5 实际应用案例详解](docs/13_e2b_real_world_applications.md)
  
  - **4.4 E2B 源码解析 (五步显化法)**
    - **4.4.1 总览与架构**
      - [4.4.1.1 代码文件索引](docs/e2b_code_files_index.md)
      - [4.4.1.2 整体架构与运作流程](docs/e2b_architecture_flow.md)
      - [4.4.1.3 完整部署教程](docs/e2b_deployment_guide.md)
    
    - **4.4.2 协议定义层**
      - [4.4.2.1 REST API 规范](docs/e2b_openapi_yml.md)
      - [4.4.2.2 文件系统接口](docs/e2b_filesystem_proto.md)
      - [4.4.2.3 进程管理接口](docs/e2b_process_proto.md)
    
    - **4.4.3 JavaScript/TypeScript SDK**
      - [4.4.3.1 SDK 主入口](docs/e2b_js_sdk_index.md)
      - [4.4.3.2 核心 Sandbox 类](docs/e2b_sandbox_index.md)
      - [4.4.3.3 文件系统操作](docs/e2b_filesystem_index.md)
      - [4.4.3.4 命令执行模块](docs/e2b_commands_index.md)
      - [4.4.3.5 命令句柄管理](docs/e2b_command_handle.md)
      - [4.4.3.6 envd 服务通信](docs/e2b_envd_api.md)
    
    - **4.4.4 Python SDK**
      - [4.4.4.1 SDK 入口](docs/e2b_python_init.md)
      - [4.4.4.2 同步沙箱实现](docs/e2b_sandbox_sync.md)
      - [4.4.4.3 异步沙箱实现](docs/e2b_sandbox_async.md)
      - [4.4.4.4 文件系统数据结构](docs/e2b_python_filesystem.md)
      - [4.4.4.5 命令执行数据结构](docs/e2b_python_commands.md)
    
    - **4.4.5 CLI 工具**
      - [4.4.5.1 沙箱创建命令](docs/e2b_cli_spawn.md)
      - [4.4.5.2 沙箱连接命令](docs/e2b_cli_connect.md)
      - [4.4.5.3 沙箱列表命令](docs/e2b_cli_list.md)
      - [4.4.5.4 沙箱终止命令](docs/e2b_cli_kill.md)
  
  - **4.5 SoulBox (Rust 实现)**
    - [4.5.1 完整指南 (五步显化法)](docs/soulbox_complete_guide.md)
    - [4.5.2 架构设计](docs/soulbox_architecture_design.md)
    - [4.5.3 快速开始](docs/soulbox_quickstart.md)
    - [4.5.4 高级功能](docs/soulbox_advanced_features.md)
    - [4.5.5 遗漏功能补充](docs/soulbox_missing_features.md)

- **5. AI 系统架构案例**
  - **5.1 彩虹城一体七翼系统**
    - [5.1.1 系统概述](docs/rainbowcity.md)
    - [5.1.2 中央意识核心初始化](docs/rainbowcity1.md)
    - [5.1.3 身份叙事系统](docs/rainbowcity2.md)
    - [5.1.4 价值观矩阵](docs/rainbowcity3.md)
    - [5.1.5 人格信息系统](docs/rainbowcity4.md)
    - [5.1.6 关系网络系统](docs/rainbowcity5.md)
    - [5.1.7 能力系统](docs/rainbowcity6.md)
    - [5.1.8 AI技能系统](docs/rainbowcity7.md)