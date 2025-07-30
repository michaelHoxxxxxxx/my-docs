# E2B 安全模型与认证机制深度解析

本文档详细分析 E2B 的安全架构、认证机制、访问控制和安全最佳实践。

## 目录

1. [安全架构概述](#安全架构概述)
2. [认证机制详解](#认证机制详解)
3. [访问控制系统](#访问控制系统)
4. [网络安全隔离](#网络安全隔离)
5. [数据安全保护](#数据安全保护)
6. [审计与监控](#审计与监控)
7. [安全配置指南](#安全配置指南)

## 安全架构概述

### 1.1 多层安全防护

E2B 采用纵深防御的安全架构，提供多层安全保护：

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│           (Rate Limiting, DDoS Protection)             │
├─────────────────────────────────────────────────────────┤
│                 Authentication Layer                    │
│        (API Key, JWT, Signature Verification)          │
├─────────────────────────────────────────────────────────┤
│                Authorization Layer                      │
│          (RBAC, Resource Permissions)                  │
├─────────────────────────────────────────────────────────┤
│                  Network Isolation                     │
│            (VPC, Firewall, Segmentation)               │
├─────────────────────────────────────────────────────────┤
│                Container Security                       │
│         (Seccomp, AppArmor, Capabilities)              │
├─────────────────────────────────────────────────────────┤
│              Hypervisor Isolation                      │
│           (Firecracker microVM)                        │
└─────────────────────────────────────────────────────────┘
```

### 1.2 安全设计原则

1. **最小权限原则**：每个组件只获得必需的最小权限
2. **零信任架构**：不信任任何内部或外部实体
3. **纵深防御**：多层安全控制互相配合
4. **故障安全**：默认拒绝访问，安全故障时停止服务

## 认证机制详解

### 2.1 API Key 认证

#### 基础 API Key 实现

```typescript
// ConnectionConfig 类中的认证逻辑
export class ConnectionConfig {
  readonly apiKey?: string
  readonly accessToken?: string
  readonly domain: string
  
  constructor(opts?: ConnectionOpts) {
    // 1. 从环境变量或配置获取 API Key
    this.apiKey = opts?.apiKey || this.getEnvVar('E2B_API_KEY')
    this.accessToken = opts?.accessToken || this.getEnvVar('E2B_ACCESS_TOKEN')
    
    // 2. 验证 API Key 格式
    if (this.apiKey && !this.isValidApiKeyFormat(this.apiKey)) {
      throw new AuthenticationError('Invalid API Key format')
    }
    
    this.domain = opts?.domain || this.getEnvVar('E2B_DOMAIN') || 'e2b.dev'
  }
  
  private isValidApiKeyFormat(apiKey: string): boolean {
    // API Key 格式验证：e2b_[环境]_[base64编码的密钥]
    const apiKeyPattern = /^e2b_[a-z]+_[A-Za-z0-9+/]+=*$/
    return apiKeyPattern.test(apiKey)
  }
  
  // 获取认证头信息
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    
    if (this.accessToken) {
      headers['X-Access-Token'] = this.accessToken
    }
    
    return headers
  }
}
```

#### API Key 管理最佳实践

```typescript
class SecureApiKeyManager {
  private encryptionKey: string
  
  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey
  }
  
  // 安全存储 API Key
  async storeApiKey(userId: string, apiKey: string): Promise<void> {
    const encrypted = await this.encrypt(apiKey)
    const hashedUserId = await this.hash(userId)
    
    await this.storage.set(`api_key:${hashedUserId}`, {
      encrypted,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0
    })
  }
  
  // 安全检索 API Key
  async retrieveApiKey(userId: string): Promise<string | null> {
    const hashedUserId = await this.hash(userId)
    const record = await this.storage.get(`api_key:${hashedUserId}`)
    
    if (!record) {
      return null
    }
    
    // 更新使用统计
    await this.updateUsageStats(hashedUserId)
    
    return await this.decrypt(record.encrypted)
  }
  
  // 加密函数
  private async encrypt(data: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.encryptionKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(data)
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    )
    
    // 将 IV 和加密数据组合
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  }
  
  // 解密函数
  private async decrypt(encryptedData: string): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    )
    
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.encryptionKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    return new TextDecoder().decode(decrypted)
  }
  
  // 哈希函数
  private async hash(data: string): Promise<string> {
    const encoded = new TextEncoder().encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}
```

### 2.2 JWT Token 认证

```typescript
interface JWTPayload {
  sub: string        // 用户ID
  iss: string        // 发行者
  aud: string        // 受众
  exp: number        // 过期时间
  iat: number        // 签发时间
  scope: string[]    // 权限范围
  sandbox_limits: {
    max_concurrent: number
    max_duration_minutes: number
    allowed_templates: string[]
  }
}

class JWTAuthenticator {
  private publicKey: CryptoKey
  private algorithms = ['RS256']
  
  constructor(publicKey: CryptoKey) {
    this.publicKey = publicKey
  }
  
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // 1. 解析 JWT 结构
      const [headerB64, payloadB64, signatureB64] = token.split('.')
      
      if (!headerB64 || !payloadB64 || !signatureB64) {
        throw new AuthenticationError('Invalid JWT format')
      }
      
      // 2. 验证头部
      const header = JSON.parse(atob(headerB64))
      if (!this.algorithms.includes(header.alg)) {
        throw new AuthenticationError('Unsupported algorithm')
      }
      
      // 3. 验证签名
      const signatureBytes = this.base64UrlDecode(signatureB64)
      const dataToVerify = `${headerB64}.${payloadB64}`
      const dataBytes = new TextEncoder().encode(dataToVerify)
      
      const isValid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        this.publicKey,
        signatureBytes,
        dataBytes
      )
      
      if (!isValid) {
        throw new AuthenticationError('Invalid signature')
      }
      
      // 4. 验证载荷
      const payload: JWTPayload = JSON.parse(atob(payloadB64))
      
      // 检查过期时间
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        throw new AuthenticationError('Token expired')
      }
      
      // 检查签发时间
      if (payload.iat && payload.iat > now + 300) { // 允许5分钟时钟偏差
        throw new AuthenticationError('Token used before valid')
      }
      
      return payload
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Token verification failed')
    }
  }
  
  private base64UrlDecode(str: string): Uint8Array {
    // 将 base64url 转换为 base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4
    const padded = padding ? base64 + '='.repeat(4 - padding) : base64
    
    // 解码
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}
```

### 2.3 签名认证机制

基于 E2B 源码中的签名实现：

```typescript
// 基于源码的签名认证实现
export async function getSignature({
  path,
  operation,
  user,
  expirationInSeconds,
  envdAccessToken
}: SignatureOpts): Promise<{ signature: string; expiration: number | null }> {
  
  // 1. 计算过期时间
  const expiration = expirationInSeconds 
    ? Math.floor(Date.now() / 1000) + expirationInSeconds
    : null
  
  // 2. 构造签名原始字符串
  const signatureRaw = expiration
    ? `${path}:${operation}:${user}:${envdAccessToken}:${expiration}`
    : `${path}:${operation}:${user}:${envdAccessToken}`
  
  // 3. 计算 SHA-256 哈希
  const hashBase64 = await sha256(signatureRaw)
  
  // 4. 生成最终签名
  const signature = 'v1_' + hashBase64.replace(/=+$/, '')
  
  return { signature, expiration }
}

// SHA-256 哈希实现
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  return hashBase64
}

// 签名验证中间件
class SignatureVerifier {
  async verifyRequest(request: Request, envdAccessToken: string): Promise<boolean> {
    const url = new URL(request.url)
    const signature = url.searchParams.get('signature')
    const expiration = url.searchParams.get('expiration')
    const user = url.searchParams.get('user') || 'default'
    
    if (!signature || !signature.startsWith('v1_')) {
      throw new AuthenticationError('Missing or invalid signature')
    }
    
    // 检查过期时间
    if (expiration) {
      const expirationTime = parseInt(expiration)
      const now = Math.floor(Date.now() / 1000)
      
      if (expirationTime < now) {
        throw new AuthenticationError('Signature expired')
      }
    }
    
    // 重新计算签名
    const expectedSig = await getSignature({
      path: url.pathname,
      operation: request.method,
      user,
      expirationInSeconds: expiration ? parseInt(expiration) - Math.floor(Date.now() / 1000) : undefined,
      envdAccessToken
    })
    
    // 时间安全的字符串比较
    return this.timingSafeEqual(signature, expectedSig.signature)
  }
  
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }
}
```

## 访问控制系统

### 3.1 基于角色的访问控制 (RBAC)

```typescript
interface Permission {
  resource: string    // 资源类型：sandbox, file, template
  action: string     // 操作：create, read, update, delete, execute
  conditions?: {     // 条件限制
    ownership?: boolean
    timeRange?: { start: string; end: string }
    resourceLimits?: { maxCpu: number; maxMemory: number }
  }
}

interface Role {
  name: string
  permissions: Permission[]
  inherits?: string[]  // 继承的角色
}

class RBACManager {
  private roles: Map<string, Role> = new Map()
  private userRoles: Map<string, string[]> = new Map()
  
  constructor() {
    this.initializeDefaultRoles()
  }
  
  private initializeDefaultRoles(): void {
    // 基础用户角色
    this.addRole({
      name: 'basic_user',
      permissions: [
        {
          resource: 'sandbox',
          action: 'create',
          conditions: {
            resourceLimits: { maxCpu: 1, maxMemory: 512 }
          }
        },
        {
          resource: 'sandbox',
          action: 'read',
          conditions: { ownership: true }
        },
        {
          resource: 'sandbox',
          action: 'execute',
          conditions: { ownership: true }
        },
        {
          resource: 'file',
          action: 'read',
          conditions: { ownership: true }
        },
        {
          resource: 'file',
          action: 'create',
          conditions: { ownership: true }
        }
      ]
    })
    
    // 高级用户角色
    this.addRole({
      name: 'premium_user',
      permissions: [
        {
          resource: 'sandbox',
          action: 'create',
          conditions: {
            resourceLimits: { maxCpu: 4, maxMemory: 2048 }
          }
        },
        {
          resource: 'template',
          action: 'create'
        },
        {
          resource: 'template',
          action: 'read'
        }
      ],
      inherits: ['basic_user']
    })
    
    // 管理员角色
    this.addRole({
      name: 'admin',
      permissions: [
        { resource: '*', action: '*' }  // 所有权限
      ]
    })
  }
  
  addRole(role: Role): void {
    this.roles.set(role.name, role)
  }
  
  assignRoleToUser(userId: string, roleName: string): void {
    const userRoles = this.userRoles.get(userId) || []
    if (!userRoles.includes(roleName)) {
      userRoles.push(roleName)
      this.userRoles.set(userId, userRoles)
    }
  }
  
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    const userRoles = this.userRoles.get(userId) || []
    
    for (const roleName of userRoles) {
      const role = this.roles.get(roleName)
      if (role && await this.roleHasPermission(role, resource, action, context)) {
        return true
      }
    }
    
    return false
  }
  
  private async roleHasPermission(
    role: Role,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    // 检查直接权限
    for (const permission of role.permissions) {
      if (this.permissionMatches(permission, resource, action) &&
          await this.checkConditions(permission.conditions, context)) {
        return true
      }
    }
    
    // 检查继承的权限
    if (role.inherits) {
      for (const inheritedRoleName of role.inherits) {
        const inheritedRole = this.roles.get(inheritedRoleName)
        if (inheritedRole && 
            await this.roleHasPermission(inheritedRole, resource, action, context)) {
          return true
        }
      }
    }
    
    return false
  }
  
  private permissionMatches(permission: Permission, resource: string, action: string): boolean {
    const resourceMatch = permission.resource === '*' || permission.resource === resource
    const actionMatch = permission.action === '*' || permission.action === action
    return resourceMatch && actionMatch
  }
  
  private async checkConditions(conditions?: Permission['conditions'], context?: any): Promise<boolean> {
    if (!conditions) {
      return true
    }
    
    // 检查所有权条件
    if (conditions.ownership && context?.ownerId !== context?.requesterId) {
      return false
    }
    
    // 检查时间范围条件
    if (conditions.timeRange) {
      const now = new Date()
      const start = new Date(conditions.timeRange.start)
      const end = new Date(conditions.timeRange.end)
      
      if (now < start || now > end) {
        return false
      }
    }
    
    // 检查资源限制条件
    if (conditions.resourceLimits && context?.resourceRequest) {
      const { maxCpu, maxMemory } = conditions.resourceLimits
      const { cpuCores, memoryMB } = context.resourceRequest
      
      if (cpuCores > maxCpu || memoryMB > maxMemory) {
        return false
      }
    }
    
    return true
  }
}
```

### 3.2 资源级访问控制

```typescript
class ResourceAccessController {
  private rbacManager: RBACManager
  
  constructor(rbacManager: RBACManager) {
    this.rbacManager = rbacManager
  }
  
  async canCreateSandbox(
    userId: string,
    sandboxConfig: SandboxConfig
  ): Promise<boolean> {
    const context = {
      requesterId: userId,
      resourceRequest: {
        cpuCores: sandboxConfig.cpuCores || 1,
        memoryMB: sandboxConfig.memoryMB || 512
      }
    }
    
    const hasPermission = await this.rbacManager.checkPermission(
      userId,
      'sandbox',
      'create',
      context
    )
    
    if (!hasPermission) {
      return false
    }
    
    // 额外的业务逻辑检查
    return await this.checkSandboxQuota(userId, sandboxConfig)
  }
  
  async canAccessSandbox(
    userId: string,
    sandboxId: string,
    action: string
  ): Promise<boolean> {
    // 获取沙箱信息
    const sandboxInfo = await this.getSandboxInfo(sandboxId)
    if (!sandboxInfo) {
      return false
    }
    
    const context = {
      requesterId: userId,
      ownerId: sandboxInfo.ownerId,
      resourceId: sandboxId
    }
    
    return await this.rbacManager.checkPermission(
      userId,
      'sandbox',
      action,
      context
    )
  }
  
  async canAccessFile(
    userId: string,
    sandboxId: string,
    filePath: string,
    action: string
  ): Promise<boolean> {
    // 首先检查沙箱访问权限
    const canAccessSandbox = await this.canAccessSandbox(userId, sandboxId, 'read')
    if (!canAccessSandbox) {
      return false
    }
    
    // 检查文件级权限
    const context = {
      requesterId: userId,
      sandboxId,
      filePath
    }
    
    return await this.rbacManager.checkPermission(
      userId,
      'file',
      action,
      context
    )
  }
  
  private async checkSandboxQuota(
    userId: string,
    sandboxConfig: SandboxConfig
  ): Promise<boolean> {
    const userQuota = await this.getUserQuota(userId)
    const currentUsage = await this.getCurrentUsage(userId)
    
    // 检查并发沙箱数量限制
    if (currentUsage.activeSandboxes >= userQuota.maxConcurrentSandboxes) {
      return false
    }
    
    // 检查资源使用限制
    const totalCpu = currentUsage.totalCpuCores + (sandboxConfig.cpuCores || 1)
    const totalMemory = currentUsage.totalMemoryMB + (sandboxConfig.memoryMB || 512)
    
    if (totalCpu > userQuota.maxTotalCpuCores || 
        totalMemory > userQuota.maxTotalMemoryMB) {
      return false
    }
    
    return true
  }
  
  private async getSandboxInfo(sandboxId: string): Promise<{ ownerId: string } | null> {
    // 从数据库或缓存获取沙箱信息
    // 这里是模拟实现
    return { ownerId: 'user123' }
  }
  
  private async getUserQuota(userId: string): Promise<UserQuota> {
    // 获取用户配额信息
    return {
      maxConcurrentSandboxes: 5,
      maxTotalCpuCores: 8,
      maxTotalMemoryMB: 4096
    }
  }
  
  private async getCurrentUsage(userId: string): Promise<UsageStats> {
    // 获取当前使用情况
    return {
      activeSandboxes: 2,
      totalCpuCores: 3,
      totalMemoryMB: 1536
    }
  }
}
```

## 网络安全隔离

### 4.1 网络隔离架构

```typescript
interface NetworkPolicy {
  sandboxId: string
  rules: NetworkRule[]
  defaultAction: 'allow' | 'deny'
}

interface NetworkRule {
  direction: 'ingress' | 'egress'
  protocol: 'tcp' | 'udp' | 'icmp'
  port?: number | { from: number; to: number }
  cidr?: string
  hostname?: string
  action: 'allow' | 'deny'
  priority: number
}

class NetworkSecurityManager {
  private policies: Map<string, NetworkPolicy> = new Map()
  private dnsResolver: SecureDNSResolver
  
  constructor() {
    this.dnsResolver = new SecureDNSResolver()
    this.initializeDefaultPolicies()
  }
  
  private initializeDefaultPolicies(): void {
    // 默认安全策略：拒绝所有入站连接，允许有限的出站连接
    const defaultPolicy: NetworkPolicy = {
      sandboxId: 'default',
      defaultAction: 'deny',
      rules: [
        // 允许 DNS 查询
        {
          direction: 'egress',
          protocol: 'udp',
          port: 53,
          cidr: '0.0.0.0/0',
          action: 'allow',
          priority: 100
        },
        // 允许 HTTP/HTTPS 到白名单域名
        {
          direction: 'egress',
          protocol: 'tcp',
          port: { from: 80, to: 80 },
          hostname: 'api.trusted-service.com',
          action: 'allow',
          priority: 90
        },
        {
          direction: 'egress',
          protocol: 'tcp',
          port: { from: 443, to: 443 },
          hostname: 'api.trusted-service.com',
          action: 'allow',
          priority: 90
        },
        // 拒绝所有其他连接
        {
          direction: 'ingress',
          protocol: 'tcp',
          action: 'deny',
          priority: 1
        },
        {
          direction: 'egress',
          protocol: 'tcp',
          action: 'deny',
          priority: 1
        }
      ]
    }
    
    this.policies.set('default', defaultPolicy)
  }
  
  async createSandboxNetworkPolicy(
    sandboxId: string,
    config: SandboxSecurityConfig
  ): Promise<void> {
    const policy: NetworkPolicy = {
      sandboxId,
      defaultAction: config.defaultNetworkAction || 'deny',
      rules: []
    }
    
    // 添加用户定义的规则
    if (config.allowedDomains) {
      for (const domain of config.allowedDomains) {
        policy.rules.push({
          direction: 'egress',
          protocol: 'tcp',
          port: { from: 80, to: 80 },
          hostname: domain,
          action: 'allow',
          priority: 80
        })
        
        policy.rules.push({
          direction: 'egress',
          protocol: 'tcp',
          port: { from: 443, to: 443 },
          hostname: domain,
          action: 'allow',
          priority: 80
        })
      }
    }
    
    // 添加端口规则
    if (config.allowedPorts) {
      for (const portRule of config.allowedPorts) {
        policy.rules.push({
          direction: 'egress',
          protocol: portRule.protocol,
          port: portRule.port,
          cidr: portRule.cidr || '0.0.0.0/0',
          action: 'allow',
          priority: 70
        })
      }
    }
    
    // 排序规则（优先级高的在前）
    policy.rules.sort((a, b) => b.priority - a.priority)
    
    this.policies.set(sandboxId, policy)
    
    // 应用网络策略到底层网络基础设施
    await this.applyNetworkPolicy(policy)
  }
  
  async checkNetworkAccess(
    sandboxId: string,
    direction: 'ingress' | 'egress',
    protocol: string,
    port: number,
    address: string
  ): Promise<boolean> {
    const policy = this.policies.get(sandboxId) || this.policies.get('default')!
    
    // 解析主机名为 IP 地址
    const ipAddress = await this.resolveAddress(address)
    
    // 按优先级检查规则
    for (const rule of policy.rules) {
      if (this.ruleMatches(rule, direction, protocol, port, ipAddress, address)) {
        return rule.action === 'allow'
      }
    }
    
    // 如果没有匹配的规则，使用默认动作
    return policy.defaultAction === 'allow'
  }
  
  private ruleMatches(
    rule: NetworkRule,
    direction: string,
    protocol: string,
    port: number,
    ipAddress: string,
    hostname: string
  ): boolean {
    // 检查方向
    if (rule.direction !== direction) {
      return false
    }
    
    // 检查协议
    if (rule.protocol !== protocol) {
      return false
    }
    
    // 检查端口
    if (rule.port) {
      if (typeof rule.port === 'number') {
        if (rule.port !== port) {
          return false
        }
      } else {
        if (port < rule.port.from || port > rule.port.to) {
          return false
        }
      }
    }
    
    // 检查 CIDR
    if (rule.cidr && !this.ipInCIDR(ipAddress, rule.cidr)) {
      return false
    }
    
    // 检查主机名
    if (rule.hostname && rule.hostname !== hostname) {
      return false
    }
    
    return true
  }
  
  private async resolveAddress(address: string): Promise<string> {
    // 如果已经是 IP 地址，直接返回
    if (this.isIPAddress(address)) {
      return address
    }
    
    // 使用安全的 DNS 解析器
    return await this.dnsResolver.resolve(address)
  }
  
  private isIPAddress(address: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^([0-9a-fA-F]*:){2,7}[0-9a-fA-F]*$/
    return ipv4Regex.test(address) || ipv6Regex.test(address)
  }
  
  private ipInCIDR(ip: string, cidr: string): boolean {
    // 简化的 CIDR 检查实现
    // 实际实现需要更复杂的 IP 地址计算
    const [network, prefixLength] = cidr.split('/')
    // ... CIDR 匹配逻辑
    return true  // 简化返回
  }
  
  private async applyNetworkPolicy(policy: NetworkPolicy): Promise<void> {
    // 将策略应用到底层网络基础设施
    // 这可能涉及配置 iptables、网络命名空间等
    console.log(`Applying network policy for sandbox ${policy.sandboxId}`)
  }
}

// 安全 DNS 解析器
class SecureDNSResolver {
  private cache: Map<string, { ip: string; expiry: number }> = new Map()
  private dnsServers = ['1.1.1.1', '8.8.8.8']  // 使用安全的 DNS 服务器
  
  async resolve(hostname: string): Promise<string> {
    // 检查缓存
    const cached = this.cache.get(hostname)
    if (cached && cached.expiry > Date.now()) {
      return cached.ip
    }
    
    // 验证主机名格式
    if (!this.isValidHostname(hostname)) {
      throw new Error('Invalid hostname format')
    }
    
    // 执行 DNS 查询
    const ip = await this.performDNSQuery(hostname)
    
    // 缓存结果（1小时）
    this.cache.set(hostname, {
      ip,
      expiry: Date.now() + 3600000
    })
    
    return ip
  }
  
  private isValidHostname(hostname: string): boolean {
    const hostnameRegex = /^[a-zA-Z0-9.-]+$/
    return hostnameRegex.test(hostname) && hostname.length <= 253
  }
  
  private async performDNSQuery(hostname: string): Promise<string> {
    // 实际的 DNS 查询实现
    // 这里简化为模拟实现
    return '192.168.1.1'
  }
}
```

### 4.2 防火墙配置

```typescript
class SandboxFirewall {
  async configureSandboxFirewall(
    sandboxId: string,
    config: FirewallConfig
  ): Promise<void> {
    const rules = this.generateIptablesRules(config)
    
    // 应用 iptables 规则到沙箱网络命名空间
    for (const rule of rules) {
      await this.executeInNamespace(sandboxId, `iptables ${rule}`)
    }
  }
  
  private generateIptablesRules(config: FirewallConfig): string[] {
    const rules: string[] = []
    
    // 默认策略：丢弃所有流量
    rules.push('-P INPUT DROP')
    rules.push('-P FORWARD DROP')
    rules.push('-P OUTPUT DROP')
    
    // 允许本地回环
    rules.push('-A INPUT -i lo -j ACCEPT')
    rules.push('-A OUTPUT -o lo -j ACCEPT')
    
    // 允许已建立的连接
    rules.push('-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT')
    rules.push('-A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT')
    
    // 允许特定的出站连接
    if (config.allowHTTP) {
      rules.push('-A OUTPUT -p tcp --dport 80 -j ACCEPT')
    }
    
    if (config.allowHTTPS) {
      rules.push('-A OUTPUT -p tcp --dport 443 -j ACCEPT')
    }
    
    // 允许 DNS
    if (config.allowDNS) {
      rules.push('-A OUTPUT -p udp --dport 53 -j ACCEPT')
    }
    
    // 自定义规则
    for (const customRule of config.customRules || []) {
      rules.push(customRule)
    }
    
    // 记录被丢弃的包（用于调试）
    rules.push('-A INPUT -j LOG --log-prefix "SANDBOX-DROP-INPUT: "')
    rules.push('-A OUTPUT -j LOG --log-prefix "SANDBOX-DROP-OUTPUT: "')
    
    return rules
  }
  
  private async executeInNamespace(
    sandboxId: string,
    command: string
  ): Promise<void> {
    // 在指定的网络命名空间中执行命令
    const namespacedCommand = `ip netns exec sandbox-${sandboxId} ${command}`
    // 执行命令...
  }
}
```

## 数据安全保护

### 4.1 数据加密

```typescript
class DataSecurityManager {
  private encryptionKey: CryptoKey
  
  constructor(encryptionKey: CryptoKey) {
    this.encryptionKey = encryptionKey
  }
  
  // 文件传输加密
  async encryptFileForTransfer(fileData: Uint8Array): Promise<EncryptedFile> {
    // 生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // 加密文件数据
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      fileData
    )
    
    // 计算文件哈希
    const hash = await crypto.subtle.digest('SHA-256', fileData)
    
    return {
      encryptedData: new Uint8Array(encrypted),
      iv,
      hash: new Uint8Array(hash),
      size: fileData.length
    }
  }
  
  async decryptFileFromTransfer(encryptedFile: EncryptedFile): Promise<Uint8Array> {
    // 解密文件数据
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedFile.iv },
      this.encryptionKey,
      encryptedFile.encryptedData
    )
    
    const decryptedData = new Uint8Array(decrypted)
    
    // 验证文件完整性
    const hash = await crypto.subtle.digest('SHA-256', decryptedData)
    const expectedHash = new Uint8Array(encryptedFile.hash)
    
    if (!this.arraysEqual(new Uint8Array(hash), expectedHash)) {
      throw new Error('File integrity check failed')
    }
    
    return decryptedData
  }
  
  // 敏感数据脱敏
  async sanitizeOutputData(data: string): Promise<string> {
    let sanitized = data
    
    // 移除常见的敏感信息模式
    const sensitivePatterns = [
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g,  // 邮箱地址
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,       // 信用卡号
      /\b\d{3}-\d{2}-\d{4}\b/g,                            // SSN
      /\b(?:sk|pk)_[a-zA-Z0-9]{24,}\b/g,                   // API 密钥
      /\b[A-Za-z0-9]{20,}\b/g                              // 长字符串（可能是密钥）
    ]
    
    const replacements = [
      '***EMAIL***',
      '***CARD***',
      '***SSN***',
      '***API_KEY***',
      '***REDACTED***'
    ]
    
    sensitivePatterns.forEach((pattern, index) => {
      sanitized = sanitized.replace(pattern, replacements[index])
    })
    
    return sanitized
  }
  
  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }
}
```

### 4.2 安全存储

```typescript
class SecureStorageManager {
  private vault: SecretVault
  
  constructor(vault: SecretVault) {
    this.vault = vault
  }
  
  // 安全存储用户文件
  async storeUserFile(
    userId: string,
    sandboxId: string,
    filename: string,
    data: Uint8Array
  ): Promise<string> {
    // 生成文件 ID
    const fileId = await this.generateFileId(userId, sandboxId, filename)
    
    // 加密文件数据
    const encryptedFile = await this.encryptFile(data)
    
    // 存储到安全存储
    await this.vault.store(`files:${fileId}`, {
      encryptedData: Array.from(encryptedFile.encryptedData),
      iv: Array.from(encryptedFile.iv),
      hash: Array.from(encryptedFile.hash),
      metadata: {
        originalName: filename,
        size: data.length,
        uploadedAt: new Date().toISOString(),
        userId,
        sandboxId
      }
    })
    
    // 记录文件索引
    await this.indexFile(userId, sandboxId, filename, fileId)
    
    return fileId
  }
  
  async retrieveUserFile(
    userId: string,
    fileId: string
  ): Promise<{ data: Uint8Array; metadata: any } | null> {
    // 验证用户权限
    if (!await this.verifyFileAccess(userId, fileId)) {
      throw new Error('Access denied')
    }
    
    // 从安全存储获取文件
    const storedFile = await this.vault.retrieve(`files:${fileId}`)
    if (!storedFile) {
      return null
    }
    
    // 解密文件数据
    const encryptedFile = {
      encryptedData: new Uint8Array(storedFile.encryptedData),
      iv: new Uint8Array(storedFile.iv),
      hash: new Uint8Array(storedFile.hash)
    }
    
    const decryptedData = await this.decryptFile(encryptedFile)
    
    return {
      data: decryptedData,
      metadata: storedFile.metadata
    }
  }
  
  private async generateFileId(
    userId: string,
    sandboxId: string,
    filename: string
  ): Promise<string> {
    const data = `${userId}:${sandboxId}:${filename}:${Date.now()}`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  
  private async verifyFileAccess(userId: string, fileId: string): Promise<boolean> {
    const fileMetadata = await this.vault.retrieve(`files:${fileId}`)
    return fileMetadata?.metadata?.userId === userId
  }
}

// 安全密钥库接口
interface SecretVault {
  store(key: string, value: any): Promise<void>
  retrieve(key: string): Promise<any>
  delete(key: string): Promise<void>
}
```

## 审计与监控

### 4.3 安全审计系统

```typescript
interface AuditEvent {
  timestamp: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  success: boolean
  details?: any
  clientIP?: string
  userAgent?: string
  sessionId?: string
}

class SecurityAuditSystem {
  private auditLog: AuditLogger
  private alertManager: AlertManager
  
  constructor(auditLogger: AuditLogger, alertManager: AlertManager) {
    this.auditLog = auditLogger
    this.alertManager = alertManager
  }
  
  async logSecurityEvent(event: AuditEvent): Promise<void> {
    // 记录审计事件
    await this.auditLog.log(event)
    
    // 检查是否需要告警
    await this.checkForSecurityAlerts(event)
  }
  
  private async checkForSecurityAlerts(event: AuditEvent): Promise<void> {
    // 检查失败的认证尝试
    if (event.action === 'authenticate' && !event.success) {
      await this.checkFailedAuthAttempts(event.userId, event.clientIP)
    }
    
    // 检查异常的资源访问
    if (event.action === 'access_resource' && event.success) {
      await this.checkAnomalousAccess(event)
    }
    
    // 检查权限提升尝试
    if (event.action.includes('privilege') && !event.success) {
      await this.alertManager.sendAlert({
        type: 'privilege_escalation_attempt',
        severity: 'high',
        details: event
      })
    }
  }
  
  private async checkFailedAuthAttempts(userId: string, clientIP?: string): Promise<void> {
    const timeWindow = 15 * 60 * 1000  // 15分钟
    const maxAttempts = 5
    
    const recentFailures = await this.auditLog.query({
      userId,
      action: 'authenticate',
      success: false,
      timeRange: {
        start: new Date(Date.now() - timeWindow).toISOString(),
        end: new Date().toISOString()
      }
    })
    
    if (recentFailures.length >= maxAttempts) {
      await this.alertManager.sendAlert({
        type: 'brute_force_attempt',
        severity: 'high',
        details: {
          userId,
          clientIP,
          attemptCount: recentFailures.length,
          timeWindow: '15 minutes'
        }
      })
      
      // 触发自动响应：临时锁定账户
      await this.triggerAccountLockdown(userId, 'brute_force_protection')
    }
  }
  
  private async checkAnomalousAccess(event: AuditEvent): Promise<void> {
    // 检查访问模式异常
    const userHistory = await this.getUserAccessHistory(event.userId)
    
    // 异常地理位置访问
    if (event.clientIP && await this.isUnusualLocation(event.userId, event.clientIP)) {
      await this.alertManager.sendAlert({
        type: 'unusual_location_access',
        severity: 'medium',
        details: {
          userId: event.userId,
          clientIP: event.clientIP,
          resource: event.resource
        }
      })
    }
    
    // 异常时间访问
    if (await this.isUnusualTime(event.userId, event.timestamp)) {
      await this.alertManager.sendAlert({
        type: 'unusual_time_access',
        severity: 'low',
        details: event
      })
    }
  }
  
  async generateSecurityReport(timeRange: { start: string; end: string }): Promise<SecurityReport> {
    const events = await this.auditLog.query({
      timeRange
    })
    
    const report: SecurityReport = {
      timeRange,
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.success).length,
      failedEvents: events.filter(e => !e.success).length,
      topUsers: this.getTopUsers(events),
      topActions: this.getTopActions(events),
      securityIncidents: await this.getSecurityIncidents(timeRange),
      recommendations: await this.generateSecurityRecommendations(events)
    }
    
    return report
  }
  
  private getTopUsers(events: AuditEvent[]): Array<{ userId: string; eventCount: number }> {
    const userCounts = new Map<string, number>()
    
    events.forEach(event => {
      const count = userCounts.get(event.userId) || 0
      userCounts.set(event.userId, count + 1)
    })
    
    return Array.from(userCounts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
  }
  
  private async generateSecurityRecommendations(events: AuditEvent[]): Promise<string[]> {
    const recommendations: string[] = []
    
    // 分析失败率
    const failureRate = events.filter(e => !e.success).length / events.length
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Review authentication mechanisms.')
    }
    
    // 分析访问模式
    const uniqueIPs = new Set(events.map(e => e.clientIP).filter(Boolean))
    if (uniqueIPs.size > events.length * 0.8) {
      recommendations.push('High IP diversity detected. Consider implementing IP whitelisting.')
    }
    
    return recommendations
  }
}

interface AuditLogger {
  log(event: AuditEvent): Promise<void>
  query(criteria: any): Promise<AuditEvent[]>
}

interface AlertManager {
  sendAlert(alert: SecurityAlert): Promise<void>
}

interface SecurityAlert {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: any
}
```

## 安全配置指南

### 4.4 生产环境安全配置

```typescript
// 生产环境安全配置模板
const productionSecurityConfig = {
  // 认证配置
  authentication: {
    apiKeyRotationDays: 90,
    jwtExpirationMinutes: 60,
    requireMFA: true,
    allowedOrigins: ['https://yourapp.com'],
    rateLimiting: {
      requestsPerMinute: 100,
      burstLimit: 200
    }
  },
  
  // 沙箱安全配置
  sandbox: {
    defaultTimeout: 30 * 60 * 1000,  // 30分钟
    maxConcurrentPerUser: 5,
    resourceLimits: {
      maxCpuCores: 2,
      maxMemoryMB: 2048,
      maxDiskMB: 4096,
      maxNetworkBandwidth: 10 * 1024 * 1024  // 10MB/s
    },
    networkSecurity: {
      allowOutboundInternet: false,
      allowedDomains: [
        'api.trusted-service.com',
        'cdn.trusted-cdn.com'
      ],
      blockedPorts: [22, 23, 3389],  // SSH, Telnet, RDP
      enableFirewall: true
    }
  },
  
  // 数据安全配置
  data: {
    encryptionAtRest: true,
    encryptionInTransit: true,
    dataRetentionDays: 30,
    autoDeleteTempFiles: true,
    sanitizeOutput: true,
    maxFileSize: 100 * 1024 * 1024  // 100MB
  },
  
  // 监控配置
  monitoring: {
    enableAuditLogging: true,
    logLevel: 'INFO',
    alertOnFailedAuth: true,
    alertOnUnusualActivity: true,
    securityReportInterval: 'daily'
  },
  
  // 合规配置
  compliance: {
    gdprCompliant: true,
    hipaaCompliant: false,
    sox404Compliant: true,
    dataClassification: 'sensitive'
  }
}

// 应用安全配置
class SecurityConfigManager {
  async applySecurityConfig(config: SecurityConfig): Promise<void> {
    // 应用认证配置
    await this.configureAuthentication(config.authentication)
    
    // 应用沙箱安全配置
    await this.configureSandboxSecurity(config.sandbox)
    
    // 应用数据安全配置
    await this.configureDataSecurity(config.data)
    
    // 应用监控配置
    await this.configureMonitoring(config.monitoring)
    
    console.log('Security configuration applied successfully')
  }
  
  private async configureAuthentication(authConfig: AuthenticationConfig): Promise<void> {
    // 配置认证相关设置
    // ... 实现认证配置逻辑
  }
  
  private async configureSandboxSecurity(sandboxConfig: SandboxSecurityConfig): Promise<void> {
    // 配置沙箱安全设置
    // ... 实现沙箱安全配置逻辑
  }
  
  private async configureDataSecurity(dataConfig: DataSecurityConfig): Promise<void> {
    // 配置数据安全设置
    // ... 实现数据安全配置逻辑
  }
  
  private async configureMonitoring(monitoringConfig: MonitoringConfig): Promise<void> {
    // 配置监控设置
    // ... 实现监控配置逻辑
  }
}
```

## 总结

E2B 的安全模型采用了全面的多层防护策略：

### 核心安全特性

1. **强认证机制**：API Key、JWT、签名认证多重保护
2. **精细访问控制**：基于 RBAC 的资源级权限管理
3. **网络隔离**：基于策略的网络访问控制和防火墙保护
4. **数据加密**：传输和存储全程加密保护
5. **实时监控**：全面的审计日志和异常检测

### 安全最佳实践

1. **定期轮换密钥**：API Key 和加密密钥定期更新
2. **最小权限原则**：仅授予必要的最小权限
3. **网络白名单**：仅允许访问必要的外部资源
4. **监控告警**：建立完善的安全监控和告警体系
5. **定期审计**：定期进行安全审计和渗透测试

### 合规性支持

1. **GDPR 兼容**：支持数据保护和用户隐私要求
2. **SOX 404 支持**：满足财务报告内控要求
3. **审计跟踪**：完整的操作审计记录
4. **数据分类**：支持敏感数据的分类和保护

通过这些安全措施，E2B 能够为企业级应用提供可信赖的代码执行环境。