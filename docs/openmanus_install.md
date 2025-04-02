
## 安装指南

### 方法一：使用 conda

```bash
conda create -n open_manus python=3.12
conda activate open_manus
```

```bash
git clone https://github.com/mannaandpoem/OpenManus.git
cd OpenManus
pip install -r requirements.txt
```

### 方法二：使用 uv（推荐）

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/mannaandpoem/OpenManus.git
cd OpenManus
uv venv --python 3.12
source .venv/bin/activate  # Unix/macOS
# .venv\Scripts\activate  # Windows
uv pip install -r requirements.txt
```

## 配置指南

创建配置文件：

```bash
cp config/config.example.toml config/config.toml
```

编辑 `config/config.toml` 文件，添加 API 密钥：

```toml
[llm]
model = "gpt-4o"
base_url = "https://api.openai.com/v1"
api_key = "sk-..."  # 替换为您的 API 密钥
max_tokens = 4096
temperature = 0.0
```

## 快速开始

运行以下命令启动 OpenManus：

```bash
python main.py
```
