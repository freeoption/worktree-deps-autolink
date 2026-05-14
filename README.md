# worktree-deps-autolink

安装后自动注入 Git hook：当执行 `git worktree add` 创建新 worktree 时，自动运行 `link-untracked.cjs`，把主 worktree 顶层未跟踪文件/目录软链接到新 worktree。

## 使用

```sh
npm install -D worktree-deps-autolink
```

安装脚本会在当前仓库设置：

```sh
git config core.hooksPath <main-repo>/.git/worktree-deps-autolink/_
```

也可以手动执行：

```sh
npx worktree-deps-autolink install
npx worktree-deps-autolink status
npx worktree-deps-autolink uninstall
```

## 触发条件

注入的是 `post-checkout` hook，仅在以下条件都满足时执行链接脚本：

- `post-checkout` 的第三个参数为 `1`
- 第一个参数是全零 revision，即新 worktree 的首次 checkout
- 未设置 `WORKTREE_DEPS_AUTOLINK=0`

## 跳过安装或执行

```sh
WORKTREE_DEPS_AUTOLINK=0 npm install
WORKTREE_DEPS_AUTOLINK=0 git worktree add ../foo
```

如果安装前已经配置过 `core.hooksPath`，生成的 hook 会在执行完自动链接逻辑后继续调用原 `post-checkout` hook。
