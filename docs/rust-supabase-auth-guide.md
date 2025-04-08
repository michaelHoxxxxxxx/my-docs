# 使用Rust重写Supabase的认证与权限功能指南

## 目录
1. 项目概述
2. 环境准备
3. 项目结构设计
4. 实现用户注册功能
5. 实现用户登录功能
6. 实现权限管理系统
7. 与Supabase集成
8. 测试与部署
9. 安全性考虑
10. 参考资源

## 1. 项目概述

本指南将帮助您使用Rust语言重写Supabase的认证与权限功能。Supabase是一个开源的Firebase替代品，提供了数据库、认证、存储等服务。我们将专注于重新实现其认证和权限部分，使其与Rust生态系统更好地集成。

### 目标
- 使用Rust实现用户注册功能
- 实现安全的用户登录系统
- 构建灵活的权限管理模块
- 确保与现有Supabase服务的兼容性

## 2. 环境准备

### 安装Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 安装必要的工具
```bash
# 安装cargo-edit以便于管理依赖
cargo install cargo-edit

# 安装diesel CLI用于数据库操作
cargo install diesel_cli --no-default-features --features postgres
```

### 创建新项目
```bash
cargo new supabase-auth-rust
cd supabase-auth-rust
```

### 添加必要的依赖
编辑`Cargo.toml`文件，添加以下依赖：

```toml
[dependencies]
# Web框架
actix-web = "4.3.1"
# 序列化/反序列化
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
# 数据库
diesel = { version = "2.1.0", features = ["postgres", "r2d2", "chrono"] }
# 环境变量
dotenv = "0.15.0"
# 密码哈希
argon2 = "0.5.0"
# JWT认证
jsonwebtoken = "8.3.0"
# 日志
env_logger = "0.10.0"
log = "0.4.19"
# 错误处理
thiserror = "1.0.43"
anyhow = "1.0.71"
# UUID生成
uuid = { version = "1.4.0", features = ["v4", "serde"] }
# 时间处理
chrono = { version = "0.4.26", features = ["serde"] }
# HTTP客户端
reqwest = { version = "0.11.18", features = ["json"] }
# 异步运行时
tokio = { version = "1.29.1", features = ["full"] }
```

## 3. 项目结构设计

创建以下目录结构：

```
supabase-auth-rust/
├── src/
│   ├── auth/
│   │   ├── mod.rs
│   │   ├── models.rs
│   │   ├── handlers.rs
│   │   └── services.rs
│   ├── permissions/
│   │   ├── mod.rs
│   │   ├── models.rs
│   │   ├── handlers.rs
│   │   └── services.rs
│   ├── db/
│   │   ├── mod.rs
│   │   ├── schema.rs
│   │   └── migrations/
│   ├── utils/
│   │   ├── mod.rs
│   │   ├── jwt.rs
│   │   └── password.rs
│   ├── config.rs
│   ├── errors.rs
│   ├── main.rs
│   └── routes.rs
├── migrations/
├── .env
├── Cargo.toml
└── README.md
```

## 4. 实现用户注册功能

### 数据库模型设计

在`src/auth/models.rs`中定义用户模型：

```rust
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::schema::users;

#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable)]
#[diesel(table_name = users)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Insertable)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: Option<String>,
}
```

### 数据库Schema

在`src/db/schema.rs`中定义数据库表结构：

```rust
table! {
    users (id) {
        id -> Uuid,
        email -> Varchar,
        password_hash -> Varchar,
        full_name -> Nullable<Varchar>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        last_login -> Nullable<Timestamptz>,
        is_active -> Bool,
    }
}
```

### 用户注册服务

在`src/auth/services.rs`中实现注册逻辑：

```rust
use anyhow::Result;
use diesel::prelude::*;
use uuid::Uuid;

use crate::auth::models::{AuthResponse, NewUser, RegisterRequest, User, UserResponse};
use crate::db::schema::users::dsl::*;
use crate::errors::ServiceError;
use crate::utils::jwt::generate_token;
use crate::utils::password::hash_password;

pub async fn register_user(
    db: &PgConnection,
    register_data: RegisterRequest,
) -> Result<AuthResponse, ServiceError> {
    // 检查邮箱是否已存在
    let existing_user = users
        .filter(email.eq(&register_data.email))
        .first::<User>(db)
        .optional()?;

    if existing_user.is_some() {
        return Err(ServiceError::EmailAlreadyExists);
    }

    // 哈希密码
    let password_hash = hash_password(&register_data.password)?;

    // 创建新用户
    let new_user = NewUser {
        email: register_data.email,
        password_hash,
        full_name: register_data.full_name,
    };

    // 插入新用户并返回
    let user: User = diesel::insert_into(users)
        .values(&new_user)
        .get_result(db)?;

    // 生成JWT令牌
    let token = generate_token(&user.id)?;

    Ok(AuthResponse {
        user: UserResponse {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
        },
        token,
    })
}

### 密码哈希工具

在`src/utils/password.rs`中实现密码哈希功能：

```rust
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use anyhow::Result;

use crate::errors::ServiceError;

pub fn hash_password(password: &str) -> Result<String, ServiceError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| ServiceError::PasswordHashingError)?
        .to_string();
    
    Ok(password_hash)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, ServiceError> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|_| ServiceError::PasswordVerificationError)?;
    
    let result = Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_or(false, |_| true);
    
    Ok(result)
}

### API处理器

在`src/auth/handlers.rs`中实现API处理：

```rust
use actix_web::{web, HttpResponse, Responder};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;

use crate::auth::models::RegisterRequest;
use crate::auth::services::register_user;
use crate::errors::ServiceError;

type DbPool = Pool<ConnectionManager<PgConnection>>;

pub async fn register(
    pool: web::Data<DbPool>,
    register_data: web::Json<RegisterRequest>,
) -> impl Responder {
    let conn = pool.get().expect("无法获取数据库连接");
    
    match register_user(&conn, register_data.into_inner()).await {
        Ok(response) => HttpResponse::Created().json(response),
        Err(ServiceError::EmailAlreadyExists) => {
            HttpResponse::Conflict().json(serde_json::json!({
                "error": "邮箱已被注册"
            }))
        }
        Err(e) => {
            log::error!("注册失败: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "注册失败，请稍后再试"
            }))
        }
    }
}

## 5. 实现用户登录功能

### 登录模型

在`src/auth/models.rs`中添加登录请求模型：

```rust
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}
```

### 登录服务

在`src/auth/services.rs`中实现登录逻辑：

```rust
pub async fn login_user(
    db: &PgConnection,
    login_data: LoginRequest,
) -> Result<AuthResponse, ServiceError> {
    // 查找用户
    let user = users
        .filter(email.eq(&login_data.email))
        .first::<User>(db)
        .optional()?
        .ok_or(ServiceError::InvalidCredentials)?;

    // 验证密码
    if !verify_password(&login_data.password, &user.password_hash)? {
        return Err(ServiceError::InvalidCredentials);
    }

    // 更新最后登录时间
    let user: User = diesel::update(users.find(user.id))
        .set(last_login.eq(diesel::dsl::now))
        .get_result(db)?;

    // 生成JWT令牌
    let token = generate_token(&user.id)?;

    Ok(AuthResponse {
        user: UserResponse {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
        },
        token,
    })
}
```

### 登录处理器

在`src/auth/handlers.rs`中添加登录处理器：

```rust
pub async fn login(
    pool: web::Data<DbPool>,
    login_data: web::Json<LoginRequest>,
) -> impl Responder {
    let conn = pool.get().expect("无法获取数据库连接");
    
    match login_user(&conn, login_data.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(ServiceError::InvalidCredentials) => {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "邮箱或密码不正确"
            }))
        }
        Err(e) => {
            log::error!("登录失败: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "登录失败，请稍后再试"
            }))
        }
    }
}

### JWT工具

在`src/utils/jwt.rs`中实现JWT生成和验证：

```rust
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::CONFIG;
use crate::errors::ServiceError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // 用户ID
    pub exp: i64,     // 过期时间
    pub iat: i64,     // 签发时间
}

pub fn generate_token(user_id: &Uuid) -> Result<String, ServiceError> {
    let now = Utc::now();
    let expires_at = now + Duration::hours(24);
    
    let claims = Claims {
        sub: user_id.to_string(),
        exp: expires_at.timestamp(),
        iat: now.timestamp(),
    };
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(CONFIG.jwt_secret.as_bytes()),
    )
    .map_err(|_| ServiceError::TokenCreationError)?;
    
    Ok(token)
}

pub fn verify_token(token: &str) -> Result<Uuid, ServiceError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(CONFIG.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| ServiceError::InvalidToken)?;
    
    let user_id = Uuid::parse_str(&token_data.claims.sub)
        .map_err(|_| ServiceError::InvalidToken)?;
    
    Ok(user_id)
}

## 6. 实现权限管理系统

### 权限模型

在`src/permissions/models.rs`中定义权限模型：

```rust
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::schema::{roles, user_roles, permissions, role_permissions};

#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable)]
#[diesel(table_name = roles)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable)]
#[diesel(table_name = permissions)]
pub struct Permission {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource: String,
    pub action: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Associations)]
#[diesel(belongs_to(Role))]
#[diesel(belongs_to(User))]
#[diesel(table_name = user_roles)]
pub struct UserRole {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Queryable, Identifiable, Associations)]
#[diesel(belongs_to(Role))]
#[diesel(belongs_to(Permission))]
#[diesel(table_name = role_permissions)]
pub struct RolePermission {
    pub id: Uuid,
    pub role_id: Uuid,
    pub permission_id: Uuid,
    pub created_at: DateTime<Utc>,
}

// 请求模型
#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub user_id: Uuid,
    pub role_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePermissionRequest {
    pub name: String,
    pub description: Option<String>,
    pub resource: String,
    pub action: String,
}

#[derive(Debug, Deserialize)]
pub struct AssignPermissionToRoleRequest {
    pub role_id: Uuid,
    pub permission_id: Uuid,
}
```

### 数据库Schema扩展

在`src/db/schema.rs`中添加权限相关表：

```rust
table! {
    roles (id) {
        id -> Uuid,
        name -> Varchar,
        description -> Nullable<Varchar>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    permissions (id) {
        id -> Uuid,
        name -> Varchar,
        description -> Nullable<Varchar>,
        resource -> Varchar,
        action -> Varchar,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

table! {
    user_roles (id) {
        id -> Uuid,
        user_id -> Uuid,
        role_id -> Uuid,
        created_at -> Timestamptz,
    }
}

table! {
    role_permissions (id) {
        id -> Uuid,
        role_id -> Uuid,
        permission_id -> Uuid,
        created_at -> Timestamptz,
    }
}

joinable!(user_roles -> users (user_id));
joinable!(user_roles -> roles (role_id));
joinable!(role_permissions -> roles (role_id));
joinable!(role_permissions -> permissions (permission_id));

allow_tables_to_appear_in_same_query!(
    users,
    roles,
    permissions,
    user_roles,
    role_permissions,
);
```

### 权限服务

在`src/permissions/services.rs`中实现权限管理逻辑：

```rust
use anyhow::Result;
use diesel::prelude::*;
use uuid::Uuid;

use crate::db::schema::{roles, permissions, user_roles, role_permissions};
use crate::errors::ServiceError;
use crate::permissions::models::{
    Role, Permission, UserRole, RolePermission,
    CreateRoleRequest, CreatePermissionRequest,
};

// 创建角色
pub async fn create_role(
    db: &PgConnection,
    role_data: CreateRoleRequest,
) -> Result<Role, ServiceError> {
    use crate::db::schema::roles::dsl::*;
    
    // 检查角色名是否已存在
    let existing_role = roles
        .filter(name.eq(&role_data.name))
        .first::<Role>(db)
        .optional()?;
        
    if existing_role.is_some() {
        return Err(ServiceError::RoleAlreadyExists);
    }
    
    // 创建新角色
    let new_role = (
        name.eq(role_data.name),
        description.eq(role_data.description),
        created_at.eq(diesel::dsl::now),
        updated_at.eq(diesel::dsl::now),
    );
    
    let role = diesel::insert_into(roles)
        .values(new_role)
        .get_result(db)?;
        
    Ok(role)
}

// 创建权限
pub async fn create_permission(
    db: &PgConnection,
    permission_data: CreatePermissionRequest,
) -> Result<Permission, ServiceError> {
    use crate::db::schema::permissions::dsl::*;
    
    // 检查权限名是否已存在
    let existing_permission = permissions
        .filter(name.eq(&permission_data.name))
        .first::<Permission>(db)
        .optional()?;
        
    if existing_permission.is_some() {
        return Err(ServiceError::PermissionAlreadyExists);
    }
    
    // 创建新权限
    let new_permission = (
        name.eq(permission_data.name),
        description.eq(permission_data.description),
        resource.eq(permission_data.resource),
        action.eq(permission_data.action),
        created_at.eq(diesel::dsl::now),
        updated_at.eq(diesel::dsl::now),
    );
    
    let permission = diesel::insert_into(permissions)
        .values(new_permission)
        .get_result(db)?;
        
    Ok(permission)
}

// 分配角色给用户
pub async fn assign_role_to_user(
    db: &PgConnection,
    user_id: Uuid,
    role_id: Uuid,
) -> Result<UserRole, ServiceError> {
    use crate::db::schema::user_roles::dsl::*;
    
    // 检查用户和角色是否存在
    let role_exists = roles::table
        .find(role_id)
        .first::<Role>(db)
        .optional()?
        .is_some();
        
    if !role_exists {
        return Err(ServiceError::RoleNotFound);
    }
    
    let user_exists = crate::db::schema::users::table
        .find(user_id)
        .first::<crate::auth::models::User>(db)
        .optional()?
        .is_some();
        
    if !user_exists {
        return Err(ServiceError::UserNotFound);
    }
    
    // 检查是否已分配
    let existing_assignment = user_roles
        .filter(user_id.eq(user_id).and(role_id.eq(role_id)))
        .first::<UserRole>(db)
        .optional()?;
        
    if existing_assignment.is_some() {
        return Err(ServiceError::RoleAlreadyAssigned);
    }
    
    // 创建新分配
    let new_assignment = (
        user_id.eq(user_id),
        role_id.eq(role_id),
        created_at.eq(diesel::dsl::now),
    );
    
    let user_role = diesel::insert_into(user_roles)
        .values(new_assignment)
        .get_result(db)?;
        
    Ok(user_role)
}

// 分配权限给角色
pub async fn assign_permission_to_role(
    db: &PgConnection,
    role_id: Uuid,
    permission_id: Uuid,
) -> Result<RolePermission, ServiceError> {
    use crate::db::schema::role_permissions::dsl::*;
    
    // 检查角色和权限是否存在
    let role_exists = roles::table
        .find(role_id)
        .first::<Role>(db)
        .optional()?
        .is_some();
        
    if !role_exists {
        return Err(ServiceError::RoleNotFound);
    }
    
    let permission_exists = permissions::table
        .find(permission_id)
        .first::<Permission>(db)
        .optional()?
        .is_some();
        
    if !permission_exists {
        return Err(ServiceError::PermissionNotFound);
    }
    
    // 检查是否已分配
    let existing_assignment = role_permissions
        .filter(role_id.eq(role_id).and(permission_id.eq(permission_id)))
        .first::<RolePermission>(db)
        .optional()?;
        
    if existing_assignment.is_some() {
        return Err(ServiceError::PermissionAlreadyAssigned);
    }
    
    // 创建新分配
    let new_assignment = (
        role_id.eq(role_id),
        permission_id.eq(permission_id),
        created_at.eq(diesel::dsl::now),
    );
    
    let role_permission = diesel::insert_into(role_permissions)
        .values(new_assignment)
        .get_result(db)?;
        
    Ok(role_permission)
}

// 检查用户是否有特定权限
pub async fn check_user_permission(
    db: &PgConnection,
    user_id: Uuid,
    resource: &str,
    action: &str,
) -> Result<bool, ServiceError> {
    // 查询用户的所有角色
    let user_roles_list = UserRole::belonging_to(&crate::auth::models::User { id: user_id, .. })
        .load::<UserRole>(db)?;
    
    if user_roles_list.is_empty() {
        return Ok(false);
    }
    
    let role_ids: Vec<Uuid> = user_roles_list.iter().map(|ur| ur.role_id).collect();
    
    // 查询这些角色的所有权限
    let role_permissions_list = RolePermission::belonging_to_many(&role_ids.iter().map(|id| Role { id: *id, .. }).collect::<Vec<_>>())
        .load::<RolePermission>(db)?;
    
    if role_permissions_list.is_empty() {
        return Ok(false);
    }
    
    let permission_ids: Vec<Uuid> = role_permissions_list.iter().map(|rp| rp.permission_id).collect();
    
    // 检查是否有匹配的权限
    let matching_permission = permissions::table
        .filter(
            permissions::id.eq_any(permission_ids)
                .and(permissions::resource.eq(resource))
                .and(permissions::action.eq(action))
        )
        .first::<Permission>(db)
        .optional()?;
    
    Ok(matching_permission.is_some())
}

## 7. 与Supabase集成

### 配置Supabase连接

在`.env`文件中添加Supabase配置：

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/auth_db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret
```

在`src/config.rs`中读取配置：

```rust
use dotenv::dotenv;
use lazy_static::lazy_static;
use std::env;

lazy_static! {
    pub static ref CONFIG: Config = {
        dotenv().ok();
        
        Config {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            supabase_url: env::var("SUPABASE_URL").expect("SUPABASE_URL must be set"),
            supabase_key: env::var("SUPABASE_KEY").expect("SUPABASE_KEY must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
        }
    };
}

pub struct Config {
    pub database_url: String,
    pub supabase_url: String,
    pub supabase_key: String,
    pub jwt_secret: String,
}
```

### 与Supabase同步用户数据

创建一个服务来同步用户数据到Supabase：

```rust
// src/utils/supabase.rs
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::models::User;
use crate::config::CONFIG;
use crate::errors::ServiceError;

#[derive(Debug, Serialize)]
struct SupabaseUser {
    id: String,
    email: String,
    password_hash: String,
    user_metadata: serde_json::Value,
    app_metadata: serde_json::Value,
}

pub async fn sync_user_to_supabase(user: &User) -> Result<(), ServiceError> {
    let client = reqwest::Client::new();
    
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", CONFIG.supabase_key))
            .map_err(|_| ServiceError::SupabaseError)?,
    );
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    
    let supabase_user = SupabaseUser {
        id: user.id.to_string(),
        email: user.email.clone(),
        password_hash: user.password_hash.clone(),
        user_metadata: serde_json::json!({
            "full_name": user.full_name,
        }),
        app_metadata: serde_json::json!({
            "is_active": user.is_active,
        }),
    };
    
    let response = client
        .post(&format!("{}/auth/v1/admin/users", CONFIG.supabase_url))
        .headers(headers)
        .json(&supabase_user)
        .send()
        .await
        .map_err(|_| ServiceError::SupabaseError)?;
    
    if !response.status().is_success() {
        return Err(ServiceError::SupabaseError);
    }
    
    Ok(())
}
```

### 修改注册服务以同步到Supabase

修改`src/auth/services.rs`中的`register_user`函数：

```rust
pub async fn register_user(
    db: &PgConnection,
    register_data: RegisterRequest,
) -> Result<AuthResponse, ServiceError> {
    // ... 原有代码 ...

    // 同步到Supabase
    sync_user_to_supabase(&user).await?;

    // ... 原有代码 ...
}
```

## 8. 测试与部署

### 编写测试

在`tests`目录下创建测试文件：

```rust
// tests/auth_tests.rs
use actix_web::{test, web, App};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::PgConnection;
use serde_json::json;
use uuid::Uuid;

use supabase_auth_rust::auth::handlers::{login, register};
use supabase_auth_rust::auth::models::{LoginRequest, RegisterRequest};
use supabase_auth_rust::db::init_pool;

#[actix_rt::test]
async fn test_register_user() {
    // 设置测试环境
    dotenv::dotenv().ok();
    let pool = init_pool();
    
    // 创建测试应用
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/register", web::post().to(register)),
    )
    .await;
    
    // 创建测试请求
    let req = test::TestRequest::post()
        .uri("/register")
        .set_json(&RegisterRequest {
            email: format!("test_{}@example.com", Uuid::new_v4()),
            password: "Test@123".to_string(),
            full_name: Some("Test User".to_string()),
        })
        .to_request();
    
    // 发送请求并验证响应
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    
    // 解析响应
    let body = test::read_body(resp).await;
    let response: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    // 验证响应内容
    assert!(response.get("token").is_some());
    assert!(response.get("user").is_some());
    assert_eq!(
        response["user"]["full_name"].as_str().unwrap(),
        "Test User"
    );
}

#[actix_rt::test]
async fn test_login_user() {
    // 设置测试环境
    dotenv::dotenv().ok();
    let pool = init_pool();
    
    // 创建测试用户
    let email = format!("test_login_{}@example.com", Uuid::new_v4());
    let password = "Test@123".to_string();
    
    // 注册用户
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/register", web::post().to(register)),
    )
    .await;
    
    let req = test::TestRequest::post()
        .uri("/register")
        .set_json(&RegisterRequest {
            email: email.clone(),
            password: password.clone(),
            full_name: Some("Test Login User".to_string()),
        })
        .to_request();
    
    let _ = test::call_service(&app, req).await;
    
    // 测试登录
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/login", web::post().to(login)),
    )
    .await;
    
    let req = test::TestRequest::post()
        .uri("/login")
        .set_json(&LoginRequest {
            email: email.clone(),
            password: password.clone(),
        })
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success());
    
    // 解析响应
    let body = test::read_body(resp).await;
    let response: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    // 验证响应内容
    assert!(response.get("token").is_some());
    assert_eq!(response["user"]["email"].as_str().unwrap(), email);
}
```

### 部署

#### Docker部署

创建`Dockerfile`：

```dockerfile
FROM rust:1.70 as builder

WORKDIR /usr/src/app
COPY . .

RUN cargo build --release

FROM debian:bullseye-slim

WORKDIR /usr/local/bin

COPY --from=builder /usr/src/app/target/release/supabase-auth-rust .
COPY --from=builder /usr/src/app/.env .

RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

CMD ["./supabase-auth-rust"]
```

创建`docker-compose.yml`：

```yaml
version: '3'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/auth_db
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    restart: always

  db:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=auth_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 9. 安全性考虑

在实现认证和权限系统时，需要注意以下安全性问题：

1. **密码安全**：使用Argon2进行密码哈希，这是目前最安全的密码哈希算法之一。

2. **JWT安全**：
   - 设置合理的过期时间
   - 使用强随机密钥
   - 考虑实现令牌轮换机制

3. **HTTPS**：在生产环境中，确保所有API通信都通过HTTPS进行。

4. **CORS策略**：配置适当的CORS策略，限制哪些域可以访问API。

5. **速率限制**：实现速率限制，防止暴力破解攻击。

6. **审计日志**：记录所有认证和授权操作，以便进行安全审计。

## 10. 参考资源

- [Rust官方文档](https://www.rust-lang.org/learn)
- [Actix Web文档](https://actix.rs/docs/)
- [Diesel ORM文档](https://diesel.rs/guides/)
- [Supabase文档](https://supabase.io/docs)
- [JWT认证最佳实践](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP认证安全最佳实践](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
