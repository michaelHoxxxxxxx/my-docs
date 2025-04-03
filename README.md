# 学习文档

## 项目介绍

这是一个使用 [docsify](https://docsify.js.org/#/zh-cn/) 构建的个人学习文档网站，收集整理了多种技术栈和工具的学习笔记。本项目旨在提供清晰、系统的技术文档，方便快速查阅和学习。

## 文档内容

目前包含以下技术主题的学习文档：

- **n8n** - 强大的工作流自动化平台
- **Supabase** - 开源的Firebase替代品
- **OWL** - 多智能体协作框架
- **OpenManus** - 开源机器人控制系统
- **llm-chain** - 大型语言模型链式处理框架
- **SurrealDB** - 新一代云原生图数据库

每个主题通常包含以下几个部分：
- 简介 - 技术概述和基本信息
- 安装与配置 - 环境搭建和初始化步骤
- 基础概念 - 核心概念和使用方法
- 高级内容 - 进阶技巧和最佳实践（部分主题）

## 如何使用

### 在线访问

直接访问部署的网站（如有）即可浏览所有文档内容。

### 本地运行

1. 克隆本仓库
   ```bash
   git clone https://github.com/michaelHoxxxxxxx/my-docs.git
   cd my-docs
   ```

2. 安装docsify-cli（如果尚未安装）
   ```bash
   npm i docsify-cli -g
   ```

3. 本地预览
   ```bash
   docsify serve
   ```

4. 在浏览器中访问 `http://localhost:3000` 查看文档

## 技术栈

- **docsify** - 轻量级文档网站生成器
- **Markdown** - 所有文档内容格式
- **docsify插件**:
  - 全文搜索
  - 暗黑模式
  - 字数统计
  - 代码复制
  - 图片缩放
  - 分页导航
  - 侧边栏折叠

## 贡献

欢迎提交问题或改进建议，可以通过以下方式：
- 提交Issue
- 创建Pull Request
- 直接在GitHub上编辑文档

## 许可

本项目采用MIT许可证。
