/**
 * aicode rule add 命令
 */

const ruleStore = require('../../core/rule-store');
const md = require('../../utils/markdown');

async function execute(args, options, ctx) {
  const { logger, prompt } = ctx;
  const { cwd, name: preName, category: preCategory, targets: preTargets, file: importFile, yes } = options;

  // 1. 名称
  const name = preName || (await prompt.input('name', '规则名称（kebab-case，如 db-design）'));
  if (!md.isKebabCase(name)) {
    logger.error('名称必须为 kebab-case', '使用 - 分隔的小写字母和数字，如 db-design');
    process.exit(2);
  }
  const existing = await ruleStore.get(cwd, name);
  if (existing) {
    logger.error(`规则 ${name} 已存在`, 'aicode rule edit <name> 修改');
    process.exit(1);
  }

  // 2. 分类
  const category = preCategory || (await prompt.list('category', '分类', ['backend', 'frontend', 'general', 'custom']));

  // 3. 描述
  const description = await prompt.input('description', '一句话描述', { default: '' });

  // 4. 目标工具
  const targets = preTargets
    ? preTargets.split(',').map((t) => t.trim())
    : await prompt.checkbox('targets', '目标 AI 工具', [
        { name: 'claude-code', value: 'claude-code', checked: true },
        { name: 'codex', value: 'codex', checked: true },
        { name: 'opencode', value: 'opencode', checked: true },
      ]);

  // 5. 规则内容
  let body = '';
  if (importFile) {
    body = (await require('../../utils/fs').readText(importFile)) || '';
  } else {
    const useEditor = await prompt.confirm('editor', '使用外部编辑器编辑规则内容？', { default: false });
    if (useEditor) {
      body = await prompt.editor('body', '规则内容');
    } else {
      body = await prompt.input('body', '规则内容（单行简要版，可后续 aicode rule edit 修改）', { default: 'TODO' });
    }
  }

  // 6. 创建
  const { file } = await ruleStore.create(cwd, { name, category, description, targets, body });
  logger.success(`规则 ${name} 已添加 → ${file}`);
}

module.exports = { execute };
