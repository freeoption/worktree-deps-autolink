#!/usr/bin/env node
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs/promises');
const { constants } = require('fs');

// 颜色输出
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

/**
 * 执行git命令并返回结果
 */
function runGit(args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        execFile('git', args, { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                code: error ? error.code : 0
            });
        });
    });
}

/**
 * 获取主仓库根目录下的顶层未跟踪文件和目录
 */
async function getTopLevelUntracked(mainRepo) {
    const { stdout, stderr, code } = await runGit(
        ['ls-files', '--others', '--directory', '--no-empty-directory'],
        mainRepo
    );

    if (code !== 0) {
        throw new Error(`获取文件失败: ${stderr}`);
    }

    // 去掉目录末尾的斜杠，过滤出顶层路径（不包含/）
    return stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/\/$/, ''))
        .filter(line => !line.includes('/'));
}

/**
 * 检查文件/目录是否存在
 */
async function exists(path) {
    try {
        await fs.access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function main() {
    // 1. 检查当前目录是否是git仓库
    const { stdout: isWorktree, code: isWorktreeCode } = await runGit([
        'rev-parse',
        '--is-inside-work-tree'
    ]);

    if (isWorktreeCode !== 0 || isWorktree !== 'true') {
        console.error(`${colors.red}❌ 错误：当前目录不是git仓库${colors.reset}`);
        process.exit(1);
    }

    // 2. 定位主仓库（100%可靠的官方方法）
    const currentDir = process.cwd();
    const { stdout: gitCommonDir } = await runGit(['rev-parse', '--git-common-dir']);
    const gitCommonDirAbs = path.resolve(gitCommonDir);
    const mainRepo = path.dirname(gitCommonDirAbs);

    // 验证主仓库存在
    if (!(await exists(mainRepo))) {
        console.error(`${colors.red}❌ 错误：无法找到主仓库目录，检测到的路径: ${mainRepo}${colors.reset}`);
        process.exit(1);
    }

    // 检查是否在worktree中运行
    if (path.resolve(currentDir) === path.resolve(mainRepo)) {
        console.error(`${colors.red}❌ 错误：当前目录是主仓库，不是worktree${colors.reset}`);
        console.error(`${colors.yellow}💡 提示：请在你创建的worktree目录下运行此脚本${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ 找到主仓库: ${mainRepo}${colors.reset}`);

    // 3. 获取顶层未跟踪文件和目录
    console.log(`\n${colors.blue}🔍 正在获取主仓库顶层非git跟踪的文件/目录...${colors.reset}`);

    let untracked;
    try {
        untracked = await getTopLevelUntracked(mainRepo);
    } catch (e) {
        console.error(`${colors.red}❌ ${e.message}${colors.reset}`);
        process.exit(1);
    }

    // 自动排除系统垃圾文件
    const excludeFiles = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
    untracked = untracked.filter(name => !excludeFiles.has(name));

    if (untracked.length === 0) {
        console.log(`${colors.yellow}ℹ️ 主仓库中没有非git跟踪的顶层文件/目录需要链接${colors.reset}`);
        process.exit(0);
    }

    console.log(`\n${colors.blue}🔍 找到 ${untracked.length} 个顶层文件/目录:${colors.reset}`);
    untracked.forEach(name => console.log(`  - ${name}`));

    // 4. 创建软链接
    console.log(`\n${colors.blue}🔗 开始创建软链接...${colors.reset}`);
    let linked = 0;
    let skipped = 0;

    for (const name of untracked) {
        const source = path.join(mainRepo, name);
        const target = path.join(currentDir, name);

        // 检查源是否存在
        if (!(await exists(source))) {
            console.log(`${colors.yellow}⚠️  跳过: ${name} (源文件不存在)${colors.reset}`);
            skipped++;
            continue;
        }

        // 检查目标是否已存在
        if (await exists(target)) {
            console.log(`${colors.yellow}⚠️  跳过: ${name} (目标已存在)${colors.reset}`);
            skipped++;
            continue;
        }

        // 使用相对路径创建软链接（移动worktree后仍有效）
        const relSource = path.relative(currentDir, source);

        // 自动检测是文件还是目录，创建对应类型的软链接
        const stats = await fs.lstat(source);
        const type = stats.isDirectory() ? 'dir' : 'file';

        await fs.symlink(relSource, target, type);

        console.log(`${colors.green}✅ 链接: ${name}${colors.reset}`);
        linked++;
    }

    // 5. 总结
    console.log(`\n${colors.green}🎉 完成！成功链接 ${linked} 个文件/目录，跳过 ${skipped} 个${colors.reset}`);
    console.log(`\n${colors.yellow}💡 提示：删除worktree时使用 git worktree remove ${currentDir}${colors.reset}`);
}

main().catch(err => {
    console.error(`${colors.red}❌ 发生未预期的错误: ${err.message}${colors.reset}`);
    process.exit(1);
});