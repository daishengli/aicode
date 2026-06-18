/**
 * 交互式问答工具
 *
 * 职责：在 inquirer 之上做一层封装
 * - 统一错误处理
 * - 支持 --yes 模式跳过交互（使用默认值或抛错）
 * - 提供常用 prompt 的快捷方法
 *
 * 设计原则：所有 prompt 方法返回纯数据，不耦合业务逻辑
 */

const inquirer = require('inquirer');

/**
 * 创建 prompt 实例
 * @param {Object} options
 * @param {boolean} options.yes 是否跳过所有交互（--yes 模式）
 * @returns {Object}
 */
function createPrompt(options = {}) {
  const { yes = false } = options;

  /**
   * 通用 inquirer 调用，--yes 模式下直接抛错（要求调用方传入 default）
   * @param {Object} question inquirer question 对象
   * @returns {Promise<any>}
   */
  async function ask(question) {
    if (yes) {
      if ('default' in question) return question.default;
      throw new Error(`--yes 模式下无法跳过需要输入的项：${question.name || question.message}`);
    }
    const { [question.name]: answer } = await inquirer.prompt(question);
    return answer;
  }

  return {
    /** 文本输入 */
    input: (name, message, opts = {}) => ask({ type: 'input', name, message, ...opts }),

    /** 多行文本 */
    editor: (name, message, opts = {}) => ask({ type: 'editor', name, message, ...opts }),

    /** 数字 */
    number: (name, message, opts = {}) => ask({ type: 'number', name, message, ...opts }),

    /** 单选 */
    list: (name, message, choices, opts = {}) =>
      ask({ type: 'list', name, message, choices, ...opts }),

    /** 确认 */
    confirm: (name, message, opts = {}) =>
      ask({ type: 'confirm', name, message, default: false, ...opts }),

    /** 多选 */
    checkbox: (name, message, choices, opts = {}) =>
      ask({ type: 'checkbox', name, message, choices, ...opts }),

    /** 原始 inquirer 入口（高级场景） */
    raw: ask,
  };
}

module.exports = { createPrompt };
