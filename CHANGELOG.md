# Changelog

所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 规范。

## [0.1.0] - 2026-06-18

### ✨ 新增（Added）

- `aicode init` — 初始化项目级 `.aicode/` 配置 + 自动 git init
- `aicode rule add / list / edit / enable / disable / remove` — 规则管理
- `aicode doc new <需求简述>` — 一条命令产出需求文档 + 设计文档 + MySQL DDL + PostgreSQL DDL + OpenAPI 3 JSON
- `aicode sync` — 编译规则并同步到 Claude Code / codex / opencode
- `aicode doctor` — 环境检查（Node、git、.aicode/、规则、目标文件、openapi.json）
- 内置适配器：Claude Code（CLAUDE.md）、codex（AGENTS.md）、opencode（AGENTS.md）
- 自洽性检查：接口引用 SQL、SQL 引用接口、路径冲突、表冲突、必填字段缺失、编号冲突
- 顶级规则：项目必须用 git 管理（自动 git init + 文档生成后提示提交）
- 系统级字段：所有 SQL DDL 自动包含 `id, version, deleted, createdBy, createdAt, updatedBy, updatedAt`
- 19 个单元测试 + e2e 测试

### 📝 文档（Documentation）

- 需求文档（REQUIREMENTS.md）
- 接口规范（API.md）
- SQL/OpenAPI 生成器设计（docs/SQL/README.md）
- 贡献指南（CONTRIBUTING.md）
- Issue / PR 模板
- CI 工作流（多 Node 版本 × 多平台）

### 🔒 规则（Rules）

- 不使用外键约束，由应用层控制
- 文件名保留中文（`YYYY-MM-DD-NNN-<需求简述>`）
- SQL 每次新增独立文件（带编号，可追溯历史）
- OpenAPI 在原文件基础上增量合并（git 跟踪历史）
