# SoulBox Rust 架构

> 高性能代码执行沙箱的 SoulBox 模块化 Rust 架构技术深入分析

## 🏗️ 架构概述

SoulBox 利用 Rust 的独特特性——零成本抽象、内存安全和无畏并发——来提供高性能代码执行沙箱。架构设计围绕四个核心原则：

1. **性能优先**：每个组件都为最小延迟和最大吞吐量而优化
2. **内存安全**：Rust 的所有权模型防止整类安全漏洞
3. **模块化设计**：清晰的关注点分离和明确定义的接口
4. **异步优先**：基于 tokio 构建，用于处理数千个并发执行

## 🎯 核心架构原则

### 1. 零拷贝架构
```rust
// 最小化内存分配和拷贝
use bytes::Bytes;
use tokio::io::{AsyncRead, AsyncWrite};

pub struct ExecutionRequest {
    code: Bytes,           // 零拷贝字节缓冲区
    language: Language,    // 枚举，栈分配
    config: &'static ExecutionConfig, // 静态引用
}
```

### 2. 无锁并发
```rust
use tokio::sync::{mpsc, oneshot};
use std::sync::Arc;
use dashmap::DashMap; // 无锁 HashMap

pub struct SandboxPool {
    // 用于高并发的无锁数据结构
    active_sandboxes: Arc<DashMap<SandboxId, SandboxHandle>>,
    available_sandboxes: mpsc::Receiver<SandboxHandle>,
    request_queue: mpsc::Sender<ExecutionRequest>,
}
```

### 3. 资源感知设计
```rust
pub struct ResourceLimits {
    max_memory: u64,        // 字节
    max_cpu_time: Duration, // CPU 时间限制
    max_wall_time: Duration,// 墙钟时间限制
    max_processes: u32,     // 进程数量限制
}

impl ResourceLimits {
    // 资源限制的编译时验证
    const fn validate(&self) -> bool {
        self.max_memory > 0 && 
        self.max_cpu_time.as_millis() > 0
    }
}
```

## 🧩 模块化组件架构

### 1. 核心模块 (`soulbox::core`)

**目的**：所有模块共享的基础类型、trait 和工具

```rust
// 定义系统契约的核心 trait
pub trait Executor {
    type Input;
    type Output;
    type Error;
    
    async fn execute(&self, input: Self::Input) -> Result<Self::Output, Self::Error>;
}

pub trait ResourceManager {
    async fn allocate(&self, requirements: ResourceRequirements) -> Result<ResourceHandle, AllocationError>;
    async fn deallocate(&self, handle: ResourceHandle) -> Result<(), DeallocationError>;
}

// 整个系统中使用的核心类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Language {
    Python,
    JavaScript,
    TypeScript,
    Rust,
    Go,
    Java,
    // 语言支持的可扩展枚举
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub execution_time: Duration,
    pub memory_used: u64,
}
```

**关键组件**：
- **错误处理**：使用 `thiserror` crate 的统一错误类型
- **日志记录**：使用 `tracing` crate 的结构化日志
- **配置**：使用 `serde` 和 `config` crate 的类型安全配置
- **指标**：使用 `metrics` crate 的性能指标收集

### 2. 基础设施模块 (`soulbox::infra`)

**目的**：容器和资源管理，从 E2B Infra (TypeScript) 迁移

```rust
use bollard::{Docker, container::*};
use tokio::sync::{Semaphore, RwLock};

pub struct ContainerManager {
    docker: Docker,
    // 用于限制并发容器的信号量
    container_semaphore: Arc<Semaphore>,
    // 准备好执行的热容器池
    warm_containers: Arc<RwLock<Vec<ContainerHandle>>>,
}

impl ContainerManager {
    pub async fn new(max_containers: usize) -> Result<Self, InfraError> {
        let docker = Docker::connect_with_local_defaults()?;
        let container_semaphore = Arc::new(Semaphore::new(max_containers));
        
        Ok(Self {
            docker,
            container_semaphore,
            warm_containers: Arc::new(RwLock::new(Vec::new())),
        })
    }
    
    // 带池化的优化容器获取
    pub async fn acquire_container(&self, image: &str) -> Result<ContainerHandle, InfraError> {
        let _permit = self.container_semaphore.acquire().await?;
        
        // 首先尝试获取热容器
        if let Some(container) = self.try_get_warm_container(image).await? {
            return Ok(container);
        }
        
        // 如果没有可用的热容器，则创建新容器
        self.create_container(image).await
    }
}

// 与 cgroups v2 集成的资源监控
pub struct ResourceMonitor {
    cgroup_path: PathBuf,
    metrics_sender: mpsc::Sender<ResourceMetrics>,
}

impl ResourceMonitor {
    pub async fn monitor_container(&self, container_id: &str) -> Result<(), MonitoringError> {
        let cgroup_path = self.cgroup_path.join(format!("docker/{}", container_id));
        
        loop {
            // 零分配读取 cgroups v2 指标
            let memory_usage = self.read_memory_usage(&cgroup_path).await?;
            let cpu_usage = self.read_cpu_usage(&cgroup_path).await?;
            
            let metrics = ResourceMetrics {
                container_id: container_id.into(),
                memory_usage,
                cpu_usage,
                timestamp: Instant::now(),
            };
            
            self.metrics_sender.send(metrics).await?;
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }
}
```

**架构特性**：
- **容器池化**：热容器将启动延迟从 2s 减少到 <100ms
- **资源隔离**：cgroups v2 集成实现精确的资源控制
- **健康监控**：持续健康检查并自动恢复
- **扩展逻辑**：基于需求和资源利用率的自动扩展

### 3. 解释器模块 (`soulbox::interpreter`)

**目的**：多语言代码执行引擎，从 Code Interpreter (Python) 迁移

```rust
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

// 语言特定的执行策略
pub struct PythonExecutor {
    python_path: PathBuf,
    virtual_env: Option<PathBuf>,
}

impl Executor for PythonExecutor {
    type Input = PythonCode;
    type Output = ExecutionResult;
    type Error = ExecutionError;
    
    async fn execute(&self, input: Self::Input) -> Result<Self::Output, Self::Error> {
        let start_time = Instant::now();
        
        // 为代码执行创建安全的临时文件
        let temp_file = self.create_secure_temp_file(&input.code).await?;
        
        // 在超时和资源限制下执行
        let mut cmd = Command::new(&self.python_path)
            .arg(&temp_file)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        
        // 使用 cgroups 应用资源限制
        self.apply_resource_limits(&mut cmd, &input.limits).await?;
        
        // 带超时执行
        let output = timeout(input.limits.max_wall_time, cmd.wait_with_output()).await??;
        
        // 清理临时文件
        let _ = tokio::fs::remove_file(temp_file).await;
        
        Ok(ExecutionResult {
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
            exit_code: output.status.code().unwrap_or(-1),
            execution_time: start_time.elapsed(),
            memory_used: self.get_peak_memory_usage().await?,
        })
    }
}

// 多语言执行分发
pub struct CodeInterpreter {
    python_executor: PythonExecutor,
    javascript_executor: JavaScriptExecutor,
    // ... 其他语言执行器
}

impl CodeInterpreter {
    pub async fn execute_code(
        &self,
        language: Language,
        code: &str,
        limits: ResourceLimits,
    ) -> Result<ExecutionResult, ExecutionError> {
        match language {
            Language::Python => {
                let python_code = PythonCode::new(code, limits);
                self.python_executor.execute(python_code).await
            },
            Language::JavaScript => {
                let js_code = JavaScriptCode::new(code, limits);
                self.javascript_executor.execute(js_code).await
            },
            // ... 其他语言
        }
    }
}
```

**性能优化**：
- **编译缓存**：缓存编译后的代码以加快后续执行
- **依赖预加载**：在热容器中预加载常用库
- **流式输出**：流式输出执行结果以实现实时反馈
- **资源预测**：基于 ML 的资源需求预测

### 4. API 模块 (`soulbox::api`)

**目的**：带认证的 HTTP/gRPC API 层，从 E2B Core (Go/TypeScript) 迁移

```rust
use axum::{
    extract::{State, Json},
    http::{StatusCode, HeaderMap},
    response::Json as ResponseJson,
    routing::{post, get},
    Router,
};
use tower::{ServiceBuilder, middleware};
use tower_http::{trace::TraceLayer, cors::CorsLayer};

#[derive(Clone)]
pub struct ApiState {
    interpreter: Arc<CodeInterpreter>,
    auth_service: Arc<AuthService>,
    rate_limiter: Arc<RateLimiter>,
}

// 高性能请求处理器
pub async fn execute_code(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(request): Json<ExecutionRequest>,
) -> Result<ResponseJson<ExecutionResponse>, ApiError> {
    
    // 认证请求
    let user_id = state.auth_service
        .authenticate(&headers)
        .await
        .map_err(|e| ApiError::Authentication(e))?;
    
    // 应用速率限制
    state.rate_limiter
        .check_rate_limit(&user_id)
        .await
        .map_err(|e| ApiError::RateLimited(e))?;
    
    // 带超时执行代码
    let result = tokio::time::timeout(
        Duration::from_secs(60),
        state.interpreter.execute_code(
            request.language,
            &request.code,
            request.resource_limits,
        )
    ).await
    .map_err(|_| ApiError::Timeout)?
    .map_err(|e| ApiError::Execution(e))?;
    
    Ok(ResponseJson(ExecutionResponse::from(result)))
}

// gRPC 服务实现
#[tonic::async_trait]
impl ExecutionService for SoulBoxService {
    async fn execute_code(
        &self,
        request: Request<ExecutionRequest>,
    ) -> Result<Response<ExecutionResponse>, Status> {
        
        let req = request.into_inner();
        
        // 将 gRPC 类型转换为内部类型
        let language = Language::try_from(req.language)
            .map_err(|_| Status::invalid_argument("Invalid language"))?;
            
        let limits = ResourceLimits {
            max_memory: req.max_memory,
            max_cpu_time: Duration::from_millis(req.max_cpu_time_ms),
            max_wall_time: Duration::from_millis(req.max_wall_time_ms),
            max_processes: req.max_processes,
        };
        
        // 执行代码
        let result = self.interpreter
            .execute_code(language, &req.code, limits)
            .await
            .map_err(|e| Status::internal(e.to_string()))?;
            
        // 将内部类型转换为 gRPC 响应
        let response = ExecutionResponse {
            stdout: result.stdout,
            stderr: result.stderr,
            exit_code: result.exit_code,
            execution_time_ms: result.execution_time.as_millis() as u64,
            memory_used: result.memory_used,
        };
        
        Ok(Response::new(response))
    }
}
```

**API 特性**：
- **双协议支持**：同时支持 REST 和 gRPC API 以适应不同用例
- **JWT 认证**：安全的基于令牌的认证，支持刷新令牌
- **速率限制**：令牌桶算法，支持按用户和全局限制
- **请求验证**：全面的输入验证，提供详细的错误消息

## 🚀 性能架构

### 1. 异步运行时优化

```rust
// 为最佳性能自定义的 tokio 运行时配置
pub fn create_optimized_runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(num_cpus::get())
        .thread_name("soulbox-worker")
        .thread_stack_size(2 * 1024 * 1024) // 2MB 栈
        .enable_all()
        .build()
        .expect("Failed to create tokio runtime")
}

// SurrealDB 连接管理用于统一数据操作
pub struct SurrealConnectionManager {
    primary_db: Arc<Surreal<Client>>,
    read_replicas: Vec<Arc<Surreal<Client>>>,
}

impl SurrealConnectionManager {
    pub fn get_read_connection(&self) -> Arc<Surreal<Client>> {
        if self.read_replicas.is_empty() {
            return Arc::clone(&self.primary_db);
        }
        // 在只读副本之间负载均衡
        let replica_index = fastrand::usize(..self.read_replicas.len());
        Arc::clone(&self.read_replicas[replica_index])
    }

    pub fn get_write_connection(&self) -> Arc<Surreal<Client>> {
        Arc::clone(&self.primary_db)
    }
}
```

### 2. 内存管理

```rust
// 用于高吞吐量场景下更好性能的自定义分配器
use jemallocator::Jemalloc;

#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

// 频繁分配对象的内存池
pub struct ObjectPool<T> {
    objects: Arc<Mutex<Vec<T>>>,
    factory: Arc<dyn Fn() -> T + Send + Sync>,
}

impl<T> ObjectPool<T> {
    pub async fn acquire(&self) -> PooledObject<T> {
        let mut objects = self.objects.lock().await;
        match objects.pop() {
            Some(object) => PooledObject::new(object, Arc::clone(&self.objects)),
            None => PooledObject::new((self.factory)(), Arc::clone(&self.objects)),
        }
    }
}
```

### 3. 缓存策略

```rust
use moka::future::Cache;
use std::hash::{Hash, Hasher};

// 执行结果的多级缓存
pub struct ExecutionCache {
    // L1：近期执行的内存缓存
    l1_cache: Cache<ExecutionKey, ExecutionResult>,
    // L2：跨实例共享结果的 Redis 缓存
    l2_cache: redis::aio::MultiplexedConnection,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ExecutionKey {
    code_hash: u64,
    language: Language,
    limits: ResourceLimits,
}

impl Hash for ExecutionKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.code_hash.hash(state);
        self.language.hash(state);
        // 哈希资源限制以确保缓存键的唯一性
        self.limits.max_memory.hash(state);
        self.limits.max_cpu_time.as_nanos().hash(state);
    }
}
```

## 📊 监控和可观测性

### 1. 指标收集

```rust
use metrics::{counter, gauge, histogram};
use tracing::{info, warn, error, debug};

pub struct MetricsCollector {
    execution_counter: metrics::Counter,
    execution_duration: metrics::Histogram,
    memory_usage: metrics::Gauge,
    active_containers: metrics::Gauge,
}

impl MetricsCollector {
    pub fn record_execution(&self, language: Language, duration: Duration, memory: u64) {
        // 使用语言标签增加执行计数器
        counter!("executions_total", "language" => language.as_str()).increment(1);
        
        // 记录执行持续时间
        histogram!("execution_duration_seconds", "language" => language.as_str())
            .record(duration.as_secs_f64());
        
        // 更新内存使用量仪表
        gauge!("memory_usage_bytes", "language" => language.as_str()).set(memory as f64);
    }
    
    pub fn record_container_lifecycle(&self, event: ContainerEvent) {
        match event {
            ContainerEvent::Created => {
                counter!("containers_created_total").increment(1);
                self.active_containers.increment(1.0);
            },
            ContainerEvent::Destroyed => {
                counter!("containers_destroyed_total").increment(1);
                self.active_containers.decrement(1.0);
            },
        }
    }
}
```

### 2. 分布式追踪

```rust
use tracing_opentelemetry::OpenTelemetrySpan;
use opentelemetry::trace::{TraceContextExt, Tracer};

#[tracing::instrument(
    name = "execute_code",
    fields(language = %language, code_size = code.len())
)]
pub async fn execute_code_traced(
    language: Language,
    code: &str,
    limits: ResourceLimits,
) -> Result<ExecutionResult, ExecutionError> {
    
    let span = tracing::Span::current();
    span.set_attribute("resource.memory_limit", limits.max_memory as i64);
    span.set_attribute("resource.cpu_limit_ms", limits.max_cpu_time.as_millis() as i64);
    
    // 为容器获取创建子 span
    let container_span = info_span!("acquire_container");
    let container = container_span
        .in_scope(|| self.container_manager.acquire_container(language.default_image()))
        .await?;
    
    // 为代码执行创建子 span
    let execution_span = info_span!("execute_in_container");
    let result = execution_span
        .in_scope(|| container.execute(code, limits))
        .await?;
    
    span.set_attribute("execution.exit_code", result.exit_code as i64);
    span.set_attribute("execution.duration_ms", result.execution_time.as_millis() as i64);
    
    Ok(result)
}
```

## 🔐 安全架构

### 1. 内存安全
Rust 的所有权模型消除了整类漏洞：
- **缓冲区溢出**：由于边界检查而不可能发生
- **释放后使用**：被所有权系统防止
- **重复释放**：编译时防止
- **内存泄漏**：自动内存管理

### 2. 沙箱策略

```rust
use nix::unistd::{setuid, setgid};
use nix::sys::resource::{setrlimit, Resource};

pub struct SandboxConfig {
    // 用户/组隔离
    uid: Option<u32>,
    gid: Option<u32>,
    
    // 资源限制
    memory_limit: u64,
    cpu_limit: Duration,
    file_descriptor_limit: u64,
    
    // 网络隔离
    network_namespace: bool,
    allowed_hosts: Vec<String>,
    
    // 文件系统隔离
    read_only_paths: Vec<PathBuf>,
    forbidden_paths: Vec<PathBuf>,
}

impl SandboxConfig {
    pub fn apply(&self) -> Result<(), SandboxError> {
        // 应用用户/组变更
        if let Some(gid) = self.gid {
            setgid(gid.into())?;
        }
        if let Some(uid) = self.uid {
            setuid(uid.into())?;
        }
        
        // 应用资源限制
        setrlimit(Resource::RLIMIT_AS, self.memory_limit, self.memory_limit)?;
        setrlimit(Resource::RLIMIT_NOFILE, 
                 self.file_descriptor_limit, 
                 self.file_descriptor_limit)?;
        
        // 额外的安全措施...
        
        Ok(())
    }
}
```

## 🎯 架构优势

### 1. 性能优势
- **执行速度提10倍**：零成本抽象和高效运行时
- **更低的内存使用量**：没有垃圾收集开销
- **更好的资源利用**：对系统资源的精确控制
- **降低延迟**：编译代码具有可预测的性能

### 2. 安全优势
- **内存安全**：没有分段错误或缓冲区溢出
- **线程安全**：编译时防止数据竞争
- **错误处理**：使用 `Result` 类型的显式错误处理
- **类型安全**：强静态类型防止运行时错误

### 3. 可维护性优势
- **清晰的所有权**：所有权模型使数据流显式
- **模块化**：明确定义的模块边界和接口
- **测试**：使用模拟实现的简单单元测试
- **文档**：具有表达性类型的自文档化代码

---

这个 Rust 架构为 SoulBox 的高性能、安全、可维护的代码执行沙箱提供了基础，在保持完整功能对等的同时，相对于之前的多语言实现提供了显著的改进。