# Open Lovable - API 参考文档

## 概述

Open Lovable 提供了一套完整的 RESTful API，涵盖沙箱管理、AI 代码生成、文件操作、网站爬取等核心功能。所有 API 端点基于 Next.js API Routes 实现，提供统一的接口规范和错误处理。

## API 基础信息

- **基础 URL**：`http://localhost:3000/api` (开发环境)
- **Content-Type**：`application/json`
- **认证方式**：环境变量 API 密钥
- **错误格式**：标准化 JSON 错误响应

### 通用响应格式

```typescript
// 成功响应
{
  success: true,
  data?: any,
  message?: string
}

// 错误响应
{
  success: false,
  error: string,
  details?: any
}
```

## 沙箱管理 API

### 1. 创建 AI 沙箱

创建新的 E2B 沙箱环境，自动配置 React + Vite 开发环境。

**端点**：`POST /api/create-ai-sandbox`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "sandboxId": "sb_12345",
  "url": "https://sb_12345-5173.e2b.dev",
  "message": "Sandbox created and Vite React app initialized"
}
```

**功能特性**：
- 自动创建 Linux 容器环境
- 配置 Vite + React + Tailwind CSS
- 15分钟自动超时机制
- 全局状态管理和文件跟踪

**错误码**：
- `500`：沙箱创建失败
- `500`：E2B API 密钥无效

---

### 2. 沙箱状态检查

获取当前活跃沙箱的状态信息。

**端点**：`GET /api/sandbox-status`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "active": true,
  "healthy": true,
  "sandboxData": {
    "sandboxId": "sb_12345",
    "url": "https://sb_12345-5173.e2b.dev",
    "filesTracked": ["src/App.jsx", "src/main.jsx"],
    "lastHealthCheck": "2024-01-15T10:30:00.000Z"
  },
  "message": "Sandbox is active and healthy"
}
```

**状态说明**：
- `active`：沙箱是否存在
- `healthy`：沙箱是否正常响应
- `filesTracked`：跟踪的文件列表

---

### 3. 销毁沙箱

安全关闭并清理沙箱资源。

**端点**：`POST /api/kill-sandbox`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "sandboxKilled": true,
  "message": "Sandbox cleaned up successfully"
}
```

## AI 代码生成 API

### 4. 流式代码生成

使用 AI 模型生成 React 代码，支持实时流式响应。

**端点**：`POST /api/generate-ai-code-stream`

**请求参数**：
```typescript
{
  prompt: string;           // 用户需求描述
  model?: string;           // AI 模型选择
  context?: {               // 上下文信息
    sandboxId?: string;
    currentFiles?: Record<string, string>;
    structure?: string;
    conversationContext?: any;
  };
  isEdit?: boolean;         // 是否为编辑模式
}
```

**支持的 AI 模型**：
- `openai/gpt-5`：GPT-5 (推理模式)
- `anthropic/claude-sonnet-4-20250514`：Claude Sonnet 4
- `google/gemini-2.5-pro`：Gemini 2.5 Pro
- `moonshotai/kimi-k2-instruct`：Kimi K2 (默认)

**流式响应格式**：
```
data: {"type": "status", "message": "正在初始化 AI..."}
data: {"type": "stream", "text": "<file path=\"src/App.jsx\">", "raw": true}
data: {"type": "component", "name": "Header", "path": "src/components/Header.jsx"}
data: {"type": "complete", "generatedCode": "...", "files": 3}
```

**响应类型说明**：
- `status`：状态更新消息
- `stream`：实时代码生成内容
- `component`：组件生成完成
- `package`：检测到新依赖包
- `complete`：生成完成总结

---

### 5. 编辑意图分析

分析用户编辑需求，生成精确的代码搜索计划。

**端点**：`POST /api/analyze-edit-intent`

**请求参数**：
```typescript
{
  prompt: string;           // 编辑需求
  manifest: FileManifest;   // 文件清单
  model?: string;           // AI 模型
}
```

**响应示例**：
```json
{
  "success": true,
  "searchPlan": {
    "editType": "UPDATE_COMPONENT",
    "reasoning": "用户想要更新按钮文本",
    "searchTerms": ["Start Deploying", "button"],
    "regexPatterns": ["className=[\"'].*button.*[\"']"],
    "fileTypesToSearch": [".jsx", ".tsx"],
    "expectedMatches": 1
  }
}
```

**编辑类型**：
- `UPDATE_COMPONENT`：更新组件
- `ADD_FEATURE`：添加功能
- `FIX_ISSUE`：修复问题
- `UPDATE_STYLE`：更新样式
- `REFACTOR`：重构代码
- `ADD_DEPENDENCY`：添加依赖
- `REMOVE_ELEMENT`：移除元素

---

### 6. 应用 AI 代码

将 AI 生成的代码应用到沙箱环境。

**端点**：`POST /api/apply-ai-code`

**请求参数**：
```typescript
{
  response: string;         // AI 生成的完整响应
  isEdit?: boolean;         // 是否为编辑模式
  packages?: string[];      // 额外的包依赖
}
```

**响应示例**：
```json
{
  "success": true,
  "results": {
    "filesCreated": ["src/components/Header.jsx"],
    "filesUpdated": ["src/App.jsx"],
    "packagesInstalled": ["@heroicons/react"],
    "packagesAlreadyInstalled": ["react", "react-dom"],
    "packagesFailed": [],
    "commandsExecuted": [],
    "errors": []
  },
  "explanation": "成功创建了 Header 组件并更新了 App.jsx",
  "message": "Applied 2 files successfully"
}
```

## 文件系统 API

### 7. 获取沙箱文件

获取沙箱中的所有文件内容和结构信息。

**端点**：`GET /api/get-sandbox-files`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "files": {
    "src/App.jsx": "import React from 'react'...",
    "src/main.jsx": "import { createRoot } from 'react-dom/client'..."
  },
  "structure": "app/\n  src/\n    App.jsx\n    main.jsx",
  "fileCount": 8,
  "manifest": {
    "files": {},
    "routes": [],
    "componentTree": {},
    "entryPoint": "/home/user/app/src/main.jsx",
    "styleFiles": ["/home/user/app/src/index.css"]
  }
}
```

**文件清单结构**：
- `files`：文件内容映射
- `routes`：路由信息
- `componentTree`：组件依赖关系
- `entryPoint`：应用入口文件
- `styleFiles`：样式文件列表

---

### 8. 创建项目压缩包

将整个项目打包为 ZIP 文件供下载。

**端点**：`POST /api/create-zip`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "dataUrl": "data:application/zip;base64,UEsDBBQAAA...",
  "fileName": "e2b-project.zip",
  "message": "Zip file created successfully"
}
```

**特性**：
- 自动排除 `node_modules`、`.git` 等目录
- Base64 编码便于前端下载
- ZIP 压缩优化文件大小

## 包管理 API

### 9. 检测并安装包依赖

自动分析代码中的 import 语句，检测并安装缺失的 npm 包。

**端点**：`POST /api/detect-and-install-packages`

**请求参数**：
```typescript
{
  files: Record<string, string>;  // 文件路径到内容的映射
}
```

**响应示例**：
```json
{
  "success": true,
  "packagesInstalled": ["@heroicons/react", "framer-motion"],
  "packagesFailed": [],
  "packagesAlreadyInstalled": ["react", "react-dom"],
  "message": "Installed 2 packages",
  "logs": "npm install @heroicons/react framer-motion\n+ @heroicons/react@2.0.18\n+ framer-motion@12.0.0"
}
```

**智能特性**：
- 支持 ES6 import 和 CommonJS require
- 正确处理作用域包（如 `@scope/package`）
- 自动去重和验证安装结果
- 详细的安装日志记录

---

### 10. 手动安装包

手动安装指定的 npm 包。

**端点**：`POST /api/install-packages`

**请求参数**：
```typescript
{
  packages: string[];  // 包名数组
}
```

**响应示例**：
```json
{
  "success": true,
  "installed": ["lodash", "axios"],
  "failed": [],
  "message": "Successfully installed 2 packages"
}
```

## Vite 集成 API

### 11. 重启 Vite 服务器

强制重启 Vite 开发服务器，通常在安装新包后使用。

**端点**：`POST /api/restart-vite`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "message": "Vite restarted successfully",
  "output": "Vite dev server started at port 5173"
}
```

**功能特性**：
- 智能进程管理（PID 跟踪）
- 错误日志监控
- 自动错误文件清理
- 后台线程错误检测

---

### 12. 监控 Vite 错误

检查 Vite 开发服务器的错误状态，特别是包导入错误。

**端点**：`GET /api/monitor-vite-logs`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "hasErrors": true,
  "errors": [
    {
      "type": "npm-missing",
      "package": "@heroicons/react",
      "message": "Failed to resolve import \"@heroicons/react\"",
      "timestamp": 1642234567890
    }
  ]
}
```

**错误类型**：
- `npm-missing`：缺失 npm 包
- `import-failed`：导入失败
- `syntax-error`：语法错误

---

### 13. 检查 Vite 错误

简化的 Vite 错误检查端点。

**端点**：`GET /api/check-vite-errors`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "errors": [],
  "message": "No Vite errors detected"
}
```

---

### 14. 清理 Vite 错误缓存

清理 Vite 错误缓存文件。

**端点**：`POST /api/clear-vite-errors-cache`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "message": "Vite errors cache cleared"
}
```

## 网站爬取 API

### 15. 增强型网站爬取

使用 Firecrawl API 爬取网站内容，支持缓存和内容清理。

**端点**：`POST /api/scrape-url-enhanced`

**请求参数**：
```typescript
{
  url: string;  // 目标网站 URL
}
```

**响应示例**：
```json
{
  "success": true,
  "url": "https://example.com",
  "content": "Title: Example Site\nDescription: A sample website\n\nMain Content:\n# Welcome to Example Site...",
  "structured": {
    "title": "Example Site",
    "description": "A sample website",
    "content": "# Welcome to Example Site...",
    "url": "https://example.com"
  },
  "metadata": {
    "scraper": "firecrawl-enhanced",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "contentLength": 1024,
    "cached": false
  },
  "message": "URL scraped successfully with Firecrawl (with caching for 500% faster performance)"
}
```

**特性优势**：
- 1小时智能缓存（提升 500% 性能）
- 智能引号和特殊字符清理
- 结构化数据提取
- Markdown 和 HTML 双格式支持

---

### 16. 网站截图

捕获网站截图用于设计参考。

**端点**：`POST /api/scrape-screenshot`

**请求参数**：
```typescript
{
  url: string;  // 目标网站 URL
}
```

**响应示例**：
```json
{
  "success": true,
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU...",
  "url": "https://example.com",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "format": "png",
    "size": 1920
  }
}
```

## 命令执行 API

### 17. 执行系统命令

在沙箱环境中执行任意系统命令。

**端点**：`POST /api/run-command`

**请求参数**：
```typescript
{
  command: string;  // 要执行的命令
}
```

**响应示例**：
```json
{
  "success": true,
  "output": "STDOUT:\nnpm version 8.19.2\n\nReturn code: 0",
  "message": "Command executed successfully"
}
```

**安全特性**：
- 自动切换到应用目录
- 参数分割防止命令注入
- 完整的输出捕获（stdout/stderr）
- 返回码状态检查

---

### 18. 沙箱日志

获取沙箱执行日志。

**端点**：`GET /api/sandbox-logs`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "logs": [
    "[2024-01-15 10:30:00] Sandbox created",
    "[2024-01-15 10:30:05] Vite server started",
    "[2024-01-15 10:30:10] File created: src/App.jsx"
  ],
  "count": 3
}
```

## 状态管理 API

### 19. 对话状态管理

管理 AI 对话的上下文状态。

**端点**：`GET /api/conversation-state`

**请求参数**：无

**响应示例**：
```json
{
  "success": true,
  "state": {
    "conversationId": "conv-1642234567890",
    "startedAt": 1642234567890,
    "lastUpdated": 1642234567890,
    "context": {
      "messages": [],
      "edits": [],
      "projectEvolution": {
        "majorChanges": []
      },
      "userPreferences": {}
    }
  }
}
```

**上下文信息**：
- `messages`：对话消息历史
- `edits`：代码编辑记录
- `projectEvolution`：项目演进历史
- `userPreferences`：用户偏好分析

---

### 20. 报告 Vite 错误

向系统报告 Vite 开发服务器错误。

**端点**：`POST /api/report-vite-error`

**请求参数**：
```typescript
{
  error: string;      // 错误信息
  file?: string;      // 错误文件
  line?: number;      // 错误行号
  type?: string;      // 错误类型
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "Error reported successfully"
}
```

## API 使用最佳实践

### 1. 错误处理

所有 API 都遵循统一的错误响应格式：

```typescript
// 标准错误响应
{
  success: false,
  error: "Error message",
  details?: any
}
```

**常见错误码**：
- `400`：请求参数错误
- `404`：资源不存在（如沙箱未创建）
- `500`：服务器内部错误

### 2. 异步处理

长时间运行的操作（如代码生成）使用流式响应：

```javascript
// 流式响应处理示例
const response = await fetch('/api/generate-ai-code-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Create a header component' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      console.log('Received:', data);
    }
  }
}
```

### 3. 状态管理

维护全局状态的正确顺序：

```javascript
// 正确的 API 调用顺序
1. POST /api/create-ai-sandbox        // 创建沙箱
2. GET /api/sandbox-status           // 验证状态
3. POST /api/generate-ai-code-stream // 生成代码
4. POST /api/apply-ai-code          // 应用代码
5. GET /api/get-sandbox-files       // 获取文件
6. POST /api/kill-sandbox           // 清理资源
```

### 4. 缓存策略

利用内置缓存提升性能：

- **网站爬取**：1小时缓存，避免重复请求
- **文件清单**：内存缓存，实时更新
- **依赖检测**：基于文件内容哈希缓存

### 5. 安全考虑

- **输入验证**：所有用户输入都经过验证
- **命令注入防护**：命令参数自动分割
- **资源限制**：沙箱环境 15 分钟自动超时
- **敏感信息**：API 密钥通过环境变量管理

## API 扩展指南

### 添加新端点

1. 创建新的路由文件：`app/api/new-endpoint/route.ts`
2. 实现标准的 HTTP 方法处理函数
3. 添加类型定义和文档
4. 更新 API 参考文档

### 集成新服务

1. 添加环境变量配置
2. 实现服务客户端
3. 添加错误处理逻辑
4. 更新健康检查机制

### 性能优化

1. 实现响应缓存
2. 添加请求去重
3. 优化数据传输格式
4. 监控 API 性能指标

## 总结

Open Lovable 的 API 设计体现了现代 Web 应用的最佳实践，通过统一的接口规范、完善的错误处理、智能的缓存策略和强大的安全措施，为用户提供了稳定、高效、易用的开发体验。

这套 API 不仅支撑了当前的功能需求，也为未来的功能扩展奠定了坚实的基础。其模块化的设计使得每个功能模块都可以独立开发、测试和部署，大大提高了系统的可维护性和扩展性。