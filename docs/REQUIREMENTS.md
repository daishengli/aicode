# 需求文档

> 项目：aicode
> 版本：0.1.0
> 最后更新：2026-06-18

## 1. 项目背景

### 1.1 问题陈述

在使用 AI 编码工具（Claude Code、codex、opencode 等）开发时，需要一套统一的项目级规范（数据库设计、接口设计、代码风格、字典枚举等），并希望这些规范：

1. 在**所有 AI 工具**下默认生效
2. 决定**文档生成**的方式（SQL、OpenAPI、需求文档、设计文档）

目前没有现成的工具，开发者需要：
- 在每个 AI 工具的配置目录各放一份规范（容易漂移）
- 手动写 SQL、OpenAPI（容易违反自己的规范）

### 1.2 项目目标

`aicode` 是一个**规则管理 + 文档生成工具**：
- 把规范集中放在项目级 `.aicode/rules/*.md`
- 一条命令同步到所有 AI 工具
- 一条命令根据规则自动生成需求文档、设计文档、SQL、OpenAPI、字典

### 1.3 核心设计

**aicode 的核心 = 规则驱动生成**：
- 规则是**唯一的真相源**（single source of truth）
- 改一处规则，所有生成（SQL、OpenAPI、设计文档）都跟着改

**预置规则的双重身份**：
| 角色 | 说明 |
|---|---|
| 开发规范 | 给 AI 工具读（CLAUDE.md / AGENTS.md 的内容） |
| 生成约束 | 机器可读的结构化规则（frontmatter），控制怎么生成 SQL、OpenAPI、设计文档 |

## 2. 范围

### 2.1 In Scope（v0.1.0 MVP）

| 模块 | 说明 |
|---|---|
| 规则管理 | 增删改查、启用/禁用 |
| 规则格式 | Markdown + YAML frontmatter（含结构化规则） |
| 跨工具同步 | Claude Code（CLAUDE.md）、codex（AGENTS.md）、opencode（AGENTS.md） |
| 预置规则 | db-design / api-design / feature-design / dictionary-design / code-style |
| 项目类型 | 询问 hasBackend / hasDatabase，按需预置规则 |
| git 集成 | 已有 git 仓库 → 跳过 init（不再强制） |
| **5 阶段 doc new** | 多轮交互收集需求 → 自洽性检查 → 需求文档 → 设计文档（功能/接口/数据库/字典）→ 顺便生成 SQL + OpenAPI |
| 字典 | 集中管理枚举值，追加到 `.aicode/docs/dictionary.md` |
| 自洽性检查 | 与已有需求比对，命名冲突检测 |
| 环境检查 | `aicode doctor` |

### 2.2 Out of Scope（后续迭代）

| 模块 | 版本规划 |
|---|---|
| `aicode doc regen` 从设计文档重新生成 SQL/OpenAPI | v0.2 |
| 团队规则共享 | v0.3 |
| 云端规则市场 | v1.0 |

## 3. 功能需求

### 3.1 规则管理
- 规则以 Markdown 文件存储，frontmatter 存元信息 + 结构化规则
- 支持交互式增删改查、启用/禁用
- 系统级字段：name、category、enabled、targets、description、version、deleted、createdBy、createdAt、updatedBy、updatedAt

### 3.2 跨工具同步
- 默认支持 Claude Code、codex、opencode
- 同步时合并所有 enabled 规则
- 支持 `--tool`、`--dry-run` 选项

### 3.3 一体化文档生成
- `aicode doc new` 一条命令产出：
  - 需求文档
  - 功能设计文档
  - 接口设计文档（如有 hasBackend）
  - 数据库设计文档（如有 hasDatabase）
  - 字典（可选）
  - MySQL DDL（如有 hasDatabase 且有表）
  - PostgreSQL DDL（如有 hasDatabase 且有表）
  - OpenAPI JSON（如有 hasBackend）
- 多轮交互收集需求细节
- 自洽性检查（与已有需求比对）

### 3.4 预置规则（5 份）
| 规则 | frontmatter 结构化字段 |
|---|---|
| `db-design.md` | `sqlRules`（系统级字段、外键、字符集、引擎、命名） |
| `api-design.md` | `apiRules`（响应包装、错误码、auth、pathPrefix） |
| `feature-design.md` | `featureRules`（入参、出参、业务描述、验收标准） |
| `dictionary-design.md` | `dictionaryRules`（枚举规范、命名） |
| `code-style.md` | 纯说明 |

### 3.5 git 集成
- `aicode init` 检测已有 git 仓库 → 跳过 `git init`
- `aicode doc new` 完成后提示 git 提交

## 4. 非功能需求

| ID | 需求 | 说明 |
|---|---|---|
| NFR-01 | 性能 | `aicode sync` 在 100 条规则下 < 500ms |
| NFR-02 | 可移植 | 纯 JavaScript，跨 macOS / Linux / Windows |
| NFR-03 | 零配置启动 | `aicode init` 后即可使用 |
| NFR-04 | 离线可用 | 不发起任何网络请求 |
| NFR-05 | 规则可改 | 所有内置规则 = 预置规则，用户可改可删可加 |
| NFR-06 | 错误友好 | 所有错误信息带修复建议 |
| NFR-07 | 中文友好 | 文件名、commit message、文档都支持中文 |

## 5. 约束

| ID | 约束 | 说明 |
|---|------|------|
| C-01 | 纯 JavaScript（ES2022+） | 不引入 TypeScript |
| C-02 | 不污染全局 | 数据存项目内 `.aicode/` |
| C-03 | Node >= 18 | commander 11 / fs-extra 11 / inquirer 8 最低要求 |
| C-04 | 不调 LLM | CLI 本身不做 AI 推理 |
| C-05 | 不发外部请求 | 完全本地运行 |
| C-06 | AI 工具规则文件位置 | Claude Code→CLAUDE.md、codex/opencode→AGENTS.md |
| C-07 | 已有 git 仓库不强制 init | 检测到已有则跳过 |
| C-08 | 规则即生成规则 | 所有 SQL/OpenAPI 规则都从规则文件读取，不硬编码 |
