/**
 * 同步引擎
 *
 * 职责：把编译后的规则同步到 AI 工具的项目级规则文件
 * 流程：
 *   1. 读取配置和规则
 *   2. 按 target 分组
 *   3. 调用 rule-compiler 编译
 *   4. 写入中间产物 .aicode/compiled/<tool>.md
 *   5. 通过适配器写入目标文件（先备份）
 *
 * 设计原则：核心流程在此，业务层可传入 dryRun 等参数控制
 */

const path = require('path');
const fsUtil = require('../utils/fs');
const configCore = require('./config');
const ruleStore = require('./rule-store');
const compiler = require('./rule-compiler');
const toolRegistry = require('./tool-registry');

/**
 * 同步到所有（指定）工具
 * @param {string} projectRoot
 * @param {Object} [options]
 * @param {string[]} [options.tools] 工具名列表，不传则用 config 中 enabled 的全部
 * @param {boolean} [options.dryRun] 仅预览，不写文件
 * @param {boolean} [options.backup] 是否备份已存在的目标文件（默认 true）
 * @returns {Promise<{ results: Array<{ tool, target, ruleCount, status, backup? }> }>}
 */
async function sync(projectRoot, options = {}) {
  const { tools, dryRun = false, backup = true } = options;
  const config = await configCore.readOrDefault(projectRoot);
  const rules = await ruleStore.list(projectRoot);

  // 确定要同步的工具列表
  const targetTools = tools
    ? tools.map((t) => toolRegistry.get(t)).filter(Boolean)
    : toolRegistry.list().filter((a) => config.tools[a.name]?.enabled);

  const results = [];
  for (const adapter of targetTools) {
    // 过滤出 targets 包含此工具的启用规则
    const filtered = rules.filter(
      (r) => r.frontmatter.enabled && r.frontmatter.targets?.includes(adapter.name)
    );
    const compiled = compiler.compile(filtered, {
      toolName: adapter.name,
      toolDisplayName: adapter.displayName,
    });

    const targetPath = adapter.getTargetPath(projectRoot);
    const result = {
      tool: adapter.name,
      target: targetPath,
      ruleCount: filtered.length,
      status: 'ok',
    };

    if (dryRun) {
      result.status = 'preview';
      results.push(result);
      continue;
    }

    // 1. 写中间产物
    const compiledPath = path.join(
      fsUtil.paths(projectRoot).compiledDir,
      `${adapter.name}.md`
    );
    await fsUtil.writeText(compiledPath, compiled);

    // 2. 备份目标文件（如有）
    if (backup && (await fsUtil.exists(targetPath))) {
      const backupPath = await fsUtil.backupFile(targetPath);
      result.backup = backupPath;
    }

    // 3. 写入目标文件
    await fsUtil.writeText(targetPath, compiled);
    results.push(result);
  }

  return { results };
}

module.exports = { sync };
