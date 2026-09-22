# CSS Foundations v1 — 三定时任务执行总计划

> Execution mode: Scheduled / Repository-driven
>
> Branch: `feat/css-foundations-v1-curriculum-plan`
>
> 本文档是 CSS Foundations v1 的唯一执行编排入口。Task 01~13 的教学目标、内容边界仍然有效；当它们与本文档的“车道所有权、执行顺序、快速验证、延后验证”冲突时，以本文档为准。

---

## 0. 目标

使用 3 个错峰定时任务直接推进仓库：

```text
Lane A — Foundation / Tooling / Final Integration
Lane B — Early Curriculum (M1~M4)
Lane C — Layout & Integration Curriculum (M5~M9)
```

核心原则：

1. 三个任务绝不同时拥有同一批主要写文件。
2. 每次运行只完成一个原子工作单元。
3. 内容生产仍遵守 prerequisite，不因为定时执行而跳知识依赖。
4. 耗时且非开发阻塞项延后到 Task 13 统一完成。
5. 不在每个 batch 反复跑完整 build / E2E / exhaustive review。
6. 最终合并前必须恢复完整质量门禁，不能永久跳过。

---

## 1. 三车道文件所有权

### Lane A — Foundation / Tooling / Final Integration

负责：

```text
Task 01
Task 02
Task 03
Task 13
.agents/skills/css-lesson-authoring/**
AGENTS.md（仅 Task 02 所需 authoring contract）
content/courses/css-foundations/course.json
content/courses/css-foundations/modules/*/module.json
Task 01~03 / Task 13 文档
最终 generated registry / full validation / merge-readiness
```

允许在 Task 03 创建 Module skeleton 和执行 metadata order migration。

禁止在 Task 01~03 创作 M1~M9 的 learner-facing Lesson 正文。

Task 03 完成后，Lane A 进入等待状态；只有 Task 04~12 全部完成后，才执行 Task 13。

---

### Lane B — Early Curriculum

负责：

```text
Task 04 — M1 css-language-and-selection
Task 05 — M2 cascade-and-values
Task 06 — M3 box-model-and-flow
Task 07 — M4 visual-styling-and-typography
```

主要写权限仅限：

```text
content/courses/css-foundations/modules/css-language-and-selection/**
content/courses/css-foundations/modules/cascade-and-values/**
content/courses/css-foundations/modules/box-model-and-flow/**
content/courses/css-foundations/modules/visual-styling-and-typography/**
Task 04~07 task-local notes
```

禁止修改：

```text
.agents/skills/css-lesson-authoring/**
AGENTS.md
其他 Module
generated registry
package.json
pnpm-lock.yaml
shared runtime/checker/application code
```

执行顺序严格：

```text
Task 04 → Task 05 → Task 06 → Task 07
```

每次运行最多完成 1 个 Lesson batch；一个 batch 最多 2 个 Lesson。

---

### Lane C — Layout & Integration Curriculum

负责：

```text
Task 08 — M5 Flexbox
Task 09 — M6 Grid
Task 10 — M7 Positioning & Layering
Task 11 — M8 Responsive CSS
Task 12 — M9 Integration & Debugging
```

主要写权限仅限：

```text
content/courses/css-foundations/modules/flexbox/**
content/courses/css-foundations/modules/grid/**
content/courses/css-foundations/modules/flow-positioning-and-layering/**
content/courses/css-foundations/modules/responsive-css/**
content/courses/css-foundations/modules/integration-and-debugging/**
Task 08~12 task-local notes
```

禁止修改：

```text
.agents/skills/css-lesson-authoring/**
AGENTS.md
M1~M4 Module
generated registry
package.json
pnpm-lock.yaml
shared runtime/checker/application code
```

依赖门禁：

```text
Task 08 / 09
  require Task 06 complete

Task 10
  require Task 07 complete

Task 11
  require Task 08 + 09 complete

Task 12
  require Task 04~11 complete
```

因此 Lane C 可以在 M3 完成后开始 M5/M6，同时 Lane B 继续 M4；这是允许的主要并行区。

---

## 2. 如何判断 Task 已完成

不创建共享 mutable progress file，也不要求三个定时任务反复修改同一份状态文档。

每次运行通过以下顺序判断：

1. 读取最新远程 branch HEAD。
2. 检查当前 Task 的 Acceptance Criteria。
3. 检查真实 repo artifacts / metadata / Lesson / Exercise 是否已经满足。
4. 检查最近相关 commits，确认是否已有等价实现。
5. 如果部分完成，只补下一个最小缺口。
6. 如果完整满足，进入下一个 prerequisite 已满足的 Task。

真实仓库状态始终高于“任务文档看起来应该做到哪里”的推测。

---

## 3. 每次定时运行的原子工作量

### Lane A

一次运行最多完成：

- Task 01；或
- Task 02 的一个明确 tooling 子任务；或
- Task 03；或
- Task 13 的一个最终审核/修复阶段。

Task 02 如果需要多轮：

```text
module scaffold
→ reorder/migration
→ tests + docs sync
```

允许分成多个原子 commit，但不得在中间状态开始 Task 03。

### Lane B / C

一次运行：

```text
inspect current Task
→ choose next incomplete batch
→ minimum source grounding
→ deterministic scaffold
→ author 1~2 Lessons
→ author Exercises
→ local consistency review
→ fast gate
→ commit
```

禁止一次运行跨两个 Module。

---

## 4. Open Decision 执行策略

用户已授权本轮直接基于仓库推进，因此 Task 01 不再因为课程层面的 provisional defaults 逐项等待人工确认。

如果最新仓库没有相反证据，直接冻结以下 v1 baseline：

```text
HTML prerequisite:
  learner 能阅读基础 HTML / DOM

CSS prerequisite:
  zero CSS

endpoint:
  能实现 + 解释 + 系统 debug 常见 CSS

scope:
  visual styling + layout
  system/layout mental model 优先

browser policy:
  面向 modern evergreen CSS semantics
  当前自动化验证事实仍只宣称 Chromium coverage

Lesson:
  10–20 min / 一个核心 mental model

Exercise:
  通常 2–4 / 默认约 3

capstone:
  fixed HTML + CSS-only

advanced animations / container queries / subgrid deep dive 等:
  排除在 CSS Foundations v1 core
```

只有以下情况才停止等待用户：

- 决策会要求新增 Workspace / Checker / Runtime / Activity capability。
- 会把 CSS Foundations 扩大为 HTML/JS authoring course。
- 最新 repo 产品 contract 与上述 baseline 明确冲突。
- 会导致已规划 Module/Lesson 大规模重构而没有足够证据。

课程层面的普通取舍由执行者基于当前规划做 best-effort 决策，并在 Task 13 统一复核。

---

## 5. Scheduled mode 下仍不能跳过的开发前检查

每次运行都必须：

```text
1. 重新读取远程 branch HEAD。
2. 确认没有新的 main/branch contract 改动使本 Task 失效。
3. 读取 AGENTS.md。
4. 读取 css-lesson-authoring Skill 的当前 contract。
5. 读取当前 Task 文档。
6. 检查 prerequisite。
7. 只修改本 Lane 所有文件。
```

如果 M6A 已经改变 Exercise / Workspace / Authoring Skill contract：

- 以最新正式 contract 为准。
- 不继续生成旧 Exercise v1 assets。
- 不创建双 scaffold / 双写 compatibility。
- 如果仓库正处于未完成的跨 contract migration 中，本轮不写 curriculum content。

---

## 6. 可以延后的耗时工作

为了提高开发吞吐，Task 01~12 的 scheduled runs 可以延后：

- 全课程 exhaustive freeCodeCamp benchmark。
- 每 Module 的完整独立 reviewer 轮次。
- 全仓库 `pnpm build`。
- 全量 Playwright E2E。
- 全量 generated registry idempotency。
- 全课程 source-grounding consistency audit。
- publication review。
- 全课程 capability gap reclassification。
- 对所有 browser/edge-case 的 exhaustive source reconciliation。

这些工作不是取消，全部进入 Task 13。

---

## 7. 不能延后的最小事实核查

内容开发不能“无 source grounding”推进。

每个 Lesson 至少需要：

1. 对核心 CSS semantics 查一个 primary/authoritative source（优先 CSSWG；必要时 MDN）。
2. 明确本 Lesson 的 mental model。
3. 明确 2~4 个主要 misconception。
4. 确认 checker 没有用错误 proxy。
5. 确认 fixture / starter 不依赖未教授前置。

可以延后 benchmark breadth，不能延后 semantic correctness。

---

## 8. Fast Gate

### Lane A — Task 02 tooling

至少运行：

```bash
pnpm test:authoring-skill
git diff --check
```

若 Task 02 修改直接影响 content tooling，再补：

```bash
pnpm test:content
```

### Lane A — Task 01 / 03

至少：

```bash
git diff --check
```

并对所有修改的 JSON / metadata 做 deterministic validation。

### Lane B / C content batch

默认不在每批更新 shared generated registry，避免车道冲突。

每批至少确认：

```text
- deterministic scaffold/inspect command 成功
- touched JSON 可解析且 metadata contract 正确
- lesson.mdx Exercise reference 与本 batch exercise.order 一致
- no duplicate stable ID / slug / order in touched parent
- checker definitions 可由当前 DSL 诚实表达
- git diff --check
```

如果现有工具提供不修改共享生成文件的窄验证，优先使用。

不得为了让 fast gate 通过而：

- 降低 Content Contract。
- 修改错误的 canonical order。
- 删除 tests。
- 创建 per-exercise JS checker。
- 提前实现平台 capability。

---

## 9. Task 13 统一验证

Task 13 是 scheduled mode 的完整质量恢复点。

必须统一执行：

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm test:authoring-skill
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

以及：

```bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

Task 13 还必须补回：

- 3 个独立 review 视角。
- full source-grounding audit。
- capability-gap finalization。
- publication readiness。
- M1~M9 dependency audit。
- current Flexbox regression。
- responsive / grid / stacking 等 checker limitation review。
- 与最新 `main` 再同步后重新验证。

任何 Critical / Major 都修复后重新跑完整 gate。

---

## 10. Branch / commit conflict protocol

三个定时任务都在：

```text
feat/css-foundations-v1-curriculum-plan
```

上推进。

每次写入前必须重新读取 branch HEAD。

提交前再次确认 remote HEAD 没有出现同 Lane 修改。

如果 HEAD 已变化：

1. 不覆盖远程。
2. 重新读取最新变更。
3. 确认没有触碰本 Lane 文件。
4. 基于新 HEAD 重放本轮修改。
5. 如果触碰本 Lane 文件，停止本轮写入并报告冲突。

禁止 force push scheduled development commits。

---

## 11. Commit convention

Lane A：

```text
cssf(a): ...
```

Lane B：

```text
cssf(b): ...
```

Lane C：

```text
cssf(c): ...
```

Lesson content commit 必须说明 Module / batch，例如：

```text
cssf(b): add M1 selector lesson batch
cssf(c): add Flexbox axes and alignment batch
```

一个 commit 不跨 Module。

---

## 12. 执行顺序与可并行区

```text
A: Task 01 → 02 → 03 --------------------------→ Task 13
                    │
                    ▼
B:                 Task 04 → 05 → 06 → 07
                                      │
                         ┌────────────┘
                         ▼
C:                       08 → 09 → 10 → 11 → 12
```

更准确的 gate：

```text
A03 complete
→ B04

B06 complete
→ C08 / C09

B07 complete
→ C10

C08 + C09 complete
→ C11

B04~07 + C08~11 complete
→ C12

B04~07 + C08~12 complete
→ A13
```

---

## 13. Source research 并行策略

可以在任意 Lane 空闲时做 read-only research，但：

- 不因为 research 完成就越过 prerequisite scaffold。
- 不写共享 planning doc。
- 研究结论优先写入对应 Task / Module 自己的 notes/source-pack。
- freeCodeCamp 仍只是 curriculum benchmark。
- CSS semantics 仍以 CSSWG/MDN 为主。

---

## 14. Publication

Task 01~12 新内容默认：

```text
draft
```

Scheduled development 阶段禁止为了 E2E/导航方便批量改 `published`。

只有 Task 13：

```text
content complete
+ source reviewed
+ checker truthful
+ learner experience validated
+ full gates pass
```

后才决定 publication。

---

## 15. Stop conditions

任一 scheduled task 遇到以下情况停止本轮写入：

- prerequisite 未完成。
- 最新 main/branch 改变 Content Contract。
- M6A 正在进行未完成的 Exercise contract cutover。
- 需要修改其他 Lane 所有文件。
- 需要实现新 Checker/Workspace/Activity/Runtime capability。
- 发现当前 Curriculum Plan 有 Critical factual/dependency error。
- remote HEAD 在本轮发生同 Lane 冲突。

停止时只报告 blocker，不自行扩大 scope。

---

## 16. 最终完成条件

只有 Lane A 完成 Task 13 并通过完整 gate 后，才允许报告：

```text
CSS Foundations v1 curriculum production complete
```

在此之前只能报告：

```text
scheduled development in progress
```

不要自动 merge `main`，除非用户明确要求。
