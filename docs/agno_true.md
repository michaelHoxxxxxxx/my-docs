# Agno 团队系统

> Agno项目中的团队系统是一个允许多个AI代理(Agent)协同工作的框架。

## 目录

- [团队系统概述](#团队系统概述)
- [核心组件](#核心组件)
- [团队运行模式](#团队运行模式)
- [团队运行流程](#团队运行流程)
- [内存与上下文共享](#内存与上下文共享)
- [代码示例](#代码示例)

## 团队系统概述

Agno的团队系统是一个强大的框架，允许多个AI代理协同工作来解决复杂任务。这个系统的核心思想是通过不同专长的代理协作，可以实现比单个代理更强大的功能。

团队系统的主要特点包括：

- **多模式协作**：支持路由、协调和协作三种不同的团队协作模式
- **内存与上下文共享**：团队成员之间可以共享信息和上下文
- **多模态输入支持**：可以处理文本、图像、音频和视频等多种输入类型
- **持久化存储**：支持将团队会话和状态保存到存储中

## 核心组件

### Team 类

Team类是团队系统的核心，定义在`libs/agno/agno/team/team.py`文件中。这个类作为多个代理成员的容器和协调器。

#### 主要属性

```python
# 团队成员
 members: List[Union[Agent, "Team"]]

# 团队运行模式
 mode: Literal["route", "coordinate", "collaborate"] = "coordinate"

# 团队使用的模型
 model: Optional[Model] = None

# 团队上下文和设置
 context: Optional[Dict[str, Any]] = None
 add_context: bool = False

# 团队知识库
 knowledge: Optional[AgentKnowledge] = None

# 代理上下文和交互设置
 enable_agentic_context: bool = False
 share_member_interactions: bool = False
 get_member_information_tool: bool = False
```

### TeamMemory 类

TeamMemory类定义在`libs/agno/agno/memory/team.py`中，用于存储团队运行的历史记录和上下文。它提供了以下功能：

- 存储系统消息和用户消息
- 记录团队运行历史
- 管理共享上下文
- 支持跨会话的记忆持久化

### TeamRun 类

TeamRun类表示团队的一次运行记录，包含以下信息：

```python
@dataclass
class TeamRun:
    message: Optional[Message] = None
    member_runs: Optional[List[AgentRun]] = None
    response: Optional[TeamRunResponse] = None
```

## 团队运行模式

Agno团队系统支持三种不同的运行模式，每种模式都有其特定的应用场景和优势。

### 路由模式 (Route)

在路由模式下，团队领导分析输入并将查询路由到最合适的成员代理。

**应用场景**：当不同的查询需要不同的专家来处理时。

**工作原理**：
1. 团队领导分析用户输入
2. 确定哪个团队成员最适合处理该输入
3. 将任务转发给选定的成员
4. 成员处理任务并返回结果
5. 团队领导将结果返回给用户

```python
# 路由模式的实现代码
# 在Team类的run方法中：
if self.mode == "route":
    user_message = self._get_user_message(message, audio=audio, images=images, videos=videos, files=files)
    forward_task_func: Function = self.get_forward_task_function(
        message=user_message,
        session_id=session_id,
        stream=stream,
        async_mode=False,
        images=images,
        videos=videos,
        audio=audio,
        files=files,
    )
    _tools.append(forward_task_func)
```

### 协调模式 (Coordinate)

在协调模式下，团队领导将复杂任务分解为子任务，分配给不同成员，然后合成结果。

**应用场景**：当任务需要多个专家协作完成不同部分时。

**工作原理**：
1. 团队领导分析用户输入并制定计划
2. 将任务分解为多个子任务
3. 将子任务分配给不同的团队成员
4. 收集所有成员的结果
5. 合成最终结果并返回给用户

```python
# 协调模式的实现代码
# 在Team类的run方法中：
elif self.mode == "coordinate":
    _tools.append(
        self.get_transfer_task_function(
            session_id=session_id,
            stream=stream,
            async_mode=False,
            images=images,
            videos=videos,
            audio=audio,
            files=files,
        )
    )
```

### 协作模式 (Collaborate)

在协作模式下，所有成员处理相同任务并提供各自视角，团队领导合并这些视角。

**应用场景**：当需要多个专家对同一问题提供不同视角时。

**工作原理**：
1. 团队领导将相同的任务发送给所有成员
2. 每个成员从自己的专长角度处理任务
3. 团队领导收集所有视角
4. 合成并集成这些视角
5. 生成最终综合响应

```python
# 协作模式的实现代码
# 在Team类的run方法中：
elif self.mode == "collaborate":
    run_member_agents_func = self.get_run_member_agents_function(
        session_id=session_id,
        stream=stream,
        async_mode=False,
        images=images,
        videos=videos,
        audio=audio,
        files=files,
    )
    _tools.append(run_member_agents_func)
```

## 团队运行流程

当团队执行任务时，它遵循一个结构化的生命周期：

### 1. 初始化和准备

- 初始化团队和成员
- 从存储中读取现有会话信息
- 初始化内存系统（如果需要）

```python
# 初始化团队
 self.initialize_team(session_id=session_id)

# 从存储中读取现有会话
 self.read_from_storage(session_id=session_id)

# 初始化内存系统
 if self.memory is None:
    # 初始化内存逻辑
```

### 2. 工具准备

- 根据配置添加各种工具（内存、上下文、知识）
- 根据团队模式添加特定的工具

```python
# 准备工具
_tools: List[Union[Toolkit, Callable, Function, Dict]] = []

# 添加提供的工具
if self.tools is not None:
    for tool in self.tools:
        _tools.append(tool)

# 根据配置添加其他工具
if self.read_team_history:
    _tools.append(self.get_team_history_function(session_id=session_id))

if isinstance(self.memory, Memory) and self.enable_agentic_memory:
    _tools.append(self.get_update_user_memory_function(user_id=user_id, async_mode=False))
```

### 3. 执行团队任务

- 根据团队模式执行相应的逻辑
- 处理模型响应
- 更新TeamRunResponse

### 4. 更新内存和存储

- 更新团队内存
- 计算会话指标
- 保存到存储

```python
# 更新团队内存
if isinstance(self.memory, TeamMemory):
    # 将系统消息添加到内存中
    if run_messages.system_message is not None:
        self.memory.add_system_message(run_messages.system_message, system_message_role="system")
    
    # 构建应添加到TeamMemory的消息列表
    messages_for_memory: List[Message] = (
        [run_messages.user_message] if run_messages.user_message is not None else []
    )
    
    # 将TeamRun添加到内存中
    team_run = TeamRun(response=run_response)
    team_run.message = run_messages.user_message
    self.memory.add_team_run(team_run)
    
    # 计算会话指标
    self.session_metrics = self._calculate_session_metrics(self.memory.messages)

# 保存到存储
self.write_to_storage(session_id=session_id, user_id=user_id)

## 内存与上下文共享

Agno团队系统提供了强大的内存和上下文共享机制，使团队成员之间能够更有效地协作。

### 代理式上下文共享

团队系统支持代理式上下文共享，允许团队代理自主更新和管理共享上下文。

**主要功能**：

- 团队领导可以更新共享上下文
- 上下文可以自动发送给团队成员
- 成员可以访问并使用共享上下文

```python
# 启用代理式上下文的代码示例
team = Team(
    name="Context Team",
    members=[agent1, agent2],
    model=OpenAIChat("gpt-4o"),
    enable_agentic_context=True,  # 启用代理式上下文
    context={"initial_data": "This is shared with all members"}  # 初始上下文
)
```

**实现方式**：

当`enable_agentic_context=True`时，团队会添加一个特殊的工具，允许团队领导更新共享上下文：

```python
# 在Team类中添加上下文共享工具
if self.enable_agentic_context:
    _tools.append(self.get_set_shared_context_function(session_id=session_id))
```

### 团队内存系统

团队内存系统允许团队存储和检索过去的交互、用户记忆和会话摘要。

**主要功能**：

- 存储用户消息和团队响应
- 创建和管理用户记忆
- 生成会话摘要
- 支持跨会话的记忆检索

```python
# 创建团队内存的代码示例
# 创建内存实例
memory = TeamMemory()

# 使用内存创建团队
team = Team(
    name="Memory Team",
    members=[agent1, agent2],
    model=OpenAIChat("gpt-4o"),
    memory=memory,
    enable_user_memories=True,  # 启用用户记忆
    enable_session_summaries=True  # 启用会话摘要
)
```

**内存更新过程**：

```python
# 更新团队内存的代码示例
# 将系统消息添加到内存中
if run_messages.system_message is not None:
    self.memory.add_system_message(run_messages.system_message, system_message_role="system")

# 将用户消息添加到内存中
if run_messages.user_message is not None:
    self.memory.add_messages([run_messages.user_message])

# 更新用户记忆
if self.memory.create_user_memories and run_messages.user_message is not None:
    self.memory.update_memory(input=run_messages.user_message.get_content_string())
```

## 代码示例

以下是一些实际的代码示例，展示了Agno团队系统的不同使用场景。

### 多模态团队示例

以下代码示例展示了一个可以处理多种模态输入（文件、音频、视频）的团队：

```python
# 多模态团队示例
multimodal_team = Team(
    name="Multimodal Team",
    description="A team of agents that can handle multiple modalities",
    members=[file_agent, audio_agent, video_agent],
    model=OpenAIChat(id="gpt-4o"),
    mode="route",  # 使用路由模式
    team_id="multimodal_team",
    success_criteria=dedent("""\
        A comprehensive report with clear sections and data-driven insights.
    """),
    instructions=[
        "You are the lead editor of a prestigious financial news desk! 📰",
    ],
    memory=memory,
    enable_user_memories=True,
    storage=PostgresStorage(
        table_name="multimodal_team",
        db_url=db_url,
        mode="team",
        auto_upgrade_schema=True,
    ),
)
```

### 股票分析团队示例

以下代码示例展示了一个使用协调模式和代理上下文的股票分析团队：

```python
# 股票分析团队示例
team = Team(
    name="Stock Team",
    mode="coordinate",  # 使用协调模式
    model=OpenAIChat("gpt-4o"),
    storage=SqliteAgentStorage(
        table_name="team_sessions", db_file="tmp/persistent_memory.db"
    ),
    members=[stock_searcher, web_searcher],
    instructions=[
        "You can search the stock market for information about a particular company's stock.",
        "You can also search the web for wider company information.",
        "Always add ALL stock or company information you get from team members to the shared team context.",
    ],
    memory=memory,
    enable_agentic_context=True,  # 启用代理上下文
    show_tool_calls=True,
    markdown=True,
    show_members_responses=True,
)
```

### 与Playground集成

Agno团队系统可以与Agno Playground集成，提供了API端点来管理团队会话：

```python
# 团队会话管理API端点
@playground_router.get("/teams/{team_id}/sessions", response_model=List[TeamSessionResponse])
async def get_all_team_sessions(team_id: str, user_id: Optional[str] = Query(None, min_length=1)):
    team = get_team_by_id(team_id, teams)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.storage is None:
        raise HTTPException(status_code=404, detail="Team does not have storage enabled")

    try:
        all_team_sessions: List[TeamSession] = team.storage.get_all_sessions(user_id=user_id, entity_id=team_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving sessions: {str(e)}")
```

## 总结

Agno团队系统是一个强大的框架，允许多个AI代理协同工作来解决复杂任务。它支持三种不同的运行模式（路由、协调和协作），并提供了强大的内存和上下文共享机制。

团队系统的主要组件包括：

- **Team类**：团队的核心实现，负责协调成员和执行任务
- **TeamMemory类**：管理团队的内存和上下文
- **TeamRun类**：表示团队的一次运行记录

代码主要位于`libs/agno/agno/team/team.py`和`libs/agno/agno/memory/team.py`文件中，示例用法可以在cookbook目录下找到。

## 附录：代码参考

以下是团队系统相关的代码参考，包含了Team类的定义和实现细节。

### Team类定义

```python
# 位置：libs/agno/agno/team/team.py

"""
表示代理团队的类。
"""
members: List[Union[Agent, "Team"]]

mode: Literal["route", "coordinate", "collaborate"] = "coordinate"

# 此团队的模型
model: Optional[Model] = None

# --- 团队设置 ---
# 团队名称



# --- 用户提供的上下文 ---
# 用户提供的上下文
context: Optional[Dict[str, Any]] = None
# 如果为True，将上下文添加到用户提示中
add_context: bool = False

# --- 代理知识 ---
knowledge: Optional[AgentKnowledge] = None


# --- 工具 ---
# 如果为True，启用团队代理更新团队上下文并自动将团队上下文发送给成员
enable_agentic_context: bool = False
# 如果为True，将所有先前的成员交互发送给成员
share_member_interactions: bool = False
# 如果为True，添加一个工具来获取有关团队成员的信息
get_member_information_tool: bool = False
# 添加一个工具来搜索知识库（又称代理式RAG）


# 这有助于我们改进Teams实现并提供更好的支持
telemetry: bool = True
```

### Team类初始化方法

```python
def __init__(
    self,
    members: List[Union[Agent, "Team"]],
    mode: Literal["route", "coordinate", "collaborate"] = "coordinate",
    model: Optional[Model] = None,
    name: Optional[str] = None,
    team_id: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    session_name: Optional[str] = None,
    session_state: Optional[Dict[str, Any]] = None,
    add_state_in_messages: bool = False,
    description: Optional[str] = None,
    instructions: Optional[Union[str, List[str], Callable]] = None,
    expected_output: Optional[str] = None,
    additional_context: Optional[str] = None,
    success_criteria: Optional[str] = None,
    markdown: bool = False,
    add_datetime_to_instructions: bool = False,
    add_member_tools_to_system_message: bool = True,

    tool_choice: Optional[Union[str, Dict[str, Any]]] = None,
    response_model: Optional[Type[BaseModel]] = None,
    use_json_mode: bool = False,
    parse_response: bool = True,
    memory: Optional[Union[TeamMemory, Memory]] = None,
    enable_agentic_memory: bool = False,
    enable_user_memories: bool = False,
    add_memory_references: Optional[bool] = None,
    enable_session_summaries: bool = False,
    add_session_summary_references: Optional[bool] = None,
    enable_team_history: bool = False,
    num_of_interactions_from_history: Optional[int] = None,
    num_history_runs: int = 3,
    storage: Optional[Storage] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    reasoning: bool = False,
    reasoning_model: Optional[Model] = None,
    reasoning_min_steps: int = 1,
    reasoning_max_steps: int = 10,
    debug_mode: bool = False,
    show_members_responses: bool = False,
    monitoring: bool = False,
    telemetry: bool = True,
):
    self.members = members
    self.mode = mode
    self.model = model
    self.name = name
    self.team_id = team_id
    self.user_id = user_id
    self.session_id = session_id
    
    log_debug(f"Session ID: {session_id}", center=True)
    self.initialize_team(session_id=session_id)
    
    show_tool_calls = self.show_tool_calls
    
    # 从存储中读取现有会话
    self.read_from_storage(session_id=session_id)
    
    # 如果尚未设置，则初始化内存
    if self.memory is None:
        # 初始化内存逻辑...
```

### 模式特定工具配置

```python
# 准备工具
_tools: List[Union[Toolkit, Callable, Function, Dict]] = []

# 添加提供的工具
if self.tools is not None:
    for tool in self.tools:
        _tools.append(tool)

# 添加内存和上下文相关工具
if self.read_team_history:
    _tools.append(self.get_team_history_function(session_id=session_id))

if isinstance(self.memory, Memory) and self.enable_agentic_memory:
    _tools.append(self.get_update_user_memory_function(user_id=user_id, async_mode=False))

if self.enable_agentic_context:
    _tools.append(self.get_set_shared_context_function(session_id=session_id))

# 根据模式添加特定工具
if self.mode == "route":
    user_message = self._get_user_message(message, audio=audio, images=images, videos=videos, files=files)
    forward_task_func: Function = self.get_forward_task_function(
        message=user_message,
        session_id=session_id,
        stream=stream,
        async_mode=False,
        images=images,
        videos=videos,
        audio=audio,
        files=files,
    )
    _tools.append(forward_task_func)

elif self.mode == "coordinate":
    _tools.append(
        self.get_transfer_task_function(
            session_id=session_id,
            stream=stream,
            async_mode=False,
            images=images,
            videos=videos,
            audio=audio,
            files=files,
        )
    )

elif self.mode == "collaborate":
    run_member_agents_func = self.get_run_member_agents_function(
        session_id=session_id,
        stream=stream,
        async_mode=False,
        images=images,
        videos=videos,
        audio=audio,
        files=files,
    )
    _tools.append(run_member_agents_func)
```

### 内存更新和存储操作

```python
# 更新TeamRunResponse指标
run_response.metrics = self._aggregate_metrics_from_messages(messages_for_run_response)

# 更新团队内存
if isinstance(self.memory, TeamMemory):
    # 将系统消息添加到内存中
    if run_messages.system_message is not None:
        self.memory.add_system_message(run_messages.system_message, system_message_role="system")

    # 构建应添加到TeamMemory的消息列表
    messages_for_memory: List[Message] = (
        [run_messages.user_message] if run_messages.user_message is not None else []
    )
    
    # 创建TeamRun对象
    team_run = TeamRun(response=run_response)
    team_run.message = run_messages.user_message
    
    # 将AgentRun添加到内存中
    self.memory.add_team_run(team_run)
    
    # 计算会话指标
    self.session_metrics = self._calculate_session_metrics(self.memory.messages)

# 保存到存储
self.write_to_storage(session_id=session_id, user_id=user_id)
```

### TeamRun类定义

```python
# 位置：libs/agno/agno/memory/team.py

@dataclass
class TeamRun:
    message: Optional[Message] = None
    member_runs: Optional[List[AgentRun]] = None
    response: Optional[TeamRunResponse] = None

    def to_dict(self) -> Dict[str, Any]:
        message = self.message.to_dict() if self.message else None
        member_responses = [run.to_dict() for run in self.member_runs] if self.member_runs else None
        response = self.response.to_dict() if self.response else None
        return {
            "message": message,
            "member_responses": member_responses,
            "response": response,
        }
```

### 多模态团队示例代码

```python
# 位置：cookbook/playground/teams_demo.py

multimodal_team = Team(
    name="Multimodal Team",
    description="A team of agents that can handle multiple modalities",
    members=[file_agent, audio_agent, video_agent],
    model=OpenAIChat(id="gpt-4o"),
    mode="route",
    team_id="multimodal_team",
    success_criteria="A comprehensive report with clear sections and data-driven insights.",
    instructions=[
        "You are the lead editor of a prestigious financial news desk! 📰",
    ],
    memory=memory,
    enable_user_memories=True,
    storage=PostgresStorage(
        table_name="multimodal_team",
        db_url=db_url,
        mode="team",
        auto_upgrade_schema=True,
    ),
)
```
