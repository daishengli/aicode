/**
 * Git 操作工具
 *
 * 职责：封装 aicode 需要的 git 子命令调用
 * - 检测是否为 git 仓库
 * - git init
 * - git add + git commit
 *
 * 设计原则：通过子进程调用 git，错误用 try/catch 捕获；不引入第三方 npm 包
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const pExecFile = promisify(execFile);

/**
 * 执行 git 命令
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
async function git(args, cwd) {
  try {
    const { stdout, stderr } = await pExecFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    return { stdout: (stdout || '').trim(), stderr: (stderr || '').trim() };
  } catch (err) {
    // execFile 失败时，stderr 在 err.stderr
    throw new Error(err.stderr || err.message);
  }
}

/**
 * 检测当前目录是否为 git 仓库
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
async function isGitRepo(cwd) {
  try {
    await git(['rev-parse', '--is-inside-work-tree'], cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检测 git 是否安装
 * @returns {Promise<boolean>}
 */
async function isGitInstalled() {
  try {
    await git(['--version'], os.tmpdir());
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保是 git 仓库（不是则自动 init）
 * @param {string} cwd
 * @returns {Promise<{ wasRepo: boolean, initialized: boolean }>}
 */
async function ensureGitRepo(cwd) {
  if (await isGitRepo(cwd)) {
    return { wasRepo: true, initialized: false };
  }
  await git(['init'], cwd);
  return { wasRepo: false, initialized: true };
}

/**
 * 获取当前系统用户名
 * @returns {string}
 */
function currentUser() {
  try {
    return os.userInfo().username || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 提交文件
 * @param {string} cwd
 * @param {string[]} files 要 add 的文件（相对 cwd 的路径）
 * @param {string} message commit message
 * @returns {Promise<{ hash: string }>}
 */
async function commitFiles(cwd, files, message) {
  await git(['add', ...files], cwd);
  await git(['commit', '-m', message], cwd);
  const { stdout: hash } = await git(['rev-parse', '--short', 'HEAD'], cwd);
  return { hash };
}

module.exports = {
  git,
  isGitRepo,
  isGitInstalled,
  ensureGitRepo,
  currentUser,
  commitFiles,
};
