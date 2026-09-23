# Front-end Lab Platform

这是一个面向前端学习实验的交互式平台。当前正式课程仍是 **CSS Lab**。M6B source tree 已 rebaseline 为 **9 Modules / 32 Lessons / 100 Exercises**，其中稳定核心仍只有 **1 published Lesson / 3 published Exercises**；其余课程保持 draft。底层继续使用 M6A 的 content-defined Workspace：

```text
学习概念
→ 编辑 Workspace 中允许修改的 HTML / CSS 文件
→ 在隔离 Browser Runtime 中观察结果
→ 运行 Browser DOM Checker
→ 保存 Draft / completion
→ 前往下一题
```

JavaScript Runtime、TypeScript Toolchain 尚未实现。

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4 + shadcn/Base UI
- CodeMirror 6（HTML / CSS）
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
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI 对 `main` 与指向 `main` 的 Pull Request 执行 frozen install、authoring/content checks、lint、build 和 Chromium E2E。

## Architecture

```text
Content
→ Workspace
→ optional Toolchain
→ optional Runtime
→ Checker
→ Progress / Learning Shell
```

M6A 当前实际链路：

```text
exercise.json + starter/
  ↓ FileContentReader + Zod
ExerciseWorkspace
  ↓ useExerciseProgress
ExerciseDraft
  ↓ createExecutionSnapshot
ExecutionSnapshot
  ↓ Browser Runtime
sandboxed iframe + Browser DOM Checker
  ↓
ProgressStore → idb → IndexedDB v2
```

主要边界：

- `src/features/learning/`：learner shell、MDX teaching flow、导航与 check lifecycle
- `src/features/exercise/workspace/`：Workspace Editor（content-defined HTML / CSS editable files）
- `src/features/exercise/runtime/browser/`：Browser Runtime、CSP、protocol、DOM Checker
- `src/features/progress/`：Workspace Draft / completion 与 IndexedDB v2
- `src/features/studio/`：只读 Content Health / source health
- `src/lib/content/`：file-backed content domain 与 secure reader
- `src/lib/workspace/`：Workspace / Draft / ExecutionSnapshot domain
- `src/components/ui/`：共享 UI primitives

Browser Runtime 的 `runtime.entry` 是 **HTML fragment**，不是完整 HTML document。Runtime 自己拥有 document shell、CSP、CSS slots 与 bridge。当前 Runtime 只执行 HTML + CSS；schema 中出现 JavaScript / TypeScript vocabulary 不代表已有对应执行能力。

## Content

内容位于：

```text
content/courses/<course>/modules/<module>/lessons/<lesson>/
```

每个 Lesson source directory 必须包含 `lesson.json + lesson.mdx`。Lesson teaching content 继续通过 generated MDX registry 渲染；`Concept / Predict / Compare / Exercise` 是 MDX Learning Flow v1 的受控 Activity。

`exercise.order` 是 learner navigation 的 canonical sequence。状态 vocabulary 只有：

```text
draft | published
```

`hidden` 不是 content status。

每道 Exercise 使用 schemaVersion 2：

```text
exercise.json
starter/
  index.html
  base.css
  style.css
solution/
  style.css
```

`exercise.json` 声明固定 Workspace file set、language、editable 与 Browser entry。learner 不能 create/delete/rename files。locked file 不是 secret，也不能用于隐藏 solution。

`solution/` 只供 Studio / server-side authoring inspection 使用，永不进入 learner Exercise、Draft、ExecutionSnapshot 或 Browser Runtime。

当前 CSS Foundations v1 的 100 个 Exercise 都使用 Exercise v2 Workspace contract，并保持课程选择的 fixed HTML + CSS-only authoring：

- `index.html` locked
- `base.css` locked
- `style.css` editable

只有既有 Flexbox alignment 的 3 个 Exercise 进入 published learner chain；其余 draft 内容即使已进入 generated MDX registry，也不能通过 learner route 打开。capability-gap draft Exercise 可能没有 checks，这会作为 Studio warning 保留，不会用弱 checker 伪造覆盖。

平台本身已支持 content 把 HTML 标记为 editable；首个真实 HTML-editable curriculum PR 必须补正式 learner-route E2E。

## Progress compatibility

IndexedDB contract：

```text
database = css-lab
version  = 2
store    = exercise-progress
key      = [exerciseId, revision]
```

Progress 只保存 learner-owned mutable Draft files 和 completion achievement，不保存 locked files、active tab、hint/UI state。

M6A 是 forward migration。生产环境一旦打开 DB v2 / Exercise v2：

- rollback/hotfix 仍必须理解 Exercise schema v2；
- rollback/hotfix 仍必须能打开 IndexedDB version 2；
- 不得用 `DATABASE_VERSION = 1` 或 `deleteDatabase` 作为回滚手段；
- 可以关闭有问题的新 UI/Runtime path，但 content/storage compatibility 必须保持向前兼容。

## Current and planned scope

当前已实现：

- CSS curriculum
- content-defined HTML/CSS Workspace
- Workspace Draft
- Browser Runtime
- Browser DOM checks
- IndexedDB draft/progress v2
- Studio workspace/source health

计划中、尚未实现：

- JavaScript Worker Runtime
- JavaScript Browser Runtime
- TypeScript Toolchain
- TypeScript no-runtime/type-check workflow

项目不会因为 Workspace 平台化而自动扩展为 generic cloud IDE、VFS、terminal、npm/WebContainer 或 arbitrary package runtime。
