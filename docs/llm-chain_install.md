# llm-chain 安装与配置

本文档将指导您如何安装和配置llm-chain框架，以便开始构建您的LLM应用。

## 系统要求

- Node.js 16.x 或更高版本
- npm 7.x 或更高版本（或yarn、pnpm等包管理器）
- 支持JavaScript或TypeScript的开发环境

## 安装方法

### 使用npm安装

```bash
npm install llm-chain
```

### 使用yarn安装

```bash
yarn add llm-chain
```

### 使用pnpm安装

```bash
pnpm add llm-chain
```

## 基本配置

安装完成后，您需要进行一些基本配置才能开始使用llm-chain。

### 配置API密钥

如果您计划使用OpenAI、Anthropic等模型提供商的API，需要先配置相应的API密钥：

```javascript
// 使用环境变量（推荐）
// 在.env文件中设置
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

// 或在代码中直接设置（不推荐用于生产环境）
import { setOpenAIKey, setAnthropicKey } from 'llm-chain';

setOpenAIKey('your_openai_api_key');
setAnthropicKey('your_anthropic_api_key');
```

### 创建基本项目

以下是一个简单的项目结构示例：

```
my-llm-app/
├── .env                  # 环境变量配置
├── package.json          # 项目依赖
├── src/
│   ├── index.js          # 主入口文件
│   ├── chains/           # 自定义链
│   ├── prompts/          # 提示模板
│   └── utils/            # 工具函数
└── README.md             # 项目说明
```

## 验证安装

创建一个简单的测试文件来验证llm-chain是否正确安装和配置：

```javascript
// test.js
import { ChatChain, ChatOpenAI } from 'llm-chain';

async function testLLMChain() {
  // 创建一个简单的聊天链
  const chain = new ChatChain({
    llm: new ChatOpenAI({ model: 'gpt-3.5-turbo' }),
  });
  
  // 测试一个简单的请求
  const response = await chain.run('你好，请介绍一下自己');
  console.log(response);
}

testLLMChain().catch(console.error);
```

运行测试文件：

```bash
node test.js
```

如果一切配置正确，您应该能看到模型的回复。

## 常见问题

### API密钥错误

如果遇到API密钥相关错误，请检查：
- 密钥是否正确设置
- 密钥是否有效
- 是否有足够的API额度

### 网络问题

如果遇到网络连接问题：
- 检查您的网络连接
- 确认是否需要配置代理
- 验证防火墙设置是否允许API请求

### 版本兼容性

如果遇到依赖冲突或版本兼容性问题：
- 尝试更新到最新版本的llm-chain
- 检查Node.js版本是否满足要求
- 查看项目GitHub仓库的issues部分，了解已知问题

## 下一步

成功安装和配置llm-chain后，您可以继续阅读[llm-chain基础概念](llm-chain_basic-concepts.md)文档，了解如何使用框架构建应用。
