# aicode

> 跨 AI 编码工具（Claude Code / codex / opencode）的规则管理 + 文档生成 CLI

[![CI](https://github.com/daishengli/aicode/actions/workflows/ci.yml/badge.svg)](https://github.com/daishengli/aicode/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40daishengli1024%2Faicode.svg)](https://www.npmjs.com/package/@daishengli1024/aicode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node >= 18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

## 这是什么

`aicode` 是一个 Node.js CLI 工具，做两件事：

1. **规则管理**：把项目规范（数据库设计、接口设计、代码风格、字典枚举）集中存放在项目级 `.aicode/rules/`
2. **文档生成**：根据规则自动生成需求文档、设计文档、SQL（MySQL/PostgreSQL）、OpenAPI 规范

**核心设计**：规则 = 唯一的真相源。改一处规则，所有生成（SQL、OpenAPI、设计文档）都跟着改。

## ✨ 核心特性

- 📋 **规则集中管理**：`.aicode/rules/*.md`（Markdown + YAML frontmatter）
- 🔄 **跨 AI 工具同步**：一条命令同步到 Claude Code、codex、opencode
- 🛠 **5 阶段文档生成**：`aicode doc new` 一次产出 5 类文档
- 🔍 **自洽性检查**：新需求与已有需求自动比对
- 🇨🇳 **中文友好**：文件名、commit message、文档都支持中文
- 🎯 **预置规则按项目类型**：hasBackend/hasDatabase 决定预置哪些规则

## 📦 安装

```bash
npm install -g @daishengli1024/aicode
```

要求 Node.js >= 18。

## 🚀 快速开始

```bash
# 1. 在项目根目录初始化（询问 hasBackend / hasDatabase）
cd my-project
aicode init

# 2. 同步规则到所有 AI 工具
aicode sync
# → 生成 CLAUDE.md（Claude Code 读取）
# → 生成 AGENTS.md（codex / opencode 读取）

# 3. 新建需求文档（5 阶段流程）
aicode doc new 订单管理
# Stage 1: 多轮交互收集需求
# Stage 2: 自洽性检查
# Stage 3: 生成需求文档
# Stage 4: 生成设计文档（功能/接口/数据库/字典）
# Stage 5: 顺便生成 SQL + OpenAPI

# 4. 环境检查
aicode doctor
```

## 📖 命令一览

| 命令 | 说明 |
|---|---|
| `aicode init` | 初始化 `.aicode/`，询问项目类型 |
| `aicode rule list` | 查看所有规则 |
| `aicode rule add` | 新增规则（交互式） |
| `aicode rule edit <name>` | 编辑规则 |
| `aicode rule enable <name>` | 启用规则 |
| `aicode rule disable <name>` | 禁用规则 |
| `aicode rule remove <name>` | 删除规则 |
| `aicode doc new <需求>` | 5 阶段一体化生成 |
| `aicode sync` | 编译规则并同步到 AI 工具 |
| `aicode doctor` | 环境检查 |

## 🎯 预置规则（按项目类型自动选）

| 规则 | 含结构化 frontmatter | 适用 |
|---|---|---|
| `db-design.md` | `sqlRules` | 有数据库项目 |
| `api-design.md` | `apiRules` | 有服务端项目 |
| `feature-design.md` | `featureRules` | 无服务端项目（CLI / 库） |
| `dictionary-design.md` | `dictionaryRules` | 总是需要 |
| `code-style.md` | 纯说明 | 总是需要 |

## 🔄 规则的双重身份

**作为开发规范**：规则 body 是给 AI 读的说明文档（"为什么这么做"）

**作为生成约束**：规则 frontmatter 是给 aicode 读的结构化字段（"怎么生成 SQL/OpenAPI"）

```markdown
---
name: db-design
sqlRules:           # ← 机器读
  systemFields: [...]
  foreignKey: false
  charset: utf8mb4
---

# 数据库设计规范   # ← AI 读
- 不使用外键约束
- ...
```

## 📚 文档

- [需求文档](docs/REQUIREMENTS.md) — aicode 自身的功能需求
- [接口规范](docs/API.md) — CLI 命令详细规范

## 🧪 开发

```bash
git clone https://github.com/daishengli/aicode.git
cd aicode
pnpm install
pnpm test
node bin/aicode.js --version
```

## 🤝 贡献

欢迎 PR！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

MIT © aicode contributors
