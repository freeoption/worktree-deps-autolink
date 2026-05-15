#!/usr/bin/env node
const { install, uninstall, printStatus } = require('../lib/install.cjs');

const command = process.argv[2] || 'link';

async function main() {
    if (command === 'link' || command === 'run') {
        require('../link-untracked.cjs');
        return;
    }

    if (command === 'install' || command === 'init') {
        await install({ cwd: process.cwd(), quiet: false });
        return;
    }

    if (command === 'uninstall') {
        await uninstall({ cwd: process.cwd(), quiet: false });
        return;
    }

    if (command === 'status') {
        await printStatus({ cwd: process.cwd() });
        return;
    }

    console.error(`Unknown command: ${command}`);
    console.error('Usage: worktree-deps-autolink [link|run|install|init|uninstall|status]');
    process.exitCode = 1;
}

main().catch(err => {
    console.error(`[worktree-deps-autolink] ${err.message}`);
    process.exitCode = 1;
});
