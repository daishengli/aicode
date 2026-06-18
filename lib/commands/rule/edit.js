/**
 * aicode rule edit 命令
 */

const ruleStore = require('../../core/rule-store');

async function execute(args, options, ctx) {
  const { logger, prompt } = ctx;
  const { cwd } = options;
  const name = args.name;
  const { field, body } = options;

  const rule = await ruleStore.get(cwd, name);
  if (!rule) {
    logger.error(`规则 ${name} 不存在`, 'aicode rule list 查看');
    process.exit(1);
  }

  let patch = {};
  if (field) {
    // --field key=value，可多次
    const fields = Array.isArray(field) ? field : [field];
    for (const f of fields) {
      const [k, v] = f.split('=');
      if (!k || v === undefined) {
        logger.error(`--field 格式错误: ${f}，应为 key=value`);
        process.exit(2);
      }
      patch[k] = parseValue(v);
    }
  }

  let newBody;
  if (body) {
    newBody = await prompt.editor('body', '规则内容');
  }

  const result = await ruleStore.update(cwd, name, patch, newBody);
  if (!result) {
    logger.error(`更新失败：${name}`);
    process.exit(1);
  }
  logger.success(`规则 ${name} 已更新（version: ${result.version - 1} → ${result.version}）`);
}

function parseValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (v.includes(',')) return v.split(',').map((s) => s.trim());
  return v;
}

module.exports = { execute };
