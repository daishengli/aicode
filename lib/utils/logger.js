/**
 * 日志输出工具
 *
 * 职责：统一所有 CLI 输出的格式和颜色
 * - 成功：绿色 ✓
 * - 信息：蓝色 [INFO]
 * - 警告：黄色 [WARN]
 * - 错误：红色 [ERROR]（必带修复建议）
 *
 * 设计原则：纯函数，不持有状态，全局配置（颜色开关）通过参数传递
 */

const chalk = require('chalk');

/**
 * 创建 logger 实例
 * @param {Object} options 配置
 * @param {boolean} options.color 是否启用颜色（默认 true，受 --no-color 全局选项控制）
 * @returns {Object} logger 实例
 */
function createLogger(options = {}) {
  const { color = true } = options;

  // 颜色辅助：禁用时返回原字符串
  const green = (s) => (color ? chalk.green(s) : s);
  const blue = (s) => (color ? chalk.blue(s) : s);
  const yellow = (s) => (color ? chalk.yellow(s) : s);
  const red = (s) => (color ? chalk.red(s) : s);
  const gray = (s) => (color ? chalk.gray(s) : s);
  const bold = (s) => (color ? chalk.bold(s) : s);

  return {
    /**
     * 成功消息（stdout，绿色 ✓）
     * @param {string} msg
     */
    success(msg) {
      console.log(green('✓') + ' ' + msg);
    },

    /**
     * 信息消息（stderr，蓝色 [INFO]）
     * @param {string} msg
     */
    info(msg) {
      console.error(blue('[INFO]') + ' ' + msg);
    },

    /**
     * 警告消息（stderr，黄色 [WARN]）
     * @param {string} msg
     * @param {string} [suggestion] 修复建议，会以 → 建议：xxx 形式追加
     */
    warn(msg, suggestion) {
      let line = yellow('[WARN]') + ' ' + msg;
      if (suggestion) line += '\n  ' + gray('→ 建议：') + suggestion;
      console.error(line);
    },

    /**
     * 错误消息（stderr，红色 [ERROR]）
     * @param {string} msg
     * @param {string} [suggestion] 修复建议
     */
    error(msg, suggestion) {
      let line = red('[ERROR]') + ' ' + msg;
      if (suggestion) line += '\n  ' + gray('→ 建议：') + suggestion;
      console.error(line);
    },

    /**
     * 普通输出（stdout，无前缀）
     * @param {string} msg
     */
    print(msg) {
      console.log(msg);
    },

    /**
     * 表格输出（简单的等宽对齐）
     * @param {string[][]} rows 第一行是表头
     */
    table(rows) {
      if (!rows || rows.length === 0) return;
      const widths = rows[0].map((_, i) =>
        Math.max(...rows.map((r) => String(r[i] ?? '').length))
      );
      const fmt = (row) =>
        row.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join('  ');
      this.print(fmt(rows[0]));
      this.print(gray(widths.map((w) => '-'.repeat(w)).join('  ')));
      rows.slice(1).forEach((row) => this.print(fmt(row)));
    },

    // 暴露颜色函数供特殊场景使用
    _colors: { green, blue, yellow, red, gray, bold },
  };
}

module.exports = { createLogger };
