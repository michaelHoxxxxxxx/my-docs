# SoulBox SurrealDB 集成指南

> SoulBox AI 代码执行沙箱 SurrealDB 主数据库解决方案全面集成指南

## 🎯 为什么选择 SurrealDB 作为 SoulBox 数据库

SurrealDB 已被选为 SoulBox 的主要数据库解决方案，取代了之前计划的 PostgreSQL 实现。这个决定是基于几个与 AI 代码执行沙箱平台要求完美契合的关键优势。

### 核心优势

#### 1. **多模型数据库能力**
- **文档存储**：以灵活的 JSON 文档形式存储复杂的执行元数据、用户会话和配置数据
- **图关系**：建模用户、沙箱、执行和计费数据之间的复杂关系
- **时间序列**：原生支持执行日志、指标和计费事件的时间查询
- **键值**：会话管理和缓存的快速访问模式

#### 2. **实时功能**
- **实时查询**：实时监控沙箱状态、资源使用和执行进度
- **WebSocket 集成**：原生支持仪表板和监控界面的实时更新
- **事件流**：内置发布/订阅用于服务间通信和通知

#### 3. **Rust 原生集成**
- **零拷贝序列化**：使用原生 Rust 类型的高效数据处理
- **Async/Await 支持**：与基于 tokio 的 SoulBox 架构无缝集成
- **类型安全**：自定义结构体和枚举的强类型
- **性能**：直接 Rust SDK 的最小开销

#### 4. **简化运维**
- **单一数据库**：消除对多种数据库技术的需求（PostgreSQL + Redis + TimescaleDB）
- **嵌入式模式**：简化开发和测试环境
- **分布式模式**：生产工作负载的水平扩展
- **架构演进**：无需迁移的灵活架构变更

## 🏗️ SoulBox 数据库架构设计

### 核心表和结构

#### 1. 用户管理

```sql
-- 用户表，用于认证和配置文件数据
DEFINE TABLE users SCHEMAFULL;
DEFINE FIELD id ON users TYPE record<users>;
DEFINE FIELD email ON users TYPE string ASSERT string::is::email($value);
DEFINE FIELD username ON users TYPE string;
DEFINE FIELD password_hash ON users TYPE string;
DEFINE FIELD created_at ON users TYPE datetime DEFAULT time::now();
DEFINE FIELD last_login ON users TYPE datetime;
DEFINE FIELD subscription_tier ON users TYPE string DEFAULT "free";
DEFINE FIELD is_active ON users TYPE bool DEFAULT true;
DEFINE FIELD metadata ON users TYPE object;

-- 用于快速用户查找的索引
DEFINE INDEX idx_users_email ON users COLUMNS email UNIQUE;
DEFINE INDEX idx_users_username ON users COLUMNS username UNIQUE;
```

#### 2. 沙箱管理

```sql
-- 沙箱表，用于管理执行环境
DEFINE TABLE sandboxes SCHEMAFULL;
DEFINE FIELD id ON sandboxes TYPE record<sandboxes>;
DEFINE FIELD user_id ON sandboxes TYPE record<users>;
DEFINE FIELD name ON sandboxes TYPE string;
DEFINE FIELD language ON sandboxes TYPE string;
DEFINE FIELD status ON sandboxes TYPE string DEFAULT "created";
DEFINE FIELD container_id ON sandboxes TYPE string;
DEFINE FIELD created_at ON sandboxes TYPE datetime DEFAULT time::now();
DEFINE FIELD started_at ON sandboxes TYPE datetime;
DEFINE FIELD terminated_at ON sandboxes TYPE datetime;
DEFINE FIELD resource_limits ON sandboxes TYPE object;
DEFINE FIELD metadata ON sandboxes TYPE object;

-- 用于高效查询的索引
DEFINE INDEX idx_sandboxes_user ON sandboxes COLUMNS user_id;
DEFINE INDEX idx_sandboxes_status ON sandboxes COLUMNS status;
DEFINE INDEX idx_sandboxes_container ON sandboxes COLUMNS container_id;
```

#### 3. 代码执行会话

```sql
-- 执行会话，用于跟踪代码运行
DEFINE TABLE executions SCHEMAFULL;
DEFINE FIELD id ON executions TYPE record<executions>;
DEFINE FIELD sandbox_id ON executions TYPE record<sandboxes>;
DEFINE FIELD user_id ON executions TYPE record<users>;
DEFINE FIELD code ON executions TYPE string;
DEFINE FIELD language ON executions TYPE string;
DEFINE FIELD status ON executions TYPE string DEFAULT "queued";
DEFINE FIELD started_at ON executions TYPE datetime;
DEFINE FIELD completed_at ON executions TYPE datetime;
DEFINE FIELD duration_ms ON executions TYPE number;
DEFINE FIELD output ON executions TYPE object;
DEFINE FIELD error ON executions TYPE object;
DEFINE FIELD resource_usage ON executions TYPE object;
DEFINE FIELD billing_info ON executions TYPE object;

-- 用于分析和计费的索引
DEFINE INDEX idx_executions_user ON executions COLUMNS user_id;
DEFINE INDEX idx_executions_sandbox ON executions COLUMNS sandbox_id;
DEFINE INDEX idx_executions_status ON executions COLUMNS status;
DEFINE INDEX idx_executions_time ON executions COLUMNS started_at;
```

#### 4. 资源监控

```sql
-- 用于监控和计费的资源使用指标
DEFINE TABLE resource_metrics SCHEMAFULL;
DEFINE FIELD id ON resource_metrics TYPE record<resource_metrics>;
DEFINE FIELD sandbox_id ON resource_metrics TYPE record<sandboxes>;
DEFINE FIELD timestamp ON resource_metrics TYPE datetime DEFAULT time::now();
DEFINE FIELD cpu_usage ON resource_metrics TYPE number;
DEFINE FIELD memory_usage ON resource_metrics TYPE number;
DEFINE FIELD disk_usage ON resource_metrics TYPE number;
DEFINE FIELD network_usage ON resource_metrics TYPE object;
DEFINE FIELD custom_metrics ON resource_metrics TYPE object;

-- 用于高效范围查询的时间序列索引
DEFINE INDEX idx_metrics_time ON resource_metrics COLUMNS timestamp;
DEFINE INDEX idx_metrics_sandbox_time ON resource_metrics COLUMNS sandbox_id, timestamp;
```

#### 5. 计费和使用情况

```sql
-- 用于使用情况跟踪的计费事件
DEFINE TABLE billing_events SCHEMAFULL;
DEFINE FIELD id ON billing_events TYPE record<billing_events>;
DEFINE FIELD user_id ON billing_events TYPE record<users>;
DEFINE FIELD execution_id ON billing_events TYPE record<executions>;
DEFINE FIELD event_type ON billing_events TYPE string;
DEFINE FIELD timestamp ON billing_events TYPE datetime DEFAULT time::now();
DEFINE FIELD amount ON billing_events TYPE number;
DEFINE FIELD currency ON billing_events TYPE string DEFAULT "USD";
DEFINE FIELD metadata ON billing_events TYPE object;

-- 月度使用情况汇总
DEFINE TABLE usage_aggregates SCHEMAFULL;
DEFINE FIELD id ON usage_aggregates TYPE record<usage_aggregates>;
DEFINE FIELD user_id ON usage_aggregates TYPE record<users>;
DEFINE FIELD period ON usage_aggregates TYPE string; -- "2024-01"
DEFINE FIELD total_executions ON usage_aggregates TYPE number DEFAULT 0;
DEFINE FIELD total_duration_ms ON usage_aggregates TYPE number DEFAULT 0;
DEFINE FIELD total_cost ON usage_aggregates TYPE number DEFAULT 0;
DEFINE FIELD breakdown ON usage_aggregates TYPE object;

-- 计费索引
DEFINE INDEX idx_billing_user_time ON billing_events COLUMNS user_id, timestamp;
DEFINE INDEX idx_usage_user_period ON usage_aggregates COLUMNS user_id, period UNIQUE;
```

### 图关系

```sql
-- 定义实体之间的关系
DEFINE TABLE user_sandbox SCHEMAFULL AS SELECT * FROM user->owns->sandbox;
DEFINE TABLE sandbox_execution SCHEMAFULL AS SELECT * FROM sandbox->runs->execution;
DEFINE TABLE execution_metrics SCHEMAFULL AS SELECT * FROM execution->generates->resource_metrics;

-- 关系表
DEFINE TABLE owns SCHEMAFULL;
DEFINE TABLE runs SCHEMAFULL;
DEFINE TABLE generates SCHEMAFULL;
```

## 🔧 Rust 集成实现

### 1. Cargo 依赖

```toml
[dependencies]
# SurrealDB 客户端
surrealdb = { version = "1.5", features = ["protocol-ws", "protocol-http", "kv-rocksdb"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1.0"
thiserror = "1.0"
```

### 2. 数据库连接和配置

```rust
use surrealdb::engine::remote::ws::{Client, Ws};
use surrealdb::opt::auth::Root;
use surrealdb::{Result, Surreal};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct DatabaseManager {
    db: Arc<Surreal<Client>>,
    config: DatabaseConfig,
}

#[derive(Clone, Debug)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub namespace: String,
    pub database: String,
    pub username: String,
    pub password: String,
}

impl DatabaseManager {
    pub async fn new(config: DatabaseConfig) -> Result<Self> {
        // 连接到 SurrealDB
        let db = Surreal::new::<Ws>(format!("{}:{}", config.host, config.port)).await?;

        // 认证
        db.signin(Root {
            username: &config.username,
            password: &config.password,
        }).await?;

        // 选择命名空间和数据库
        db.use_ns(&config.namespace).use_db(&config.database).await?;

        Ok(Self {
            db: Arc::new(db),
            config,
        })
    }

    pub fn get_connection(&self) -> Arc<Surreal<Client>> {
        Arc::clone(&self.db)
    }
}
```

### 3. 数据模型和结构体

```rust
use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// 用户模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Option<Thing>,
    pub email: String,
    pub username: String,
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub subscription_tier: String,
    pub is_active: bool,
    pub metadata: serde_json::Value,
}

// 沙箱模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sandbox {
    pub id: Option<Thing>,
    pub user_id: Thing,
    pub name: String,
    pub language: String,
    pub status: SandboxStatus,
    pub container_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub terminated_at: Option<DateTime<Utc>>,
    pub resource_limits: ResourceLimits,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SandboxStatus {
    Created,
    Starting,
    Running,
    Stopped,
    Error,
    Terminated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_memory_mb: u64,
    pub max_cpu_cores: f64,
    pub max_disk_mb: u64,
    pub max_execution_time_sec: u64,
}

// 执行模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Execution {
    pub id: Option<Thing>,
    pub sandbox_id: Thing,
    pub user_id: Thing,
    pub code: String,
    pub language: String,
    pub status: ExecutionStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<u64>,
    pub output: Option<ExecutionOutput>,
    pub error: Option<ExecutionError>,
    pub resource_usage: Option<ResourceUsage>,
    pub billing_info: Option<BillingInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExecutionStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Timeout,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionOutput {
    pub stdout: String,
    pub stderr: String,
    pub return_code: i32,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionError {
    pub error_type: String,
    pub message: String,
    pub stack_trace: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub peak_memory_mb: u64,
    pub cpu_time_ms: u64,
    pub disk_io_mb: u64,
    pub network_io_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingInfo {
    pub compute_units: f64,
    pub cost_usd: f64,
    pub billing_tier: String,
}
```

### 4. 仓库模式实现

```rust
use anyhow::Result;
use surrealdb::sql::Thing;

#[async_trait::async_trait]
pub trait UserRepository {
    async fn create_user(&self, user: &User) -> Result<User>;
    async fn get_user_by_id(&self, id: &Thing) -> Result<Option<User>>;
    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>>;
    async fn update_user(&self, user: &User) -> Result<User>;
    async fn delete_user(&self, id: &Thing) -> Result<()>;
}

pub struct SurrealUserRepository {
    db: Arc<Surreal<Client>>,
}

impl SurrealUserRepository {
    pub fn new(db_manager: &DatabaseManager) -> Self {
        Self {
            db: db_manager.get_connection(),
        }
    }
}

#[async_trait::async_trait]
impl UserRepository for SurrealUserRepository {
    async fn create_user(&self, user: &User) -> Result<User> {
        let created: Option<User> = self.db
            .create("users")
            .content(user)
            .await?;
        
        created.ok_or_else(|| anyhow::anyhow!("Failed to create user"))
    }

    async fn get_user_by_id(&self, id: &Thing) -> Result<Option<User>> {
        let user: Option<User> = self.db.select(id).await?;
        Ok(user)
    }

    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>> {
        let mut result = self.db
            .query("SELECT * FROM users WHERE email = $email LIMIT 1")
            .bind(("email", email))
            .await?;
        
        let users: Vec<User> = result.take(0)?;
        Ok(users.into_iter().next())
    }

    async fn update_user(&self, user: &User) -> Result<User> {
        let updated: Option<User> = self.db
            .update(user.id.as_ref().unwrap())
            .content(user)
            .await?;
        
        updated.ok_or_else(|| anyhow::anyhow!("Failed to update user"))
    }

    async fn delete_user(&self, id: &Thing) -> Result<()> {
        let _: Option<User> = self.db.delete(id).await?;
        Ok(())
    }
}
```

### 5. 使用实时查询的实时监控

```rust
use futures_util::StreamExt;
use surrealdb::opt::QueryResult;

pub struct RealtimeMonitor {
    db: Arc<Surreal<Client>>,
}

impl RealtimeMonitor {
    pub fn new(db_manager: &DatabaseManager) -> Self {
        Self {
            db: db_manager.get_connection(),
        }
    }

    // 监控沙箱状态变化
    pub async fn monitor_sandbox_status(&self, sandbox_id: &Thing) -> Result<()> {
        let mut stream = self.db
            .query("LIVE SELECT * FROM sandboxes WHERE id = $sandbox_id")
            .bind(("sandbox_id", sandbox_id))
            .await?
            .stream::<Sandbox>(0)?;

        while let Some(result) = stream.next().await {
            match result {
                Ok(notification) => {
                    println!("Sandbox status changed: {:?}", notification);
                    // 处理状态变化（更新 UI、发送通知等）
                }
                Err(e) => {
                    eprintln!("Error in live query: {}", e);
                }
            }
        }

        Ok(())
    }

    // 实时监控资源使用情况
    pub async fn monitor_resource_usage(&self, user_id: &Thing) -> Result<()> {
        let mut stream = self.db
            .query("LIVE SELECT * FROM resource_metrics WHERE sandbox_id IN (SELECT id FROM sandboxes WHERE user_id = $user_id)")
            .bind(("user_id", user_id))
            .await?
            .stream::<ResourceMetrics>(0)?;

        while let Some(result) = stream.next().await {
            match result {
                Ok(metrics) => {
                    // 处理实时指标
                    self.process_resource_metrics(metrics).await?;
                }
                Err(e) => {
                    eprintln!("Error monitoring resource usage: {}", e);
                }
            }
        }

        Ok(())
    }

    async fn process_resource_metrics(&self, metrics: ResourceMetrics) -> Result<()> {
        // 检查资源限制
        if metrics.memory_usage > 90.0 {
            // 发送警报
            println!("High memory usage detected: {}%", metrics.memory_usage);
        }

        // 更新聚合指标
        // 触发扩展决策
        // 更新计费计算

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceMetrics {
    pub id: Option<Thing>,
    pub sandbox_id: Thing,
    pub timestamp: DateTime<Utc>,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub network_usage: NetworkUsage,
    pub custom_metrics: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkUsage {
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub packets_in: u64,
    pub packets_out: u64,
}
```

## 📊 性能优化策略

### 1. 索引策略

```sql
-- 性能关键索引
DEFINE INDEX idx_executions_user_time ON executions COLUMNS user_id, started_at;
DEFINE INDEX idx_metrics_sandbox_recent ON resource_metrics COLUMNS sandbox_id, timestamp WHERE timestamp > time::now() - 1h;
DEFINE INDEX idx_billing_monthly ON billing_events COLUMNS user_id, timestamp WHERE timestamp > time::now() - 30d;

-- 代码和日志的全文搜索
DEFINE ANALYZER code_analyzer TOKENIZERS class FILTERS lowercase, snowball(english);
DEFINE INDEX idx_executions_code_search ON executions COLUMNS code SEARCH ANALYZER code_analyzer BM25;
```

### 2. 查询优化

```rust
impl SandboxRepository {
    // 仪表板数据的优化查询
    pub async fn get_user_dashboard_data(&self, user_id: &Thing) -> Result<DashboardData> {
        let query = "
            LET $user_sandboxes = (SELECT * FROM sandboxes WHERE user_id = $user_id AND status IN ['running', 'created']);
            LET $recent_executions = (SELECT * FROM executions WHERE user_id = $user_id AND started_at > time::now() - 24h ORDER BY started_at DESC LIMIT 10);
            LET $usage_today = (SELECT count() as total, sum(duration_ms) as total_duration FROM executions WHERE user_id = $user_id AND started_at > time::now() - 24h);
            
            SELECT {
                sandboxes: $user_sandboxes,
                recent_executions: $recent_executions,
                usage_today: $usage_today
            };
        ";

        let mut result = self.db
            .query(query)
            .bind(("user_id", user_id))
            .await?;

        let dashboard_data: DashboardData = result.take(0)?;
        Ok(dashboard_data)
    }

    // 高效的资源使用情况聚合
    pub async fn get_resource_usage_summary(&self, sandbox_id: &Thing, duration: Duration) -> Result<ResourceSummary> {
        let query = "
            SELECT 
                math::mean(cpu_usage) as avg_cpu,
                math::max(cpu_usage) as peak_cpu,
                math::mean(memory_usage) as avg_memory,
                math::max(memory_usage) as peak_memory,
                count() as data_points
            FROM resource_metrics 
            WHERE sandbox_id = $sandbox_id 
            AND timestamp > time::now() - $duration
            GROUP ALL;
        ";

        let mut result = self.db
            .query(query)
            .bind(("sandbox_id", sandbox_id))
            .bind(("duration", duration.as_secs()))
            .await?;

        let summary: ResourceSummary = result.take(0)?;
        Ok(summary)
    }
}
```

### 3. 连接池和缓存

```rust
use std::collections::HashMap;
use tokio::sync::Mutex;

pub struct OptimizedDatabaseManager {
    primary_db: Arc<Surreal<Client>>,
    read_replicas: Vec<Arc<Surreal<Client>>>,
    cache: Arc<Mutex<HashMap<String, (DateTime<Utc>, serde_json::Value)>>>,
    cache_ttl: Duration,
}

impl OptimizedDatabaseManager {
    pub async fn new(config: DatabaseConfig) -> Result<Self> {
        // 创建主连接
        let primary_db = Self::create_connection(&config).await?;

        // 创建只读副本连接
        let mut read_replicas = Vec::new();
        for _ in 0..config.read_replica_count {
            let replica = Self::create_connection(&config).await?;
            read_replicas.push(Arc::new(replica));
        }

        Ok(Self {
            primary_db: Arc::new(primary_db),
            read_replicas,
            cache: Arc::new(Mutex::new(HashMap::new())),
            cache_ttl: Duration::from_secs(300), // 5 minutes
        })
    }

    // 负载均衡的读取操作
    pub fn get_read_connection(&self) -> Arc<Surreal<Client>> {
        if self.read_replicas.is_empty() {
            return Arc::clone(&self.primary_db);
        }

        let index = fastrand::usize(..self.read_replicas.len());
        Arc::clone(&self.read_replicas[index])
    }

    // 写操作始终使用主库
    pub fn get_write_connection(&self) -> Arc<Surreal<Client>> {
        Arc::clone(&self.primary_db)
    }

    // 带 TTL 的缓存读取
    pub async fn cached_query<T>(&self, cache_key: String, query: &str) -> Result<T>
    where
        T: serde::de::DeserializeOwned + serde::Serialize,
    {
        // 首先检查缓存
        {
            let cache = self.cache.lock().await;
            if let Some((timestamp, value)) = cache.get(&cache_key) {
                if Utc::now().signed_duration_since(*timestamp) < chrono::Duration::from_std(self.cache_ttl)? {
                    return Ok(serde_json::from_value(value.clone())?);
                }
            }
        }

        // 执行查询
        let db = self.get_read_connection();
        let mut result = db.query(query).await?;
        let data: T = result.take(0)?;

        // 更新缓存
        {
            let mut cache = self.cache.lock().await;
            cache.insert(cache_key, (Utc::now(), serde_json::to_value(&data)?));
        }

        Ok(data)
    }
}
```

## 🔄 从 PostgreSQL 的迁移策略

### 1. 迁移规划

```rust
use std::collections::HashMap;

pub struct MigrationManager {
    postgres_pool: sqlx::PgPool,
    surrealdb: Arc<Surreal<Client>>,
}

impl MigrationManager {
    pub async fn new(pg_config: PgConfig, surreal_config: DatabaseConfig) -> Result<Self> {
        let postgres_pool = sqlx::PgPool::connect(&pg_config.database_url).await?;
        let surrealdb = DatabaseManager::new(surreal_config).await?.get_connection();

        Ok(Self {
            postgres_pool,
            surrealdb,
        })
    }

    // 步骤1：架构迁移
    pub async fn migrate_schema(&self) -> Result<()> {
        // 创建 SurrealDB 架构
        let schema_queries = vec![
            include_str!("../schemas/users.surql"),
            include_str!("../schemas/sandboxes.surql"),
            include_str!("../schemas/executions.surql"),
            include_str!("../schemas/resource_metrics.surql"),
            include_str!("../schemas/billing_events.surql"),
        ];

        for query in schema_queries {
            self.surrealdb.query(query).await?;
        }

        Ok(())
    }

    // 步骤2：批量数据迁移
    pub async fn migrate_data(&self) -> Result<()> {
        // 迁移用户
        self.migrate_users().await?;
        
        // 迁移沙箱
        self.migrate_sandboxes().await?;
        
        // 迁移执行
        self.migrate_executions().await?;
        
        // 迁移指标（基于时间的过滤）
        self.migrate_recent_metrics().await?;

        Ok(())
    }

    async fn migrate_users(&self) -> Result<()> {
        let batch_size = 1000;
        let mut offset = 0;

        loop {
            let rows = sqlx::query!(
                "SELECT id, email, username, password_hash, created_at, last_login, subscription_tier, is_active, metadata 
                 FROM users ORDER BY id LIMIT $1 OFFSET $2",
                batch_size,
                offset
            )
            .fetch_all(&self.postgres_pool)
            .await?;

            if rows.is_empty() {
                break;
            }

            // 转换并批量插入到 SurrealDB
            let mut users = Vec::new();
            for row in rows {
                let user = User {
                    id: None, // 让 SurrealDB 生成新 ID
                    email: row.email,
                    username: row.username,
                    password_hash: row.password_hash,
                    created_at: row.created_at.and_utc(),
                    last_login: row.last_login.map(|dt| dt.and_utc()),
                    subscription_tier: row.subscription_tier,
                    is_active: row.is_active,
                    metadata: row.metadata.unwrap_or(serde_json::Value::Null),
                };
                users.push(user);
            }

            // 批量插入
            let _: Vec<User> = self.surrealdb
                .create("users")
                .content(&users)
                .await?;

            offset += batch_size;
            println!("Migrated {} users", offset);
        }

        Ok(())
    }

    // 步骤3：验证和校验
    pub async fn validate_migration(&self) -> Result<MigrationReport> {
        let mut report = MigrationReport::default();

        // 统计两个数据库中的记录
        let pg_user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(&self.postgres_pool)
            .await?;

        let surreal_user_count: Option<i64> = self.surrealdb
            .query("SELECT count() FROM users")
            .await?
            .take(0)?;

        report.users_postgres = pg_user_count.0;
        report.users_surrealdb = surreal_user_count.unwrap_or(0);
        report.users_match = report.users_postgres == report.users_surrealdb;

        // 通过抽样验证数据完整性
        report.data_integrity = self.validate_data_samples().await?;

        Ok(report)
    }
}

#[derive(Debug, Default)]
pub struct MigrationReport {
    pub users_postgres: i64,
    pub users_surrealdb: i64,
    pub users_match: bool,
    pub sandboxes_postgres: i64,
    pub sandboxes_surrealdb: i64,
    pub sandboxes_match: bool,
    pub executions_postgres: i64,
    pub executions_surrealdb: i64,
    pub executions_match: bool,
    pub data_integrity: f64, // Percentage of sampled records that match
}
```

### 2. 零停机迁移的双写模式

```rust
pub struct DualWriteManager {
    postgres_repo: Arc<dyn UserRepository>,
    surrealdb_repo: Arc<dyn UserRepository>,
    migration_progress: Arc<Mutex<MigrationProgress>>,
}

impl DualWriteManager {
    pub async fn create_user(&self, user: &User) -> Result<User> {
        // 始终写入主库（迁移期间为 PostgreSQL）
        let pg_user = self.postgres_repo.create_user(user).await?;

        // 如果迁移正在进行，则写入 SurrealDB
        if self.is_migration_active().await {
            if let Err(e) = self.surrealdb_repo.create_user(user).await {
                // 记录错误但不让请求失败
                eprintln!("Failed to write to SurrealDB during migration: {}", e);
            }
        }

        Ok(pg_user)
    }

    pub async fn get_user_by_id(&self, id: &Thing) -> Result<Option<User>> {
        // 根据迁移进度从适当的源读取
        if self.should_read_from_surrealdb(id).await {
            self.surrealdb_repo.get_user_by_id(id).await
        } else {
            self.postgres_repo.get_user_by_id(id).await
        }
    }

    async fn is_migration_active(&self) -> bool {
        let progress = self.migration_progress.lock().await;
        matches!(*progress, MigrationProgress::InProgress { .. })
    }

    async fn should_read_from_surrealdb(&self, id: &Thing) -> bool {
        let progress = self.migration_progress.lock().await;
        match &*progress {
            MigrationProgress::InProgress { migrated_ids } => {
                migrated_ids.contains(&id.to_string())
            }
            MigrationProgress::Completed => true,
            MigrationProgress::NotStarted => false,
        }
    }
}

#[derive(Debug)]
pub enum MigrationProgress {
    NotStarted,
    InProgress { migrated_ids: HashSet<String> },
    Completed,
}
```

## 🔐 多租户和安全配置

### 1. 命名空间和数据库组织

```sql
-- 多租户命名空间的生产配置

-- 每个客户/组织的命名空间
DEFINE NAMESPACE customer_org_123;
USE NS customer_org_123;

-- 不同环境的单独数据库
DEFINE DATABASE production;
DEFINE DATABASE staging;
DEFINE DATABASE development;

-- 使用生产数据库
USE DB production;

-- 定义访问控制
DEFINE ACCESS customer_access ON DATABASE TYPE RECORD
SIGNIN (
    SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password_hash, $password)
)
SIGNUP (
    CREATE user SET email = $email, password_hash = crypto::argon2::generate($password)
);

-- 定义用户范围和权限
DEFINE SCOPE user_scope
SESSION 24h
SIGNUP (
    CREATE user SET 
        email = $email, 
        password_hash = crypto::argon2::generate($password),
        created_at = time::now(),
        subscription_tier = "free"
)
SIGNIN (
    SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(password_hash, $password)
);

-- 行级安全
DEFINE EVENT user_access_control ON TABLE sandboxes WHEN $before = NONE THEN (
    UPDATE sandboxes SET user_id = $auth.id WHERE id = $after.id
);

-- 防止用户访问其他用户的数据
DEFINE FIELD user_id ON TABLE sandboxes PERMISSIONS 
    FOR select WHERE user_id = $auth.id
    FOR create WHERE $value = $auth.id
    FOR update WHERE user_id = $auth.id
    FOR delete WHERE user_id = $auth.id;
```

### 2. 加密和数据保护

```rust
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};

pub struct EncryptedFieldManager {
    cipher: Aes256Gcm,
}

impl EncryptedFieldManager {
    pub fn new(key: &[u8; 32]) -> Self {
        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);
        Self { cipher }
    }

    pub fn encrypt_sensitive_data(&self, data: &str) -> Result<String> {
        let nonce = Nonce::from_slice(b"unique nonce"); // Use proper nonce generation
        let ciphertext = self.cipher.encrypt(nonce, data.as_bytes())?;
        Ok(base64::encode(ciphertext))
    }

    pub fn decrypt_sensitive_data(&self, encrypted_data: &str) -> Result<String> {
        let nonce = Nonce::from_slice(b"unique nonce");
        let ciphertext = base64::decode(encrypted_data)?;
        let plaintext = self.cipher.decrypt(nonce, ciphertext.as_ref())?;
        Ok(String::from_utf8(plaintext)?)
    }
}

// 在用户创建中的使用
impl SecureUserRepository {
    pub async fn create_user_with_encryption(&self, user: &User) -> Result<User> {
        let mut encrypted_user = user.clone();
        
        // 加密敏感字段
        if let Some(pii_data) = user.metadata.get("pii") {
            let encrypted_pii = self.encryption_manager
                .encrypt_sensitive_data(&pii_data.to_string())?;
            encrypted_user.metadata["pii"] = serde_json::Value::String(encrypted_pii);
        }

        self.user_repo.create_user(&encrypted_user).await
    }
}
```

### 3. 审计日志和合规

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Option<Thing>,
    pub user_id: Option<Thing>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub success: bool,
    pub error_message: Option<String>,
    pub metadata: serde_json::Value,
}

pub struct AuditLogger {
    db: Arc<Surreal<Client>>,
}

impl AuditLogger {
    pub async fn log_action(&self, audit_log: AuditLog) -> Result<()> {
        let _: Option<AuditLog> = self.db
            .create("audit_logs")
            .content(&audit_log)
            .await?;
        
        Ok(())
    }

    pub async fn log_user_action(
        &self,
        user_id: &Thing,
        action: &str,
        resource_type: &str,
        ip_address: Option<String>,
    ) -> Result<()> {
        let audit_log = AuditLog {
            id: None,
            user_id: Some(user_id.clone()),
            action: action.to_string(),
            resource_type: resource_type.to_string(),
            resource_id: None,
            timestamp: Utc::now(),
            ip_address,
            user_agent: None,
            success: true,
            error_message: None,
            metadata: serde_json::Value::Null,
        };

        self.log_action(audit_log).await
    }
}

// 自动审计日志的中间件
#[derive(Clone)]
pub struct AuditMiddleware {
    audit_logger: Arc<AuditLogger>,
}

impl AuditMiddleware {
    pub async fn log_request(&self, req: &HttpRequest, user_id: Option<Thing>) -> Result<()> {
        let action = format!("{} {}", req.method(), req.path());
        let ip_address = req.peer_addr().map(|addr| addr.ip().to_string());

        if let Some(user_id) = user_id {
            self.audit_logger.log_user_action(
                &user_id,
                &action,
                "http_request",
                ip_address,
            ).await?;
        }

        Ok(())
    }
}
```

## 📈 配置示例

### 1. 开发配置

```toml
# config/development.toml
[database]
host = "127.0.0.1"
port = 8000
namespace = "soulbox_dev"
database = "main"
username = "root"
password = "root"
connection_timeout = 30
query_timeout = 60

[cache]
enabled = false
ttl_seconds = 300

[security]
encryption_enabled = false
audit_logging = true

[performance]
read_replica_count = 0
connection_pool_size = 10
```

### 2. 生产配置

```toml
# config/production.toml
[database]
host = "surrealdb-cluster.example.com"
port = 8000
namespace = "soulbox_prod"
database = "main"
username = "${DB_USERNAME}"
password = "${DB_PASSWORD}"
connection_timeout = 10
query_timeout = 30

[cluster]
enabled = true
nodes = [
    "node1.surrealdb.example.com:8000",
    "node2.surrealdb.example.com:8000",
    "node3.surrealdb.example.com:8000"
]

[cache]
enabled = true
ttl_seconds = 600
redis_url = "${REDIS_URL}"

[security]
encryption_enabled = true
encryption_key = "${ENCRYPTION_KEY}"
audit_logging = true
jwt_secret = "${JWT_SECRET}"

[performance]
read_replica_count = 3
connection_pool_size = 50
query_timeout_ms = 5000

[monitoring]
metrics_enabled = true
prometheus_endpoint = "/metrics"
health_check_interval = 30
```

### 3. Docker Compose 设置

```yaml
# docker-compose.yml
version: '3.8'

services:
  surrealdb:
    image: surrealdb/surrealdb:latest
    command: start --log trace --user root --pass root memory
    ports:
      - "8000:8000"
    volumes:
      - surrealdb_data:/data
    environment:
      - SURREAL_LOG=trace
      - SURREAL_USER=root
      - SURREAL_PASS=root

  soulbox:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_HOST=surrealdb
      - DATABASE_PORT=8000
      - DATABASE_NS=soulbox_dev
      - DATABASE_DB=main
      - DATABASE_USER=root
      - DATABASE_PASS=root
    depends_on:
      - surrealdb

volumes:
  surrealdb_data:
```

## 🧪 测试策略

### 1. 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_user_creation() {
        let db_manager = create_test_database().await;
        let user_repo = SurrealUserRepository::new(&db_manager);

        let user = User {
            id: None,
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hashed_password".to_string(),
            created_at: Utc::now(),
            last_login: None,
            subscription_tier: "free".to_string(),
            is_active: true,
            metadata: serde_json::Value::Null,
        };

        let created_user = user_repo.create_user(&user).await.unwrap();
        assert!(created_user.id.is_some());
        assert_eq!(created_user.email, user.email);
    }

    #[tokio::test]
    async fn test_live_query_monitoring() {
        let db_manager = create_test_database().await;
        let monitor = RealtimeMonitor::new(&db_manager);

        // 测试实时查询功能
        // 这通常涉及创建测试数据和监控变化
    }

    async fn create_test_database() -> DatabaseManager {
        let config = DatabaseConfig {
            host: "127.0.0.1".to_string(),
            port: 8000,
            namespace: "test".to_string(),
            database: format!("test_{}", uuid::Uuid::new_v4()),
            username: "root".to_string(),
            password: "root".to_string(),
        };

        DatabaseManager::new(config).await.unwrap()
    }
}
```

### 2. 集成测试

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_full_execution_workflow() {
        let db_manager = create_test_database().await;
        
        // 创建用户
        let user_repo = SurrealUserRepository::new(&db_manager);
        let user = create_test_user().await;
        let created_user = user_repo.create_user(&user).await.unwrap();

        // 创建沙箱
        let sandbox_repo = SurrealSandboxRepository::new(&db_manager);
        let sandbox = create_test_sandbox(&created_user.id.unwrap()).await;
        let created_sandbox = sandbox_repo.create_sandbox(&sandbox).await.unwrap();

        // 创建执行
        let execution_repo = SurrealExecutionRepository::new(&db_manager);
        let execution = create_test_execution(&created_sandbox.id.unwrap(), &created_user.id.unwrap()).await;
        let created_execution = execution_repo.create_execution(&execution).await.unwrap();

        // 验证关系
        let user_sandboxes = sandbox_repo.get_user_sandboxes(&created_user.id.unwrap()).await.unwrap();
        assert_eq!(user_sandboxes.len(), 1);

        let sandbox_executions = execution_repo.get_sandbox_executions(&created_sandbox.id.unwrap()).await.unwrap();
        assert_eq!(sandbox_executions.len(), 1);
    }
}
```

---

这份全面的 SurrealDB 集成指南为 SoulBox 提供了现代化的高性能数据库解决方案，消除了管理多种数据库技术的复杂性，同时提供了优越的实时能力、灵活的数据建模和出色的 Rust 集成。迁移策略确保了从 PostgreSQL 的平滑过渡，停机时间和风险都降到最低。