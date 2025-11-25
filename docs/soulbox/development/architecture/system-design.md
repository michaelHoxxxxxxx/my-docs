# SoulBox - Rust 版本的安全代码执行沙箱

## 项目概述

SoulBox 是一个用 Rust 实现的高性能、安全的代码执行沙箱，灵感来源于 E2B，但专注于 Rust 生态系统的性能和安全优势。

## 核心特性

### 1. 🦀 纯 Rust 实现
- 利用 Rust 的内存安全特性
- 零开销抽象和高性能
- 无需垃圾回收的资源管理

### 2. 🔒 增强的安全性
- 基于 `nix` crate 的系统级隔离
- seccomp-bpf 系统调用过滤
- cgroups v2 资源限制

### 3. ⚡ 极致性能
- 使用 `tokio` 异步运行时
- 零拷贝 I/O 操作
- 高效的内存池管理

### 4. 🌍 多语言执行支持
- Python、JavaScript、Ruby 等解释型语言
- Rust、C/C++ 等编译型语言
- WebAssembly 支持

## 架构设计

```
┌─────────────────────────────────────────────────────┐
│                   SoulBox API Layer                 │
├─────────────────┬─────────────────┬─────────────────┤
│   Rust Client   │  Python Binding │   gRPC API     │
│   (Native)      │     (PyO3)      │   (tonic)      │
└─────────────────┴─────────────────┴─────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│               Core Sandbox Engine                    │
├─────────────────────────────────────────────────────┤
│  Process Manager │ Filesystem │ Network │ Resource  │
│   (nix + tokio)  │   (FUSE)   │ (netns) │ (cgroups)│
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│              Container Runtime Layer                 │
├─────────────────────────────────────────────────────┤
│    Firecracker   │    gVisor    │   Native Linux    │
│   Integration    │  Integration │   Namespaces      │
└─────────────────────────────────────────────────────┘
```

## 核心模块设计

### 1. Sandbox 核心结构

```rust
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug)]
pub struct SoulBox {
    id: Uuid,
    config: SandboxConfig,
    runtime: Arc<Runtime>,
    filesystem: Arc<Filesystem>,
    process_manager: Arc<ProcessManager>,
    network: Option<Arc<Network>>,
    state: Arc<Mutex<SandboxState>>,
}

#[derive(Debug, Clone)]
pub struct SandboxConfig {
    pub memory_limit: u64,      // 内存限制（字节）
    pub cpu_quota: f32,         // CPU 配额（0.0-1.0）
    pub timeout: Duration,      // 执行超时
    pub allowed_syscalls: Vec<Syscall>,
    pub network_enabled: bool,
    pub persistent_storage: bool,
}

#[derive(Debug)]
pub enum SandboxState {
    Creating,
    Running,
    Paused,
    Terminated,
}
```

### 2. 异步 API 设计

```rust
impl SoulBox {
    /// 创建新的沙箱实例
    pub async fn create(config: SandboxConfig) -> Result<Self, SoulBoxError> {
        // 实现沙箱创建逻辑
    }
    
    /// 执行代码
    pub async fn execute_code(
        &self, 
        language: Language, 
        code: &str
    ) -> Result<ExecutionResult, SoulBoxError> {
        // 实现代码执行逻辑
    }
    
    /// 文件系统操作
    pub async fn write_file(&self, path: &Path, content: &[u8]) -> Result<(), SoulBoxError> {
        // 实现文件写入
    }
    
    /// 安装依赖
    pub async fn install_package(&self, package: &str) -> Result<(), SoulBoxError> {
        // 实现包管理
    }
}
```

### 3. 执行结果结构

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub execution_time: Duration,
    pub memory_usage: u64,
    pub artifacts: Vec<Artifact>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Artifact {
    pub path: PathBuf,
    pub mime_type: String,
    pub size: u64,
    pub data: Option<Vec<u8>>,
}
```

## 安全特性实现

### 1. 系统调用过滤

```rust
use seccomp::{Context, Action, Syscall};

pub fn create_seccomp_filter() -> Result<Context, Box<dyn Error>> {
    let mut ctx = Context::new(Action::Kill)?;
    
    // 允许基本系统调用
    ctx.allow_syscall(Syscall::read)?;
    ctx.allow_syscall(Syscall::write)?;
    ctx.allow_syscall(Syscall::close)?;
    // ... 更多安全的系统调用
    
    ctx.load()?;
    Ok(ctx)
}
```

### 2. 资源限制

```rust
use cgroups_rs::{cgroup_builder::CgroupBuilder, CgroupPid};

pub fn apply_resource_limits(pid: u32, config: &SandboxConfig) -> Result<(), Box<dyn Error>> {
    let cgroup = CgroupBuilder::new("soulbox")
        .memory()
            .limit_in_bytes(config.memory_limit)
            .done()
        .cpu()
            .quota(config.cpu_quota)
            .done()
        .build()?;
    
    cgroup.add_task(CgroupPid::from(pid))?;
    Ok(())
}
```

## AI 集成接口

### 1. OpenAI 函数调用支持

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ToolFunction {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

impl SoulBox {
    /// 注册可供 AI 调用的工具函数
    pub fn register_tool(&mut self, tool: ToolFunction) {
        self.tools.insert(tool.name.clone(), tool);
    }
    
    /// 执行 AI 生成的函数调用
    pub async fn execute_tool_call(
        &self,
        name: &str,
        args: serde_json::Value
    ) -> Result<serde_json::Value, SoulBoxError> {
        // 实现工具调用逻辑
    }
}
```

### 2. 流式输出支持

```rust
use tokio::sync::mpsc;
use futures::stream::Stream;

impl SoulBox {
    /// 流式执行代码，实时返回输出
    pub fn stream_execute(
        &self,
        language: Language,
        code: &str
    ) -> impl Stream<Item = StreamOutput> {
        let (tx, rx) = mpsc::channel(100);
        
        tokio::spawn(async move {
            // 实现流式执行逻辑
        });
        
        tokio_stream::wrappers::ReceiverStream::new(rx)
    }
}

#[derive(Debug)]
pub enum StreamOutput {
    Stdout(String),
    Stderr(String),
    Image(Vec<u8>),
    Plot(PlotData),
}
```

## Python 绑定 (PyO3)

```rust
use pyo3::prelude::*;

#[pyclass]
struct PySoulBox {
    inner: Arc<Mutex<SoulBox>>,
}

#[pymethods]
impl PySoulBox {
    #[new]
    fn new() -> PyResult<Self> {
        Ok(PySoulBox {
            inner: Arc::new(Mutex::new(SoulBox::create_default()?)),
        })
    }
    
    fn execute_code(&self, language: &str, code: &str) -> PyResult<PyExecutionResult> {
        // 实现 Python 绑定
    }
}

#[pymodule]
fn soulbox(_py: Python<'_>, m: &PyModule) -> PyResult<()> {
    m.add_class::<PySoulBox>()?;
    Ok(())
}
```

## 项目结构

```
soulbox/
├── Cargo.toml
├── README.md
├── soulbox-core/           # 核心沙箱实现
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── sandbox.rs      # 沙箱主逻辑
│   │   ├── runtime.rs      # 运行时管理
│   │   ├── filesystem.rs   # 文件系统
│   │   ├── process.rs      # 进程管理
│   │   └── security.rs     # 安全模块
│   └── tests/
├── soulbox-api/            # API 服务器
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── grpc.rs         # gRPC 服务
│       └── handlers.rs
├── soulbox-client/         # Rust 客户端
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
├── soulbox-py/             # Python 绑定
│   ├── Cargo.toml
│   ├── pyproject.toml
│   └── src/
│       └── lib.rs
└── examples/               # 使用示例
    ├── basic.rs
    ├── ai_integration.rs
    └── streaming.py
```

## 使用示例

### Rust 客户端

```rust
use soulbox::{SoulBox, SandboxConfig, Language};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 创建沙箱
    let config = SandboxConfig::default()
        .with_memory_limit(512 * 1024 * 1024)  // 512MB
        .with_timeout(std::time::Duration::from_secs(30));
    
    let sandbox = SoulBox::create(config).await?;
    
    // 执行 Python 代码
    let result = sandbox.execute_code(
        Language::Python,
        r#"
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2*np.pi, 100)
y = np.sin(x)

plt.plot(x, y)
plt.title('Sine Wave')
plt.savefig('sine_wave.png')
print("Plot saved!")
        "#
    ).await?;
    
    println!("Output: {}", result.stdout);
    
    // 获取生成的图片
    if let Some(plot) = result.artifacts.iter().find(|a| a.path.ends_with("sine_wave.png")) {
        println!("Generated plot size: {} bytes", plot.size);
    }
    
    Ok(())
}
```

### Python 客户端

```python
import asyncio
from soulbox import SoulBox, SandboxConfig

async def main():
    # 创建沙箱配置
    config = SandboxConfig(
        memory_limit=512 * 1024 * 1024,  # 512MB
        cpu_quota=0.5,  # 50% CPU
        timeout=30  # 30秒超时
    )
    
    # 创建沙箱
    async with SoulBox(config) as sandbox:
        # 执行代码
        result = await sandbox.execute_code(
            language="python",
            code="""
import pandas as pd
import numpy as np

# 创建数据框
df = pd.DataFrame({
    'A': np.random.randn(100),
    'B': np.random.randn(100)
})

print(df.describe())
"""
        )
        
        print(f"执行结果:\n{result.stdout}")
        print(f"执行时间: {result.execution_time}ms")
        print(f"内存使用: {result.memory_usage / 1024 / 1024:.2f}MB")
```

## 性能基准测试

相比 E2B，SoulBox 的预期性能提升：

| 指标 | E2B (TypeScript/Python) | SoulBox (Rust) | 提升 |
|------|------------------------|----------------|------|
| 沙箱创建时间 | ~500ms | ~50ms | 10x |
| 代码执行开销 | ~100ms | ~10ms | 10x |
| 内存占用 | ~50MB | ~5MB | 10x |
| 并发处理能力 | 100/s | 1000/s | 10x |

## 下一步计划

1. **核心功能实现**
   - 完成基础沙箱隔离
   - 实现多语言执行支持
   - 添加文件系统操作

2. **安全增强**
   - 集成 gVisor 支持
   - 实现细粒度权限控制
   - 添加审计日志

3. **生态建设**
   - 发布 crates.io 包
   - 创建 Python/JavaScript 绑定
   - 编写详细文档和教程

4. **社区功能**
   - WebAssembly 支持
   - 分布式执行
   - GPU 计算支持

这就是 SoulBox 的整体设计方案！它将成为 Rust 生态系统中最安全、最快速的代码执行沙箱。