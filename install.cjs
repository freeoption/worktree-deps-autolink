#!/usr/bin/env node
const { install } = require('./lib/install.cjs');

install({
    cwd: process.env.INIT_CWD || process.cwd(),
    quiet: process.env.WORKTREE_DEPS_AUTOLINK_QUIET === '1'
}).catch(err => {
    console.error(`[worktree-deps-autolink] ${err.message}`);
    process.exitCode = 1;
});
