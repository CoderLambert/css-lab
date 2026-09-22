# CSS Lab

CSS Lab 是一个专注于 CSS 实践的交互式学习项目。核心学习闭环：

```text
学习概念
→ 编辑 CSS
→ 在隔离 Preview 中即时查看结果
→ 运行 Checker
→ 保存进度
→ 前往下一题
```

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4 + shadcn/Base UI
- CodeMirror 6
- Zod
- IndexedDB via `idb`
- Playwright
- pnpm

## Local development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

入口：

- `/`：产品入口
- `/learn`：自动进入第一个 published exercise
- `/studio`：内容创作区占位入口

## Verification

```bash
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI 会执行 frozen install、lint、build 和 Chromium E2E。

## Architecture

```text
content/
  ↓ FileContentReader + Zod
Server learner routes
  ↓
LearningWorkspace
  ├─ CodeMirror editor
  ├─ sandboxed iframe preview/checker
  ├─ URL-driven Previous/Next navigation
  └─ ProgressStore → idb → IndexedDB
```

主要边界：

- `src/features/learning/`：learner workspace、导航与学习体验
- `src/features/exercise/`：CodeMirror、Preview、Checker runtime
- `src/features/progress/`：progress domain 与 IndexedDB adapter
- `src/lib/content/`：file-backed content domain 与 reader
- `src/components/ui/`：共享 UI primitives

## Content

内容位于：

```text
content/courses/<course>/modules/<module>/lessons/<lesson>/
```

每道 exercise：

```text
exercise.json
fixture.html
base.css
starter.css
solution.css
```

Learner runtime 只读取 published chain。稳定 `id` 与可变 `slug` 分离，exercise `revision` 是 progress compatibility boundary。

`solution.css` 仅用于创作/参考，不进入 learner client runtime。

## Current learner coverage

Flexbox Alignment 目前包含三道 published exercise：

- 水平与垂直居中
- 在主轴上拉开间距
- 沿交叉轴底部对齐

这组内容用于真实覆盖 URL 导航、Checker、IndexedDB completion 与课程进度聚合。
