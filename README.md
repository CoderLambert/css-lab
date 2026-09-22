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
- MDX lesson content with a generated, validated teaching registry
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
- `/studio`：只读内容健康与目录检查

## Verification

```bash
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI 会执行 frozen install、content check、content contract tests、lint、build 和 Chromium E2E。

## Architecture

```text
content/
  ↓ FileContentReader + Zod
Server learner routes
  ├─ lesson.json → Lesson metadata
  ├─ lesson.mdx → generated MDX registry → Server Component slot
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
- `src/features/studio/`：只读内容目录与跨文件 Content Health 审计
- `src/lib/content/`：file-backed content domain 与 reader
- `src/components/ui/`：共享 UI primitives

## Content

内容位于：

```text
content/courses/<course>/modules/<module>/lessons/<lesson>/
```

每个 `lessons/*` 直接子目录都是 Lesson source directory，必须同时包含 `lesson.json + lesson.mdx`。`lesson.json` 由 `FileContentReader` 提供 runtime metadata，`lesson.mdx` 由生成的 registry 提供教学内容。修改或新增 lesson 后运行 `pnpm content:generate`，提交生成文件；提交前运行 `pnpm content:check`。

`exercise.order` 是 learner navigation 的唯一 canonical sequence。effective learner-visible Lesson 的 MDX Exercise references 必须将所有 published Exercise 各引用一次，且顺序完全一致；draft 或因上级发布链而非 learner-visible 的 Lesson 可以暂时引用 draft Exercise。`hidden` 不是 content status。

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

`/studio` 当前提供只读 Content Health：检查 stable ID 重复、同级 order 冲突、published 链遮蔽、空 lesson/fixture、缺失 checks 与重复 check ID。它直接复用 `ContentReader`，不引入 CMS/API/数据库。

## Current learner coverage

Flexbox Alignment 目前包含三道 published exercise：

- 水平与垂直居中
- 在主轴上拉开间距
- 沿交叉轴底部对齐

这组内容用于真实覆盖 URL 导航、Checker、IndexedDB completion 与课程进度聚合。
