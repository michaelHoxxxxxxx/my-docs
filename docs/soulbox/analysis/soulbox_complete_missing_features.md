# SoulBox 完整缺失功能清单

> 本文档整合了所有已发现的缺失功能，共计 22 个，作为 SoulBox 项目的开发指南

---

## 📋 功能分类概览

| 类别 | 功能数量 | 优先级 |
|------|----------|--------|
| **基础功能补充** | 10个 | P0-P1 |
| **认证与安全** | 2个 | P0 |
| **性能优化** | 2个 | P0 |
| **开发者体验** | 2个 | P1 |
| **网络增强** | 2个 | P1 |
| **存储功能** | 2个 | P2 |
| **企业功能** | 2个 | P2 |

---

## 第一部分：基础功能补充（原 10 个功能）

### 1. 健康检查端点

E2B 提供了 `/health` 端点用于检查沙箱状态。

#### Rust 实现

```rust
use axum::{
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub sandbox_id: String,
    pub uptime_seconds: u64,
    pub version: String,
}

impl SoulBox {
    /// 健康检查
    pub async fn health_check(&self) -> Result<HealthResponse, SoulBoxError> {
        let uptime = self.started_at.elapsed()?.as_secs();
        
        Ok(HealthResponse {
            status: "healthy".to_string(),
            sandbox_id: self.id.to_string(),
            uptime_seconds: uptime,
            version: env!("CARGO_PKG_VERSION").to_string(),
        })
    }
}

// API 端点
pub async fn health_handler(
    State(sandbox): State<Arc<SoulBox>>,
) -> impl IntoResponse {
    match sandbox.health_check().await {
        Ok(health) => (StatusCode::OK, Json(health)),
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unhealthy"
            }))
        ),
    }
}
```

### 2. 文件签名和安全 URL

E2B 支持生成带签名的上传/下载 URL，用于安全的文件传输。

#### Rust 实现

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::Engine;

#[derive(Debug, Clone)]
pub struct FileSignature {
    pub signature: String,
    pub expiration: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct SignatureOptions {
    pub path: String,
    pub operation: FileOperation,
    pub user: Username,
    pub expiration_in_seconds: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FileOperation {
    Read,
    Write,
}

impl SoulBox {
    /// 生成文件操作签名
    pub async fn generate_signature(
        &self,
        opts: SignatureOptions,
    ) -> Result<FileSignature, SoulBoxError> {
        let secret = self.envd_access_token.as_ref()
            .ok_or(SoulBoxError::SecurityViolation("No access token".into()))?;
        
        let expiration = opts.expiration_in_seconds
            .map(|secs| Utc::now().timestamp() + secs as i64);
        
        // 构建签名内容
        let mut content = format!(
            "{}:{}:{}",
            opts.path,
            match opts.operation {
                FileOperation::Read => "read",
                FileOperation::Write => "write",
            },
            opts.user
        );
        
        if let Some(exp) = expiration {
            content.push_str(&format!(":{}", exp));
        }
        
        // 生成 HMAC 签名
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())?;
        mac.update(content.as_bytes());
        let signature = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(mac.finalize().into_bytes());
        
        Ok(FileSignature {
            signature,
            expiration,
        })
    }
}
```

### 3. 版本兼容性检查

E2B SDK 包含版本兼容性逻辑，确保客户端和服务端版本匹配。

#### Rust 实现

```rust
use semver::{Version, VersionReq};

pub const ENVD_VERSION_RECURSIVE_WATCH: &str = "0.1.4";
pub const MIN_SUPPORTED_VERSION: &str = "0.1.0";
pub const CURRENT_API_VERSION: &str = "v1";

#[derive(Debug, Clone)]
pub struct VersionInfo {
    pub envd_version: Option<Version>,
    pub api_version: String,
    pub sdk_version: Version,
}

impl SoulBox {
    /// 检查版本兼容性
    pub fn check_version_compatibility(&self) -> Result<(), SoulBoxError> {
        if let Some(ref envd_version) = self.version_info.envd_version {
            let min_version = Version::parse(MIN_SUPPORTED_VERSION)?;
            
            if envd_version < &min_version {
                return Err(SoulBoxError::VersionMismatch(format!(
                    "Envd version {} is too old. Minimum supported version is {}",
                    envd_version, min_version
                )));
            }
        }
        
        Ok(())
    }
}
```

### 4. 自动暂停功能

E2B 支持在超时后自动暂停沙箱而不是终止。

#### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutBehavior {
    pub auto_pause: bool,
    pub grace_period_ms: Option<u64>,
}

impl SoulBox {
    /// 设置超时行为
    pub async fn set_timeout_behavior(
        &self,
        timeout_ms: u64,
        behavior: TimeoutBehavior,
    ) -> Result<(), SoulBoxError> {
        // 取消现有的超时任务
        if let Some(handle) = self.timeout_handle.lock().await.take() {
            handle.abort();
        }
        
        let sandbox = self.clone();
        let handle = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(timeout_ms)).await;
            
            if behavior.auto_pause {
                // 暂停而不是终止
                if let Err(e) = sandbox.pause().await {
                    error!("Failed to auto-pause sandbox: {}", e);
                } else {
                    info!("Sandbox {} auto-paused after timeout", sandbox.id);
                }
            } else {
                // 直接终止
                if let Err(e) = sandbox.terminate().await {
                    error!("Failed to terminate sandbox: {}", e);
                }
            }
        });
        
        *self.timeout_handle.lock().await = Some(handle);
        
        Ok(())
    }
}
```

### 5. 命令结果的部分输出获取

E2B 的 CommandHandle 支持在命令执行过程中获取部分输出。

#### Rust 实现

```rust
use tokio::sync::watch;

pub struct CommandHandle {
    pid: u32,
    stdout: Arc<Mutex<String>>,
    stderr: Arc<Mutex<String>>,
    exit_code: watch::Receiver<Option<i32>>,
    result_tx: watch::Sender<Option<i32>>,
}

impl CommandHandle {
    /// 获取当前的 stdout（不等待命令完成）
    pub async fn get_stdout(&self) -> String {
        self.stdout.lock().await.clone()
    }
    
    /// 获取当前的 stderr（不等待命令完成）
    pub async fn get_stderr(&self) -> String {
        self.stderr.lock().await.clone()
    }
    
    /// 检查命令是否已完成
    pub fn is_finished(&self) -> bool {
        self.exit_code.borrow().is_some()
    }
}
```

### 6. 连接重定向支持

E2B 在连接时支持重定向，这对于边缘运行时很重要。

#### Rust 实现

```rust
use reqwest::{Client, redirect::Policy};

pub struct ConnectionConfig {
    pub follow_redirects: bool,
    pub max_redirects: usize,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            follow_redirects: true,
            max_redirects: 10,
        }
    }
}

impl SoulBox {
    /// 创建 HTTP 客户端
    fn create_http_client(config: &ConnectionConfig) -> Result<Client, SoulBoxError> {
        let mut builder = Client::builder();
        
        if config.follow_redirects {
            builder = builder.redirect(Policy::limited(config.max_redirects));
        } else {
            builder = builder.redirect(Policy::none());
        }
        
        Ok(builder
            .timeout(Duration::from_millis(config.request_timeout_ms))
            .build()?)
    }
}
```

### 7. 沙箱刷新机制

E2B 支持刷新沙箱以延长其生命周期。

#### Rust 实现

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshOptions {
    pub extend_by_ms: u64,
    pub max_duration_ms: Option<u64>,
}

impl SoulBox {
    /// 刷新沙箱，延长其生命周期
    pub async fn refresh(
        &self,
        opts: RefreshOptions,
    ) -> Result<DateTime<Utc>, SoulBoxError> {
        // 计算新的结束时间
        let current_end = self.end_at.lock().await;
        let new_end = *current_end + Duration::milliseconds(opts.extend_by_ms as i64);
        
        // 检查最大持续时间限制
        if let Some(max_duration) = opts.max_duration_ms {
            let max_end = self.started_at + Duration::milliseconds(max_duration as i64);
            if new_end > max_end {
                return Err(SoulBoxError::InvalidArgument(
                    "Cannot extend sandbox beyond maximum duration".into()
                ));
            }
        }
        
        // 更新结束时间
        *self.end_at.lock().await = new_end;
        
        Ok(new_end)
    }
}
```

### 8. 沙箱指标详细信息

E2B 提供了详细的沙箱指标，包括 CPU、内存、网络等。

#### Rust 实现

```rust
use sysinfo::{System, SystemExt, ProcessExt};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxMetric {
    pub timestamp: DateTime<Utc>,
    pub cpu_percent: f64,
    pub memory_bytes: u64,
    pub memory_percent: f64,
    pub disk_read_bytes: u64,
    pub disk_write_bytes: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
    pub process_count: u32,
}

pub struct MetricsCollector {
    system: System,
    sandbox_id: Uuid,
    interval: Duration,
    metrics: Arc<Mutex<Vec<SandboxMetric>>>,
}

impl MetricsCollector {
    /// 开始收集指标
    pub fn start(sandbox_id: Uuid, interval: Duration) -> Self {
        let collector = Self {
            system: System::new_all(),
            sandbox_id,
            interval,
            metrics: Arc::new(Mutex::new(Vec::new())),
        };
        
        collector
    }
    
    /// 获取指定时间范围的指标
    pub async fn get_metrics(
        &self,
        start: Option<DateTime<Utc>>,
        end: Option<DateTime<Utc>>,
    ) -> Vec<SandboxMetric> {
        let metrics = self.metrics.lock().await;
        
        metrics.iter()
            .filter(|m| {
                let after_start = start.map_or(true, |s| m.timestamp >= s);
                let before_end = end.map_or(true, |e| m.timestamp <= e);
                after_start && before_end
            })
            .cloned()
            .collect()
    }
}
```

### 9. 模板构建日志流

E2B 在构建模板时支持实时日志流。

#### Rust 实现

```rust
use tokio::sync::mpsc;
use futures::stream::Stream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildLog {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub message: String,
    pub step: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

impl TemplateBuilder {
    /// 构建模板并流式返回日志
    pub fn build_stream(
        &self,
    ) -> (impl Stream<Item = BuildLog>, JoinHandle<Result<TemplateImage, SoulBoxError>>) {
        let (tx, rx) = mpsc::channel(100);
        
        let handle = tokio::spawn(async move {
            // Docker 构建逻辑
            Ok(TemplateImage::default())
        });
        
        (ReceiverStream::new(rx), handle)
    }
}
```

### 10. 节点健康状态

E2B 跟踪沙箱运行的节点状态。

#### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeStatus {
    Healthy,
    Degraded,
    Draining,
    Connecting,
    Unhealthy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: String,
    pub status: NodeStatus,
    pub cpu_count: u32,
    pub memory_mb: u32,
    pub available_cpu: f32,
    pub available_memory_mb: u32,
    pub sandbox_count: u32,
    pub region: String,
    pub last_health_check: DateTime<Utc>,
}

pub struct NodeManager {
    nodes: Arc<Mutex<HashMap<String, NodeInfo>>>,
}

impl NodeManager {
    /// 选择最佳节点来运行沙箱
    pub async fn select_node(
        &self,
        requirements: &SandboxConfig,
    ) -> Result<String, SoulBoxError> {
        let nodes = self.nodes.lock().await;
        
        let suitable_nodes: Vec<_> = nodes
            .values()
            .filter(|node| {
                node.status == NodeStatus::Healthy &&
                node.available_cpu >= requirements.cpu_quota &&
                node.available_memory_mb >= (requirements.memory_limit / 1024 / 1024) as u32
            })
            .collect();
        
        if suitable_nodes.is_empty() {
            return Err(SoulBoxError::NoAvailableNodes);
        }
        
        // 选择负载最低的节点
        let best_node = suitable_nodes
            .into_iter()
            .min_by_key(|node| node.sandbox_count)
            .unwrap();
        
        Ok(best_node.node_id.clone())
    }
}
```

---

## 第二部分：新发现的缺失功能（12 个）

### 11. 多层认证机制 ⭐⭐⭐⭐⭐

E2B 实现了完整的认证链，包括 API 密钥、JWT、mTLS 等多种认证方式。

#### 设计目标
- 支持多种认证方式
- 认证链式验证
- 细粒度的权限控制
- 安全令牌管理

#### Rust 实现

```rust
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rustls::ServerConfig;

pub struct AuthenticationLayer {
    // API 密钥认证
    api_key_store: Arc<Mutex<HashMap<String, ApiKeyInfo>>>,
    // JWT 令牌认证
    jwt_secret: String,
    // mTLS 双向认证
    tls_config: Option<ServerConfig>,
    // OAuth2 集成
    oauth2_providers: HashMap<String, OAuth2Config>,
}

#[derive(Debug, Clone)]
pub struct ApiKeyInfo {
    pub key_id: String,
    pub user_id: UserId,
    pub permissions: Vec<Permission>,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub exp: i64,
    pub iat: i64,
    pub permissions: Vec<String>,
}

impl AuthenticationLayer {
    /// 验证请求的认证信息
    pub async fn authenticate_request(
        &self,
        req: &Request,
    ) -> Result<AuthContext, AuthError> {
        // 尝试多种认证方式
        
        // 1. API Key 认证
        if let Some(api_key) = req.headers().get("X-API-Key") {
            if let Ok(context) = self.verify_api_key(api_key.to_str()?).await {
                return Ok(context);
            }
        }
        
        // 2. JWT 认证
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(token) = auth_header.to_str() {
                if token.starts_with("Bearer ") {
                    let jwt = &token[7..];
                    if let Ok(context) = self.verify_jwt(jwt).await {
                        return Ok(context);
                    }
                }
            }
        }
        
        // 3. mTLS 认证
        if let Some(cert) = req.extensions().get::<Certificate>() {
            if let Ok(context) = self.verify_mtls_cert(cert).await {
                return Ok(context);
            }
        }
        
        Err(AuthError::Unauthorized("No valid authentication provided".into()))
    }
    
    /// 生成新的 API 密钥
    pub async fn generate_api_key(
        &self,
        user_id: UserId,
        permissions: Vec<Permission>,
        expires_in: Option<Duration>,
    ) -> Result<String, AuthError> {
        let key = generate_secure_token(32);
        let key_id = generate_secure_token(16);
        
        let info = ApiKeyInfo {
            key_id: key_id.clone(),
            user_id,
            permissions,
            created_at: Utc::now(),
            expires_at: expires_in.map(|d| Utc::now() + d),
            last_used: None,
        };
        
        self.api_key_store.lock().await.insert(key.clone(), info);
        
        Ok(format!("sb_{}_{}", key_id, key))
    }
}
```

### 12. 细粒度权限控制 (RBAC) ⭐⭐⭐⭐⭐

实现基于角色的访问控制系统。

#### Rust 实现

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub resource: Resource,
    pub action: Action,
    pub conditions: Vec<Condition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Resource {
    Sandbox(SandboxId),
    Template(TemplateId),
    File(PathBuf),
    Network(NetworkResource),
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Action {
    Create,
    Read,
    Update,
    Delete,
    Execute,
    Connect,
    Admin,
}

#[derive(Debug, Clone)]
pub struct Role {
    pub id: RoleId,
    pub name: String,
    pub permissions: Vec<Permission>,
    pub parent_roles: Vec<RoleId>,
}

pub struct RbacManager {
    roles: Arc<Mutex<HashMap<RoleId, Role>>>,
    user_roles: Arc<Mutex<HashMap<UserId, Vec<RoleId>>>>,
}

impl RbacManager {
    /// 检查用户是否有权限执行操作
    pub async fn check_permission(
        &self,
        user_id: &UserId,
        resource: &Resource,
        action: &Action,
    ) -> Result<(), AuthError> {
        let user_roles = self.user_roles.lock().await;
        let roles = self.roles.lock().await;
        
        let role_ids = user_roles.get(user_id)
            .ok_or_else(|| AuthError::NoRoles)?;
        
        // 递归检查所有角色及其父角色
        for role_id in role_ids {
            if self.role_has_permission(&roles, role_id, resource, action).await? {
                return Ok(());
            }
        }
        
        Err(AuthError::PermissionDenied)
    }
    
    /// 为用户分配角色
    pub async fn assign_role(
        &self,
        user_id: UserId,
        role_id: RoleId,
    ) -> Result<(), AuthError> {
        let mut user_roles = self.user_roles.lock().await;
        user_roles.entry(user_id)
            .or_insert_with(Vec::new)
            .push(role_id);
        Ok(())
    }
}
```

### 13. 智能沙箱池管理 ⭐⭐⭐⭐⭐

预热池机制大幅提升启动速度。

#### 设计目标
- 预创建沙箱实例
- 智能预测和补充
- 资源优化利用
- 快速启动响应

#### Rust 实现

```rust
pub struct SandboxPool {
    // 预热的沙箱实例
    warm_pool: Arc<Mutex<HashMap<TemplateId, Vec<WarmSandbox>>>>,
    // 使用中的沙箱
    active_sandboxes: Arc<Mutex<HashMap<SandboxId, ActiveSandbox>>>,
    // 池配置
    config: PoolConfig,
    // 自动补充任务
    refill_handle: Option<JoinHandle<()>>,
    // 统计信息
    stats: Arc<Mutex<PoolStats>>,
}

#[derive(Debug, Clone)]
pub struct PoolConfig {
    // 每个模板的最小预热数量
    pub min_warm_instances: HashMap<TemplateId, usize>,
    // 最大池大小
    pub max_pool_size: usize,
    // 预热策略
    pub warmup_strategy: WarmupStrategy,
    // 补充阈值
    pub refill_threshold: f32,
    // 池清理间隔
    pub cleanup_interval: Duration,
}

#[derive(Debug, Clone)]
pub enum WarmupStrategy {
    // 基于历史使用模式
    Historical { window: Duration },
    // 固定数量
    Fixed { count: usize },
    // 动态调整
    Dynamic { 
        min: usize,
        max: usize,
        adjustment_rate: f32,
    },
}

#[derive(Debug)]
pub struct WarmSandbox {
    sandbox: Sandbox,
    template_id: TemplateId,
    created_at: DateTime<Utc>,
    warmed_at: DateTime<Utc>,
}

impl SandboxPool {
    /// 从池中获取或创建沙箱
    pub async fn acquire(
        &self,
        template_id: &TemplateId,
        config: Option<SandboxConfig>,
    ) -> Result<Sandbox, SoulBoxError> {
        // 记录请求
        self.stats.lock().await.record_request(template_id);
        
        // 尝试从预热池获取
        if let Some(warm) = self.get_from_warm_pool(template_id).await? {
            info!("Acquired warm sandbox for template {}", template_id);
            
            // 触发异步补充
            self.trigger_refill(template_id).await;
            
            return Ok(warm.activate(config).await?);
        }
        
        // 冷启动
        info!("Cold starting sandbox for template {}", template_id);
        self.create_cold(template_id, config).await
    }
    
    /// 预热沙箱
    async fn warmup_sandbox(template_id: &TemplateId) -> Result<WarmSandbox, SoulBoxError> {
        let sandbox = Sandbox::create_minimal(template_id).await?;
        
        // 执行预热步骤
        sandbox.preload_runtime().await?;
        sandbox.prepare_filesystem().await?;
        
        Ok(WarmSandbox {
            sandbox,
            template_id: template_id.clone(),
            created_at: Utc::now(),
            warmed_at: Utc::now(),
        })
    }
    
    /// 自动补充逻辑
    fn start_refill_task(self: Arc<Self>) {
        let pool = self.clone();
        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(10));
            
            loop {
                interval.tick().await;
                
                if let Err(e) = pool.refill_pools().await {
                    error!("Failed to refill pools: {}", e);
                }
            }
        });
        
        self.refill_handle = Some(handle);
    }
}
```

### 14. 动态资源调度器 ⭐⭐⭐⭐

智能分配和管理系统资源。

#### Rust 实现

```rust
pub struct ResourceScheduler {
    // 节点管理
    node_manager: Arc<NodeManager>,
    // 资源使用追踪
    resource_tracker: Arc<ResourceTracker>,
    // 调度策略
    strategy: Arc<dyn SchedulingStrategy>,
    // QoS 管理
    qos_manager: Arc<QosManager>,
    // 预测模型
    predictor: Arc<ResourcePredictor>,
}

#[async_trait]
pub trait SchedulingStrategy: Send + Sync {
    async fn select_node(
        &self,
        requirements: &ResourceRequirements,
        available_nodes: &[NodeInfo],
    ) -> Result<NodeId, SchedulerError>;
}

pub struct BinPackingStrategy;
pub struct SpreadStrategy;
pub struct AffinityStrategy {
    affinity_rules: Vec<AffinityRule>,
}

#[derive(Debug, Clone)]
pub struct ResourceRequirements {
    pub cpu_cores: f32,
    pub memory_mb: u32,
    pub gpu_count: Option<u32>,
    pub network_bandwidth_mbps: Option<u32>,
    pub storage_gb: Option<u32>,
    pub constraints: Vec<Constraint>,
}

impl ResourceScheduler {
    /// 为沙箱分配资源
    pub async fn schedule_sandbox(
        &self,
        requirements: &ResourceRequirements,
    ) -> Result<SchedulingDecision, SchedulerError> {
        // 获取可用节点
        let available_nodes = self.node_manager.get_healthy_nodes().await?;
        
        // 过滤满足要求的节点
        let suitable_nodes = self.filter_suitable_nodes(&available_nodes, requirements)?;
        
        if suitable_nodes.is_empty() {
            return Err(SchedulerError::InsufficientResources);
        }
        
        // 使用策略选择最佳节点
        let selected_node = self.strategy.select_node(requirements, &suitable_nodes).await?;
        
        // 预留资源
        let reservation = self.resource_tracker
            .reserve(selected_node.clone(), requirements)
            .await?;
        
        // 配置 QoS
        let qos_config = self.qos_manager
            .configure_qos(&selected_node, requirements)
            .await?;
        
        Ok(SchedulingDecision {
            node_id: selected_node,
            reservation_id: reservation.id,
            qos_config,
        })
    }
    
    /// 动态调整资源分配
    pub async fn rebalance(&self) -> Result<Vec<Migration>, SchedulerError> {
        let current_state = self.resource_tracker.get_cluster_state().await?;
        let predicted_load = self.predictor.predict_load(Duration::from_mins(15)).await?;
        
        // 计算最优分配
        let optimal_allocation = self.calculate_optimal_allocation(
            &current_state,
            &predicted_load,
        )?;
        
        // 生成迁移计划
        let migrations = self.plan_migrations(&current_state, &optimal_allocation)?;
        
        Ok(migrations)
    }
}
```

### 15. CLI 工具套件 ⭐⭐⭐⭐

完整的命令行工具支持。

#### 设计结构

```bash
soulbox
├── init          # 初始化项目
├── template      # 模板管理
│   ├── build     # 构建模板
│   ├── list      # 列出模板
│   └── push      # 推送模板
├── sandbox       # 沙箱管理
│   ├── create    # 创建沙箱
│   ├── list      # 列出沙箱
│   ├── destroy   # 销毁沙箱
│   └── info      # 沙箱信息
├── exec          # 执行命令
├── cp            # 复制文件
├── logs          # 查看日志
└── config        # 配置管理
```

#### Rust 实现

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[clap(name = "soulbox")]
#[clap(about = "SoulBox CLI - Secure code execution sandbox", version)]
pub struct Cli {
    #[clap(subcommand)]
    pub command: Commands,
    
    #[clap(short, long, global = true)]
    pub config: Option<PathBuf>,
    
    #[clap(short, long, global = true)]
    pub verbose: bool,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Initialize a new SoulBox project
    Init {
        #[clap(short, long)]
        name: Option<String>,
        
        #[clap(long)]
        template: Option<String>,
    },
    
    /// Manage templates
    Template {
        #[clap(subcommand)]
        command: TemplateCommands,
    },
    
    /// Manage sandboxes
    Sandbox {
        #[clap(subcommand)]
        command: SandboxCommands,
    },
    
    /// Execute command in sandbox
    Exec {
        sandbox_id: String,
        command: Vec<String>,
        
        #[clap(short, long)]
        interactive: bool,
    },
    
    /// Copy files to/from sandbox
    Cp {
        source: String,
        destination: String,
        
        #[clap(short, long)]
        recursive: bool,
    },
    
    /// View sandbox logs
    Logs {
        sandbox_id: String,
        
        #[clap(short, long)]
        follow: bool,
        
        #[clap(short, long)]
        tail: Option<usize>,
    },
}

/// CLI 应用主逻辑
pub async fn run_cli() -> Result<(), CliError> {
    let cli = Cli::parse();
    
    // 初始化配置
    let config = load_config(cli.config)?;
    
    // 设置日志
    if cli.verbose {
        env_logger::Builder::from_env(env_logger::Env::default())
            .filter_level(log::LevelFilter::Debug)
            .init();
    }
    
    // 执行命令
    match cli.command {
        Commands::Init { name, template } => {
            cmd_init(name, template).await?;
        }
        Commands::Template { command } => {
            handle_template_command(command, &config).await?;
        }
        Commands::Sandbox { command } => {
            handle_sandbox_command(command, &config).await?;
        }
        Commands::Exec { sandbox_id, command, interactive } => {
            cmd_exec(&sandbox_id, command, interactive, &config).await?;
        }
        Commands::Cp { source, destination, recursive } => {
            cmd_copy(&source, &destination, recursive, &config).await?;
        }
        Commands::Logs { sandbox_id, follow, tail } => {
            cmd_logs(&sandbox_id, follow, tail, &config).await?;
        }
    }
    
    Ok(())
}
```

### 16. 实时日志流和调试 ⭐⭐⭐⭐

支持实时日志查看和远程调试。

#### Rust 实现

```rust
use tokio::sync::broadcast;
use futures::stream::{Stream, StreamExt};

pub struct LogStreamer {
    // 日志缓冲区
    buffer: Arc<Mutex<CircularBuffer<LogEntry>>>,
    // 广播通道
    broadcaster: broadcast::Sender<LogEntry>,
    // 日志过滤器
    filters: Arc<Mutex<Vec<LogFilter>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub source: LogSource,
    pub message: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub enum LogSource {
    Sandbox(SandboxId),
    System,
    Process(u32),
    Container(String),
}

impl LogStreamer {
    /// 订阅日志流
    pub fn subscribe(
        &self,
        filter: Option<LogFilter>,
    ) -> impl Stream<Item = LogEntry> {
        let mut receiver = self.broadcaster.subscribe();
        let filter = filter.unwrap_or_default();
        
        async_stream::stream! {
            while let Ok(entry) = receiver.recv().await {
                if filter.matches(&entry) {
                    yield entry;
                }
            }
        }
    }
    
    /// 流式传输日志到 WebSocket
    pub async fn stream_to_websocket(
        &self,
        ws: WebSocketStream,
        filter: Option<LogFilter>,
    ) -> Result<(), StreamError> {
        let mut log_stream = self.subscribe(filter);
        let (mut tx, mut rx) = ws.split();
        
        // 发送历史日志
        let history = self.get_recent_logs(100).await?;
        for entry in history {
            let msg = Message::text(serde_json::to_string(&entry)?);
            tx.send(msg).await?;
        }
        
        // 流式发送新日志
        while let Some(entry) = log_stream.next().await {
            let msg = Message::text(serde_json::to_string(&entry)?);
            if tx.send(msg).await.is_err() {
                break;
            }
        }
        
        Ok(())
    }
}

/// 远程调试支持
pub struct DebugServer {
    sandboxes: Arc<Mutex<HashMap<SandboxId, DebugSession>>>,
    port: u16,
}

pub struct DebugSession {
    sandbox_id: SandboxId,
    debugger: Box<dyn Debugger>,
    breakpoints: Vec<Breakpoint>,
    watch_expressions: Vec<WatchExpression>,
}

impl DebugServer {
    /// 启动调试服务器
    pub async fn start(&self) -> Result<(), DebugError> {
        let app = Router::new()
            .route("/debug/:sandbox_id/attach", post(Self::handle_attach))
            .route("/debug/:sandbox_id/breakpoint", post(Self::handle_breakpoint))
            .route("/debug/:sandbox_id/step", post(Self::handle_step))
            .route("/debug/:sandbox_id/continue", post(Self::handle_continue))
            .route("/debug/:sandbox_id/evaluate", post(Self::handle_evaluate))
            .with_state(self.clone());
        
        axum::Server::bind(&([0, 0, 0, 0], self.port).into())
            .serve(app.into_make_service())
            .await?;
        
        Ok(())
    }
}
```

### 17. 高级网络管理 ⭐⭐⭐⭐

完整的虚拟网络和流量控制。

#### Rust 实现

```rust
use nix::sys::socket::{socket, AddressFamily, SockType, SockFlag};

pub struct NetworkManager {
    // 虚拟网络拓扑
    topology: Arc<Mutex<NetworkTopology>>,
    // 流量控制
    traffic_control: Arc<TrafficControl>,
    // DNS 管理
    dns_resolver: Arc<DnsResolver>,
    // 防火墙规则
    firewall: Arc<Firewall>,
}

#[derive(Debug, Clone)]
pub struct NetworkTopology {
    // 虚拟网桥
    bridges: HashMap<BridgeId, VirtualBridge>,
    // 网络命名空间
    namespaces: HashMap<SandboxId, NetworkNamespace>,
    // 路由表
    routing_table: RoutingTable,
}

pub struct TrafficControl {
    // 带宽限制
    bandwidth_limiter: Arc<Mutex<HashMap<SandboxId, BandwidthLimit>>>,
    // 延迟模拟
    latency_emulator: Arc<LatencyEmulator>,
    // 丢包模拟
    packet_loss: Arc<PacketLossEmulator>,
    // QoS 队列
    qos_queues: Arc<Mutex<HashMap<SandboxId, QosQueue>>>,
}

#[derive(Debug, Clone)]
pub struct BandwidthLimit {
    pub ingress_mbps: u32,
    pub egress_mbps: u32,
    pub burst_size: Option<u32>,
}

impl NetworkManager {
    /// 为沙箱创建隔离网络
    pub async fn create_sandbox_network(
        &self,
        sandbox_id: &SandboxId,
        config: &NetworkConfig,
    ) -> Result<NetworkInfo, NetworkError> {
        // 创建网络命名空间
        let netns = self.create_network_namespace(sandbox_id).await?;
        
        // 创建虚拟网卡对
        let (veth_host, veth_sandbox) = self.create_veth_pair(sandbox_id).await?;
        
        // 移动网卡到命名空间
        self.move_interface_to_netns(&veth_sandbox, &netns).await?;
        
        // 配置网络
        self.configure_network(&netns, &veth_sandbox, config).await?;
        
        // 设置流量控制
        if let Some(tc) = &config.traffic_control {
            self.apply_traffic_control(sandbox_id, tc).await?;
        }
        
        // 配置防火墙规则
        if let Some(rules) = &config.firewall_rules {
            self.firewall.apply_rules(sandbox_id, rules).await?;
        }
        
        Ok(NetworkInfo {
            namespace: netns,
            interfaces: vec![veth_sandbox],
            ip_address: config.ip_address.clone(),
        })
    }
    
    /// 应用流量控制
    async fn apply_traffic_control(
        &self,
        sandbox_id: &SandboxId,
        config: &TrafficControlConfig,
    ) -> Result<(), NetworkError> {
        // 带宽限制
        if let Some(bandwidth) = &config.bandwidth_limit {
            self.traffic_control.bandwidth_limiter
                .lock().await
                .insert(sandbox_id.clone(), bandwidth.clone());
            
            // 使用 tc 命令配置
            self.execute_tc_command(&[
                "qdisc", "add", "dev", &format!("veth-{}", sandbox_id),
                "root", "tbf",
                "rate", &format!("{}mbit", bandwidth.egress_mbps),
                "burst", "32kbit",
                "latency", "400ms",
            ]).await?;
        }
        
        // 延迟模拟
        if let Some(latency) = &config.latency_ms {
            self.execute_tc_command(&[
                "qdisc", "add", "dev", &format!("veth-{}", sandbox_id),
                "root", "netem",
                "delay", &format!("{}ms", latency),
            ]).await?;
        }
        
        Ok(())
    }
}
```

### 18. WebSocket 和 PTY 支持 ⭐⭐⭐⭐

交互式终端和实时通信。

#### Rust 实现

```rust
use tokio_tungstenite::{WebSocketStream, tungstenite::Message};
use nix::pty::{openpty, OpenptyResult};

pub struct PtyManager {
    // PTY 会话管理
    sessions: Arc<Mutex<HashMap<SessionId, PtySession>>>,
    // WebSocket 连接管理
    connections: Arc<Mutex<HashMap<ConnectionId, WebSocketStream<TcpStream>>>>,
}

pub struct PtySession {
    // 会话 ID
    id: SessionId,
    // 主从 PTY 对
    pty: OpenptyResult,
    // 关联的沙箱
    sandbox_id: SandboxId,
    // 会话配置
    config: PtyConfig,
    // 输入输出缓冲
    buffer: Arc<Mutex<CircularBuffer>>,
}

#[derive(Debug, Clone)]
pub struct PtyConfig {
    pub rows: u16,
    pub cols: u16,
    pub term: String,
    pub shell: PathBuf,
    pub env: HashMap<String, String>,
}

impl PtyManager {
    /// 创建新的 PTY 会话
    pub async fn create_session(
        &self,
        sandbox_id: &SandboxId,
        config: PtyConfig,
    ) -> Result<SessionInfo, PtyError> {
        // 打开 PTY
        let pty = openpty(None, None)?;
        
        // 设置终端大小
        self.set_terminal_size(&pty, config.rows, config.cols)?;
        
        // 在沙箱中启动 shell
        let sandbox = self.get_sandbox(sandbox_id).await?;
        let process = sandbox.spawn_with_pty(
            &config.shell,
            pty.slave,
            config.env.clone(),
        ).await?;
        
        // 创建会话
        let session = PtySession {
            id: SessionId::new(),
            pty,
            sandbox_id: sandbox_id.clone(),
            config,
            buffer: Arc::new(Mutex::new(CircularBuffer::new(1024 * 1024))),
        };
        
        let session_id = session.id.clone();
        self.sessions.lock().await.insert(session_id.clone(), session);
        
        // 启动 I/O 转发
        self.start_io_forwarding(session_id.clone()).await?;
        
        Ok(SessionInfo {
            session_id,
            websocket_url: format!("/ws/pty/{}", session_id),
        })
    }
    
    /// 处理 WebSocket 连接
    pub async fn handle_websocket(
        &self,
        ws: WebSocketStream<TcpStream>,
        session_id: SessionId,
    ) -> Result<(), PtyError> {
        let (ws_tx, mut ws_rx) = ws.split();
        let ws_tx = Arc::new(Mutex::new(ws_tx));
        
        let session = self.sessions.lock().await
            .get(&session_id)
            .cloned()
            .ok_or(PtyError::SessionNotFound)?;
        
        // 从 PTY 到 WebSocket
        let pty_to_ws = {
            let ws_tx = ws_tx.clone();
            let master_fd = session.pty.master;
            
            tokio::spawn(async move {
                let mut buffer = [0u8; 4096];
                let mut master = unsafe { File::from_raw_fd(master_fd) };
                
                loop {
                    match master.read(&mut buffer).await {
                        Ok(0) => break,
                        Ok(n) => {
                            let data = &buffer[..n];
                            let msg = Message::Binary(data.to_vec());
                            
                            if ws_tx.lock().await.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }
            })
        };
        
        // 从 WebSocket 到 PTY
        let ws_to_pty = {
            let master_fd = session.pty.master;
            
            tokio::spawn(async move {
                let mut master = unsafe { File::from_raw_fd(master_fd) };
                
                while let Some(Ok(msg)) = ws_rx.next().await {
                    match msg {
                        Message::Binary(data) | Message::Text(data) => {
                            if master.write_all(&data).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
            })
        };
        
        // 等待任一方向结束
        tokio::select! {
            _ = pty_to_ws => {},
            _ = ws_to_pty => {},
        }
        
        // 清理会话
        self.sessions.lock().await.remove(&session_id);
        
        Ok(())
    }
    
    /// 调整终端大小
    pub async fn resize_pty(
        &self,
        session_id: &SessionId,
        rows: u16,
        cols: u16,
    ) -> Result<(), PtyError> {
        let sessions = self.sessions.lock().await;
        let session = sessions.get(session_id)
            .ok_or(PtyError::SessionNotFound)?;
        
        self.set_terminal_size(&session.pty, rows, cols)?;
        
        Ok(())
    }
}
```

### 19. 快照和检查点 ⭐⭐⭐

支持沙箱状态的保存和恢复。

#### Rust 实现

```rust
use criu::{CriuClient, CriuOptions};

pub struct SnapshotManager {
    // 快照存储后端
    storage: Arc<dyn SnapshotStorage>,
    // CRIU 客户端
    criu_client: CriuClient,
    // 压缩配置
    compression: CompressionConfig,
    // 增量快照支持
    incremental: bool,
}

#[derive(Debug, Clone)]
pub struct Snapshot {
    pub id: SnapshotId,
    pub sandbox_id: SandboxId,
    pub created_at: DateTime<Utc>,
    pub size_bytes: u64,
    pub metadata: SnapshotMetadata,
    pub parent_id: Option<SnapshotId>,
}

#[derive(Debug, Clone)]
pub struct SnapshotMetadata {
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub sandbox_state: SandboxState,
    pub memory_pages: u64,
    pub file_descriptors: Vec<FileDescriptor>,
}

#[async_trait]
pub trait SnapshotStorage: Send + Sync {
    async fn save(&self, snapshot: &Snapshot, data: SnapshotData) -> Result<(), StorageError>;
    async fn load(&self, id: &SnapshotId) -> Result<(Snapshot, SnapshotData), StorageError>;
    async fn delete(&self, id: &SnapshotId) -> Result<(), StorageError>;
    async fn list(&self, filter: Option<SnapshotFilter>) -> Result<Vec<Snapshot>, StorageError>;
}

impl SnapshotManager {
    /// 创建沙箱快照
    pub async fn create_snapshot(
        &self,
        sandbox: &Sandbox,
        options: SnapshotOptions,
    ) -> Result<Snapshot, SnapshotError> {
        // 准备快照目录
        let snapshot_dir = tempdir()?;
        let snapshot_path = snapshot_dir.path();
        
        // 暂停沙箱
        sandbox.pause().await?;
        
        // 使用 CRIU 创建检查点
        let criu_opts = CriuOptions {
            images_dir: snapshot_path.to_path_buf(),
            leave_running: options.leave_running,
            shell_job: true,
            tcp_established: true,
            ext_unix_sk: true,
            file_locks: true,
            track_mem: self.incremental,
            parent_img: options.parent_id.map(|id| id.to_string()),
        };
        
        self.criu_client.dump(sandbox.pid(), criu_opts).await?;
        
        // 捕获文件系统状态
        let fs_snapshot = self.capture_filesystem(sandbox).await?;
        
        // 收集元数据
        let metadata = self.collect_metadata(sandbox, snapshot_path).await?;
        
        // 创建快照数据
        let snapshot_data = SnapshotData {
            memory_image: self.read_memory_image(snapshot_path).await?,
            filesystem: fs_snapshot,
            metadata: metadata.clone(),
        };
        
        // 压缩数据
        let compressed_data = self.compress_snapshot_data(snapshot_data).await?;
        
        // 创建快照记录
        let snapshot = Snapshot {
            id: SnapshotId::new(),
            sandbox_id: sandbox.id().clone(),
            created_at: Utc::now(),
            size_bytes: compressed_data.len() as u64,
            metadata,
            parent_id: options.parent_id,
        };
        
        // 保存到存储
        self.storage.save(&snapshot, compressed_data).await?;
        
        // 恢复沙箱运行
        if !options.leave_running {
            sandbox.resume().await?;
        }
        
        Ok(snapshot)
    }
    
    /// 从快照恢复沙箱
    pub async fn restore_snapshot(
        &self,
        snapshot_id: &SnapshotId,
        options: RestoreOptions,
    ) -> Result<Sandbox, SnapshotError> {
        // 加载快照
        let (snapshot, data) = self.storage.load(snapshot_id).await?;
        
        // 解压数据
        let snapshot_data = self.decompress_snapshot_data(data).await?;
        
        // 准备恢复目录
        let restore_dir = tempdir()?;
        let restore_path = restore_dir.path();
        
        // 写入内存镜像
        self.write_memory_image(restore_path, &snapshot_data.memory_image).await?;
        
        // 恢复文件系统
        let sandbox_root = self.restore_filesystem(&snapshot_data.filesystem).await?;
        
        // 使用 CRIU 恢复
        let criu_opts = CriuOptions {
            images_dir: restore_path.to_path_buf(),
            shell_job: true,
            tcp_established: true,
            ext_unix_sk: true,
            file_locks: true,
            restore_detached: true,
            new_namespace: options.new_namespace,
        };
        
        let pid = self.criu_client.restore(criu_opts).await?;
        
        // 创建新的沙箱实例
        let sandbox = Sandbox::from_restored(
            options.sandbox_id.unwrap_or_else(SandboxId::new),
            pid,
            sandbox_root,
            snapshot.metadata.sandbox_state,
        )?;
        
        Ok(sandbox)
    }
}
```

### 20. 分布式文件系统 ⭐⭐⭐

支持跨节点的文件共享和同步。

#### Rust 实现

```rust
use raft::{Config as RaftConfig, Raft, Storage};

pub struct DistributedFS {
    // 节点 ID
    node_id: NodeId,
    // 分片管理
    shard_manager: Arc<ShardManager>,
    // 复制策略
    replication: Arc<ReplicationStrategy>,
    // 一致性协议
    raft: Arc<Mutex<Raft<FileSystemStateMachine>>>,
    // 元数据存储
    metadata_store: Arc<MetadataStore>,
    // 对象存储
    object_store: Arc<dyn ObjectStore>,
}

#[derive(Debug, Clone)]
pub struct FileMetadata {
    pub path: PathBuf,
    pub size: u64,
    pub chunks: Vec<ChunkInfo>,
    pub permissions: Permissions,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub replication_factor: u8,
}

#[derive(Debug, Clone)]
pub struct ChunkInfo {
    pub id: ChunkId,
    pub offset: u64,
    pub size: u32,
    pub checksum: [u8; 32],
    pub replicas: Vec<NodeId>,
}

impl DistributedFS {
    /// 写入文件
    pub async fn write_file(
        &self,
        path: &Path,
        data: impl AsyncRead,
        options: WriteOptions,
    ) -> Result<FileMetadata, DFSError> {
        // 分块
        let chunks = self.split_into_chunks(data, options.chunk_size).await?;
        
        // 为每个块选择存储节点
        let chunk_placement = self.shard_manager
            .place_chunks(&chunks, options.replication_factor)
            .await?;
        
        // 并行写入块
        let write_futures = chunks.iter().zip(chunk_placement.iter())
            .map(|(chunk, nodes)| {
                self.write_chunk(chunk, nodes)
            });
        
        let chunk_infos = futures::future::try_join_all(write_futures).await?;
        
        // 创建文件元数据
        let metadata = FileMetadata {
            path: path.to_path_buf(),
            size: chunks.iter().map(|c| c.len() as u64).sum(),
            chunks: chunk_infos,
            permissions: options.permissions,
            created_at: Utc::now(),
            modified_at: Utc::now(),
            replication_factor: options.replication_factor,
        };
        
        // 通过 Raft 提交元数据
        self.commit_metadata(&metadata).await?;
        
        Ok(metadata)
    }
    
    /// 读取文件
    pub async fn read_file(
        &self,
        path: &Path,
    ) -> Result<impl AsyncRead, DFSError> {
        // 获取文件元数据
        let metadata = self.metadata_store.get(path).await?
            .ok_or_else(|| DFSError::FileNotFound)?;
        
        // 创建块读取流
        let chunk_streams = metadata.chunks.iter()
            .map(|chunk| self.read_chunk(chunk));
        
        // 合并块流
        Ok(ChunkStream::new(chunk_streams))
    }
    
    /// 处理节点故障
    pub async fn handle_node_failure(&self, failed_node: &NodeId) -> Result<(), DFSError> {
        // 找到受影响的块
        let affected_chunks = self.metadata_store
            .find_chunks_on_node(failed_node)
            .await?;
        
        // 重新复制块
        for chunk_id in affected_chunks {
            self.replicate_chunk(&chunk_id).await?;
        }
        
        Ok(())
    }
    
    /// 块复制
    async fn replicate_chunk(&self, chunk_id: &ChunkId) -> Result<(), DFSError> {
        let chunk_info = self.metadata_store.get_chunk(chunk_id).await?;
        
        // 找到健康的副本
        let healthy_replicas = self.find_healthy_replicas(&chunk_info.replicas).await?;
        
        if healthy_replicas.is_empty() {
            return Err(DFSError::DataLoss);
        }
        
        // 从健康副本读取数据
        let chunk_data = self.read_chunk_from_node(
            chunk_id,
            &healthy_replicas[0],
        ).await?;
        
        // 选择新节点
        let new_nodes = self.shard_manager
            .select_nodes_for_replication(1, &chunk_info.replicas)
            .await?;
        
        // 写入新副本
        self.write_chunk_to_nodes(&chunk_data, &new_nodes).await?;
        
        Ok(())
    }
}
```

### 21. 多租户支持 ⭐⭐⭐

企业级多租户隔离和管理。

#### Rust 实现

```rust
pub struct TenantManager {
    // 租户注册表
    tenants: Arc<Mutex<HashMap<TenantId, Tenant>>>,
    // 租户隔离
    isolation: Arc<TenantIsolation>,
    // 配额管理
    quota_manager: Arc<QuotaManager>,
    // 计费系统
    billing: Arc<BillingSystem>,
    // 审计日志
    audit_logger: Arc<AuditLogger>,
}

#[derive(Debug, Clone)]
pub struct Tenant {
    pub id: TenantId,
    pub name: String,
    pub status: TenantStatus,
    pub config: TenantConfig,
    pub quota: TenantQuota,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct TenantQuota {
    pub max_sandboxes: usize,
    pub max_concurrent_sandboxes: usize,
    pub max_cpu_cores: f32,
    pub max_memory_gb: u32,
    pub max_storage_gb: u32,
    pub network_bandwidth_mbps: u32,
    pub max_templates: usize,
}

#[derive(Debug, Clone)]
pub struct TenantIsolation {
    // 网络隔离策略
    pub network_policy: NetworkIsolationPolicy,
    // 存储隔离
    pub storage_isolation: StorageIsolationLevel,
    // 计算资源隔离
    pub compute_isolation: ComputeIsolationLevel,
}

impl TenantManager {
    /// 创建新租户
    pub async fn create_tenant(
        &self,
        request: CreateTenantRequest,
    ) -> Result<Tenant, TenantError> {
        // 验证请求
        self.validate_tenant_request(&request)?;
        
        // 生成租户 ID
        let tenant_id = TenantId::new();
        
        // 创建租户
        let tenant = Tenant {
            id: tenant_id.clone(),
            name: request.name,
            status: TenantStatus::Active,
            config: request.config,
            quota: request.quota,
            created_at: Utc::now(),
        };
        
        // 设置资源隔离
        self.isolation.setup_tenant_isolation(&tenant).await?;
        
        // 初始化配额
        self.quota_manager.initialize_tenant_quota(&tenant).await?;
        
        // 创建计费账户
        self.billing.create_account(&tenant).await?;
        
        // 记录审计日志
        self.audit_logger.log(AuditEvent {
            timestamp: Utc::now(),
            tenant_id: Some(tenant_id.clone()),
            action: AuditAction::TenantCreated,
            actor: request.created_by,
            details: json!({ "tenant_name": tenant.name }),
        }).await?;
        
        // 保存租户
        self.tenants.lock().await.insert(tenant_id, tenant.clone());
        
        Ok(tenant)
    }
    
    /// 检查租户配额
    pub async fn check_quota(
        &self,
        tenant_id: &TenantId,
        resource: &ResourceRequest,
    ) -> Result<(), QuotaError> {
        let usage = self.quota_manager.get_usage(tenant_id).await?;
        let quota = self.get_tenant_quota(tenant_id).await?;
        
        // 检查各项资源
        if usage.sandbox_count + 1 > quota.max_sandboxes {
            return Err(QuotaError::SandboxLimitExceeded);
        }
        
        if usage.cpu_cores + resource.cpu_cores > quota.max_cpu_cores {
            return Err(QuotaError::CpuLimitExceeded);
        }
        
        if usage.memory_gb + resource.memory_gb > quota.max_memory_gb {
            return Err(QuotaError::MemoryLimitExceeded);
        }
        
        Ok(())
    }
    
    /// 租户资源使用报告
    pub async fn generate_usage_report(
        &self,
        tenant_id: &TenantId,
        period: DateRange,
    ) -> Result<UsageReport, TenantError> {
        let usage_data = self.billing
            .get_usage_data(tenant_id, period)
            .await?;
        
        let report = UsageReport {
            tenant_id: tenant_id.clone(),
            period,
            total_sandbox_hours: usage_data.sandbox_hours,
            average_cpu_usage: usage_data.avg_cpu,
            peak_memory_gb: usage_data.peak_memory,
            total_storage_gb_hours: usage_data.storage_hours,
            network_transfer_gb: usage_data.network_transfer,
            estimated_cost: self.billing.calculate_cost(&usage_data).await?,
        };
        
        Ok(report)
    }
}
```

### 22. 审计和合规 ⭐⭐⭐

完整的审计日志和合规性支持。

#### Rust 实现

```rust
use ring::digest::{digest, SHA256};

pub struct AuditLogger {
    // 审计事件存储
    event_store: Arc<dyn AuditEventStore>,
    // 合规策略
    compliance_policies: Arc<Mutex<Vec<CompliancePolicy>>>,
    // 事件签名
    signer: Arc<EventSigner>,
    // 事件流
    event_stream: broadcast::Sender<AuditEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: EventId,
    pub timestamp: DateTime<Utc>,
    pub tenant_id: Option<TenantId>,
    pub user_id: Option<UserId>,
    pub action: AuditAction,
    pub resource: AuditResource,
    pub result: AuditResult,
    pub ip_address: Option<IpAddr>,
    pub user_agent: Option<String>,
    pub details: serde_json::Value,
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditAction {
    // 沙箱操作
    SandboxCreated,
    SandboxDestroyed,
    SandboxPaused,
    SandboxResumed,
    
    // 文件操作
    FileUploaded,
    FileDownloaded,
    FileDeleted,
    
    // 认证事件
    LoginSuccess,
    LoginFailed,
    TokenCreated,
    TokenRevoked,
    
    // 管理操作
    UserCreated,
    UserDeleted,
    PermissionGranted,
    PermissionRevoked,
    
    // 合规事件
    PolicyViolation,
    DataExport,
    ConfigChange,
}

#[derive(Debug, Clone)]
pub struct CompliancePolicy {
    pub id: PolicyId,
    pub name: String,
    pub rules: Vec<ComplianceRule>,
    pub actions: Vec<ComplianceAction>,
}

impl AuditLogger {
    /// 记录审计事件
    pub async fn log(&self, mut event: AuditEvent) -> Result<(), AuditError> {
        // 设置事件 ID 和时间戳
        event.id = EventId::new();
        if event.timestamp == DateTime::default() {
            event.timestamp = Utc::now();
        }
        
        // 签名事件
        event.signature = Some(self.signer.sign_event(&event).await?);
        
        // 检查合规性
        self.check_compliance(&event).await?;
        
        // 存储事件
        self.event_store.store(&event).await?;
        
        // 广播事件
        let _ = self.event_stream.send(event.clone());
        
        Ok(())
    }
    
    /// 查询审计日志
    pub async fn query(
        &self,
        filter: AuditFilter,
    ) -> Result<AuditQueryResult, AuditError> {
        let events = self.event_store.query(&filter).await?;
        
        // 验证签名
        let mut verified_events = Vec::new();
        for event in events {
            if self.signer.verify_event(&event).await? {
                verified_events.push(event);
            } else {
                warn!("Audit event {} has invalid signature", event.id);
            }
        }
        
        Ok(AuditQueryResult {
            events: verified_events,
            total_count: self.event_store.count(&filter).await?,
        })
    }
    
    /// 生成合规报告
    pub async fn generate_compliance_report(
        &self,
        policy_id: &PolicyId,
        period: DateRange,
    ) -> Result<ComplianceReport, AuditError> {
        let policy = self.get_policy(policy_id).await?;
        let events = self.query(AuditFilter {
            time_range: Some(period),
            ..Default::default()
        }).await?;
        
        let mut violations = Vec::new();
        let mut compliance_score = 100.0;
        
        for rule in &policy.rules {
            let rule_violations = self.check_rule_violations(&rule, &events.events)?;
            if !rule_violations.is_empty() {
                compliance_score -= rule.penalty_weight;
                violations.extend(rule_violations);
            }
        }
        
        Ok(ComplianceReport {
            policy_id: policy_id.clone(),
            period,
            compliance_score: compliance_score.max(0.0),
            violations,
            recommendations: self.generate_recommendations(&violations),
            generated_at: Utc::now(),
        })
    }
    
    /// 导出审计日志（用于外部审计）
    pub async fn export_logs(
        &self,
        filter: AuditFilter,
        format: ExportFormat,
    ) -> Result<Vec<u8>, AuditError> {
        let events = self.query(filter).await?;
        
        match format {
            ExportFormat::Json => {
                Ok(serde_json::to_vec_pretty(&events)?)
            }
            ExportFormat::Csv => {
                let mut wtr = csv::Writer::new(Vec::new());
                for event in events.events {
                    wtr.serialize(&event)?;
                }
                Ok(wtr.into_inner()?)
            }
            ExportFormat::Syslog => {
                let mut output = Vec::new();
                for event in events.events {
                    writeln!(output, "{}", self.format_syslog(&event)?)?;
                }
                Ok(output)
            }
        }
    }
}

/// 事件签名器
pub struct EventSigner {
    signing_key: Arc<SigningKey>,
}

impl EventSigner {
    /// 签名事件
    async fn sign_event(&self, event: &AuditEvent) -> Result<String, SignError> {
        let event_bytes = serde_json::to_vec(event)?;
        let signature = self.signing_key.sign(&event_bytes);
        Ok(base64::encode(signature))
    }
    
    /// 验证签名
    async fn verify_event(&self, event: &AuditEvent) -> Result<bool, SignError> {
        if let Some(signature) = &event.signature {
            let mut event_copy = event.clone();
            event_copy.signature = None;
            
            let event_bytes = serde_json::to_vec(&event_copy)?;
            let signature_bytes = base64::decode(signature)?;
            
            Ok(self.signing_key.verify(&event_bytes, &signature_bytes).is_ok())
        } else {
            Ok(false)
        }
    }
}
```

---

## 实施优先级和时间表

### 优先级分组

#### P0 - 必须立即实施（1-4 周）
1. ✅ 健康检查端点
2. ✅ 文件签名和安全 URL
3. ✅ 版本兼容性检查
4. ⭐ 多层认证机制
5. ⭐ 细粒度权限控制 (RBAC)

#### P1 - 核心功能增强（5-12 周）
6. ✅ 自动暂停功能
7. ✅ 命令部分输出获取
8. ✅ 连接重定向支持
9. ✅ 沙箱刷新机制
10. ✅ 沙箱指标详细信息
11. ⭐ 智能沙箱池管理
12. ⭐ 动态资源调度器
13. ⭐ CLI 工具套件
14. ⭐ 实时日志流和调试

#### P2 - 高级功能（13-20 周）
15. ✅ 模板构建日志流
16. ✅ 节点健康状态
17. ⭐ 高级网络管理
18. ⭐ WebSocket 和 PTY 支持
19. ⭐ 快照和检查点
20. ⭐ 分布式文件系统

#### P3 - 企业功能（21-24 周）
21. ⭐ 多租户支持
22. ⭐ 审计和合规

---

## 总结

本文档整合了 SoulBox 项目的所有 22 个缺失功能，包括：
- 原有的 10 个基础功能补充
- 新发现的 12 个高级功能

每个功能都提供了：
- 详细的设计说明
- 完整的 Rust 实现代码
- 实施优先级建议

这份文档将作为 SoulBox 项目的核心开发指南，指导后续的功能实现工作。

---

*文档版本: 1.0*  
*最后更新: 2024-08*  
*状态: 开发参考文档*