# MDX Learning Flow v1 — 执行总计划与 Codex 编排

## 0. 文档定位

本任务包用于把当前分支：

```text
feat/mdx-learning-flow-demo
```

从“可运行 Demo”收敛为可以作为正式产品基线合入 `main` 的：

```text
MDX Learning Flow v1
```

**本任务包不是 M6A。**

完成本任务包后才允许：

```text
MDX Learning Flow v1
→ 独立审核
→ 合入 main
→ 基于最新 main 修订 M6A 必要章节
→ 再启动 M6A Task 01
```

禁止在本任务包内提前实现 Workspace v2、HTML Editor、Browser Runtime v2、JS/TS Runtime、Checker Registry 等 M6A 或后续能力。

---

## 1. 当前基线

执行开始前必须确认：

```text
branch: feat/mdx-learning-flow-demo
```

当前已经验证并应保留的产品能力：

- Lesson 使用 `lesson.mdx` 展示教学内容。
- MDX 教学 primitive：
  - `Concept`
  - `Predict`
  - `Compare`
  - `Exercise`
- 全屏 Learning Workspace。
- progressive hints。
- Preview viewport presets / responsive preview。
- structured checker diagnostics。
- 现有 3 个 CSS exercises。
- learner navigation / progress / checker / formatter。
- 当前 Playwright learner runtime 覆盖。

这些是**需要保留的产品行为**，但底层实现仍允许按本任务文档收敛。

---

## 2. 本轮必须解决的架构问题

### P0 — Lesson 正文存在双路径

当前同时存在：

```text
FileContentReader
→ read lesson.mdx
→ Lesson.bodyMdxSource
→ learner 实际不渲染

以及

lesson-content-registry.tsx
→ static import lesson.mdx
→ learner 实际渲染
```

正式基线禁止存在两个事实源。

目标：

```text
lesson.json
→ Lesson runtime metadata

lesson.mdx
→ build-time/static teaching content module

FileContentReader
→ 不读取 MDX 正文

generated registry
→ learner 渲染 MDX
```

### P0 — Registry 目前手工维护

当前 `lesson-content-registry.tsx` 使用手工 import + switch。

目标：

```text
content tree
→ deterministic generator
→ generated registry
```

新增 Lesson 不允许要求修改 application source。

### P0 — MDX 目前没有真正形成受控教学 DSL

`useMDXComponents()` 只提供组件映射，不能阻止课程作者：

```mdx
import Whatever from "@/..."
export ...
<UnknownComponent />
{arbitraryExpression()}
```

目标：

- 禁止 MDX import/export。
- 禁止任意 flow/text JS expression。
- JSX component 只允许白名单。
- JSX props 必须满足 v1 静态 authoring contract。
- Lesson MDX 禁止一级标题。

### P1 — Exercise Activity 与 learner URL 强耦合

当前：

```mdx
<Exercise
  href="/learn/css-foundations/flexbox/flexbox-alignment/center-box"
  ...
/>
```

目标：

```mdx
<Exercise
  slug="center-box"
  label="水平与垂直居中"
  goal="..."
/>
```

`Exercise` 只引用同 Lesson 的 exercise slug。

### P1 — 旧 Markdown 链路残留

正式 MDX 基线建立后删除：

```text
src/features/learning/components/lesson-markdown.tsx
react-markdown
```

不得长期双栈维护 Markdown Renderer + MDX Renderer。

---

## 3. 最终架构

完成后应为：

```text
content/
└── courses/
    └── <course>/
        └── modules/
            └── <module>/
                └── lessons/
                    └── <lesson>/
                        ├── lesson.json
                        ├── lesson.mdx
                        └── exercises/
```

职责：

```text
lesson.json
= runtime/domain metadata

lesson.mdx
= teaching narrative + approved learning activities

exercise.json
= machine-verifiable exercise contract

fixture/base/starter/solution
= 当前 Exercise v1 assets（本轮不迁移）

generated lesson registry
= build-time MDX module lookup

FileContentReader
= metadata/exercise hydration，不读取 MDX 正文

LessonContentInspector
= server-only source facts，用于 Studio Content Health
```

---

## 4. 执行依赖图

严格按以下 DAG 执行：

```text
Baseline Audit
     │
     ▼
Task 01 — Lesson Content Contract / Source Boundary
     │
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
Task 02              Task 03             Task 04
Registry             MDX Contract        Activity v1
Generator            / Compile Rules     / Exercise Ref API
     └──────────────────┴──────────────────┘
                        │
                        ▼
Task 05 — Content Check / Studio / Cleanup
                        │
                        ▼
Task 06 — Integration / E2E / Independent Review
                        │
                        ▼
Merge-ready
```

Task 02 / 03 / 04 是本轮主要并行区。

---

## 5. Codex 子 Agent 编排要求

### 5.1 主 Agent 职责

主 Codex 必须：

1. 先读取本文件和全部 Task 文档。
2. 确认当前分支，不允许在 `main` 直接开发。
3. 执行 Baseline Audit。
4. 串行完成 Task 01。
5. Task 01 验证通过后，**必须启动 3 个独立子 Agent 并行执行 Task 02 / 03 / 04**。
6. 子 Agent 返回后逐份审查 diff，不得盲目接受。
7. 解决集成问题后串行执行 Task 05。
8. Task 06 阶段再启动两个 read-only review 子 Agent 并行独立审核。
9. 主 Agent 负责最终修复、完整验证和报告。

### 5.2 并行 Wave 1 文件所有权

为避免并发冲突，三个子 Agent 不得越界修改。

#### Agent A — Task 02

唯一主要写权限：

```text
scripts/content/lesson-manifest.mjs
scripts/content/lesson-registry-source.mjs
scripts/content/generate-lesson-content-registry.mjs
src/features/learning/generated/lesson-content-registry.tsx
src/app/learn/[courseSlug]/[moduleSlug]/[lessonSlug]/[exerciseSlug]/page.tsx
```

不得修改：

```text
package.json
pnpm-lock.yaml
next.config.ts
src/mdx-components.tsx
lesson.mdx
MDX Activity components
```

#### Agent B — Task 03

唯一主要写权限：

```text
scripts/mdx/remark-lesson-contract.mjs
next.config.ts
src/mdx-components.tsx
```

不得修改：

```text
package.json
pnpm-lock.yaml
generated registry
lesson.mdx
ExerciseActivity
learner page
```

#### Agent C — Task 04

唯一主要写权限：

```text
src/features/learning/components/mdx/lesson-activity-components.tsx
content/**/lesson.mdx
与 Activity API 直接相关的 learner E2E 断言
```

不得修改：

```text
package.json
pnpm-lock.yaml
next.config.ts
registry generator
generated registry
FileContentReader
Studio health
```

### 5.3 并发冲突处理

如果某子任务发现必须修改其他 Agent 所拥有文件：

- 不直接修改。
- 在完成报告中列出“integration request”。
- 由主 Agent 在并行 Wave 结束后统一处理。

尤其禁止三个 Agent 同时修改：

```text
package.json
pnpm-lock.yaml
```

所有 dependency/script 调整统一由 Task 05 主 Agent 串行完成。

---

## 6. Baseline Audit

开发前主 Agent 必须执行：

```bash
git status --short
git branch --show-current
git log -1 --oneline
git diff main...HEAD --stat
pnpm lint
pnpm build
pnpm test:e2e
```

并全局搜索：

```text
bodyMdxSource
lesson-content-registry
lesson-markdown
react-markdown
lesson.mdx
<Exercise
href="/learn
alsoAccepts
css-lab-parent
css-lab-preview
```

目的：

- 确认任务文档与真实代码一致。
- 不假设之前 Demo 实现完全正确。
- 如果 baseline 自身失败，先记录原因；不得把已有失败伪装成本轮引入。

---

## 7. 正式保留的产品 Contract

### 7.1 Lesson

- `lesson.json.title` 是页面唯一 H1。
- `lesson.mdx` 不允许 `# H1`。
- `lesson.mdx` 负责教学叙事和 Activity 顺序。
- Lesson runtime domain 不携带 MDX source string。

### 7.2 MDX Activity v1

本轮只正式支持：

```text
Concept
Predict
Compare
Exercise
```

禁止顺手增加：

```text
Explore
Debug
Workshop
Quiz
Review
Demo
Visualization
```

后续必须由真实课程需求驱动新增。

### 7.3 Progressive hints

保留：

```text
提示 1 → 提示 2 → 提示 3
```

不得恢复为 Lesson 初始直接展示全部 hints。

### 7.4 Preview

保留：

- Preview Panel 可调整。
- bounded preview canvas。
- Auto / 390 / 768 / 1280 viewport presets。
- M6A Task 05 未来可以替换 runtime implementation，但不能无故移除该 UX。

### 7.5 Checker diagnostics

保留用户可见能力：

- 当前值。
- 期望值。
- mismatch 与 checker error 可区分。
- selector missing 与 learner mismatch 可区分。

本轮不设计最终 Matcher DSL。

---

## 8. 明确不做

本任务包内禁止：

- Workspace v2。
- Exercise v2。
- HTML Editor。
- JS/TS 编辑或执行。
- Browser Runtime v2。
- ExecutionSnapshot。
- IndexedDB v2 migration。
- Checker Registry。
- Runtime Registry。
- Matcher Registry。
- Exercise Contract Runner。
- generic VFS。
- generic plugin architecture。
- AI tutor。
- 新课程大规模内容扩写。

`StyleCheck.alsoAccepts` 暂时保留为窄兼容能力，但不得宣称它是最终 Checker Schema。

---

## 9. 提交建议

建议每个 Task 独立 commit，便于审核：

```text
refactor: separate lesson metadata from MDX source
feat: generate lesson MDX registry
feat: enforce lesson MDX authoring contract
refactor: make exercise activity lesson-local
feat: add MDX content validation and cleanup
test: finalize MDX learning flow v1
```

不是硬要求，但禁止把所有内容压成一个无法审核的大 commit。

---

## 10. Merge-ready 硬门槛

以下全部满足才算本任务完成：

- [ ] `lesson.mdx` 是唯一 Lesson 正文格式。
- [ ] `Lesson` runtime type 无 `bodyMdxSource`。
- [ ] FileContentReader 不读取 Lesson MDX 正文。
- [ ] Studio 通过独立 source inspector 检查 MDX。
- [ ] 不存在手工维护的 lesson registry。
- [ ] 新 Lesson 不需要修改 application source。
- [ ] generated registry deterministic。
- [ ] stale generated registry 能被 `content:check` 阻止。
- [ ] MDX import/export 被拒绝。
- [ ] arbitrary flow/text expression 被拒绝。
- [ ] custom JSX component 有白名单。
- [ ] component props 满足静态 contract。
- [ ] Lesson MDX H1 被拒绝。
- [ ] `Exercise` 不再写完整 learner href。
- [ ] 无效 Exercise slug reference 被 `content:check` 捕获。
- [ ] 旧 LessonMarkdown 删除。
- [ ] `react-markdown` 删除。
- [ ] Concept / Predict / Compare / Exercise 保持可用。
- [ ] progressive hints 保持可用。
- [ ] Preview presets 保持可用。
- [ ] checker diagnostics 保持可用。
- [ ] Studio 当前 0 error / 0 warning。
- [ ] `pnpm content:check` 通过。
- [ ] `pnpm test:content` 通过。
- [ ] `pnpm lint` 通过。
- [ ] `pnpm build` 通过。
- [ ] `pnpm test:e2e` 通过。
- [ ] `git diff --check` 通过。
- [ ] 无临时 CI workflow / debug 文件残留。

---

## 11. 最终停止点

完成 Task 06 后：

```text
只报告 merge-ready
```

**不要自动开始 M6A。**

**不要自动 merge 到 main，除非用户明确要求。**

M6A 衔接要求见：

```text
07-M6A-衔接约束.md
```
