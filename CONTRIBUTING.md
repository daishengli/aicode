# 贡献指南

感谢您有兴趣为 aicode 贡献代码！🎉

## 开发环境

- Node.js >= 18
- pnpm（推荐）或 npm
- Git

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/daishengli/aicode.git
cd aicode

# 安装依赖
pnpm install

# 跑测试
pnpm test

# 跑单个测试
node --test test/run.js

# 在本地测试 CLI
node bin/aicode.js --version
node bin/aicode.js --help
```

## 提交规范

- 一个 commit 只做一件事
- commit message 格式：`<type>: <subject>`
  - `feat`: 新功能
  - `fix`: Bug 修复
  - `docs`: 文档更新
  - `style`: 代码格式
  - `refactor`: 重构
  - `test`: 测试
  - `chore`: 构建/工具链

示例：
- `feat: 添加 aicode db add-table 命令`
- `fix: 修复 sync 命令在 --tool 为空数组时的误判`

## 项目规则（必须遵守）

> 这些规则是 aicode 项目的核心约束，所有 PR 必须遵守。

1. **系统级字段**：所有 SQL DDL 必须包含 `id, version, deleted, createdBy, createdAt, updatedBy, updatedAt`
2. **无外键**：SQL 不生成外键约束，由应用层控制
3. **中文文件名**：文档文件名保留中文（`YYYY-MM-DD-NNN-需求简述`）
4. **OpenAPI 累积**：在原文件基础上按 path+method 粒度合并，不做历史备份
5. **顶级规则**：项目必须用 git 管理（CI 跑测试要求 git 可用）
6. **复杂逻辑在业务层**：`lib/core/` 写业务，`lib/commands/` 只做参数转发
7. **注释详尽**：所有公开函数必须有 JSDoc 注释

## PR 流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/my-feature`
3. 提交变更：`git commit -m "feat: ..."`
4. 推送到您的 fork：`git push origin feat/my-feature`
5. 创建 PR 到本仓库的 `main` 分支
6. 等待 CI 通过 + 维护者 review

## 报告 Bug

请使用 [Bug 报告 Issue 模板](https://github.com/daishengli/aicode/issues/new?template=bug_report.md)。

## 提出新功能

请使用 [功能建议 Issue 模板](https://github.com/daishengli/aicode/issues/new?template=feature_request.md)。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。
