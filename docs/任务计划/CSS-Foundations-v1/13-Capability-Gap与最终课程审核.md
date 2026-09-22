# Task 13 — Capability Gap Register 与最终课程审核

> Scheduled final gate: 本 Task 由 Lane A 在 Task 04~12 全部完成后执行。它负责补回 scheduled development 期间延后的 full verification、source audit、independent review、publication review 与 merge-readiness。

## 1. 目标

在 9 个 Module 完成后，不立即把所有 draft 内容发布。

先做独立的 Course-level audit：

```text
Curriculum correctness
+ dependency
+ source grounding
+ activity fit
+ checker truthfulness
+ workspace fit
+ learner experience
+ publication readiness
```

这是 CSS Foundations v1 的最终 stop gate，也是三定时任务模式下所有 deferred validation 的统一恢复点。

---

## 2. Required inputs

读取：

```text
docs/功能文档/CSS-Foundations-v1-课程规划.md
docs/任务计划/CSS-Foundations-v1/*.md
AGENTS.md
css-lesson-authoring Skill
全部 content/courses/css-foundations/
全部 Module production reports / source packs（如果已持久化）
```

运行全仓库 context/content inspection。

---

## 3. Scheduled-mode deferred work

Task 01~12 为提高吞吐允许延后的工作，在本 Task 必须一次性补回：

- exhaustive course-level source-grounding audit。
- freeCodeCamp coverage/progression benchmark reconciliation。
- 3 个独立只读 reviewer。
- generated registry refresh + idempotency。
- full content check / content tests / authoring skill tests。
- lint / build / full Playwright E2E。
- cross-module prerequisite / misconception / transfer audit。
- all implementation-fit classifications re-evaluated from final content。
- capability gaps 与实际 blocked/published status 一致。
- publication review。
- branch 与最新 main 同步后的最终回归。

任何一项如果失败，不得把“scheduled development 已完成”升级为“curriculum production complete”。

---

## 4. Course-level Curriculum Audit

逐项检查：

### Coverage

课程 endpoint 所需能力是否覆盖。

### Dependency

所有 prerequisite 是否先出现。

### Cognitive Load

是否有 Lesson 实际包含多个独立 mental model，需要拆分。

### Transfer

是否存在真正改变 context 的练习，而不只是换 selector/name。

### Practiceability

每个 Lesson 是否有值得 learner 修改 CSS 的任务。

### Observability

Preview 是否能清楚展示概念差异。

### Checkability

checker claim 是否诚实。

### Non-redundancy

相邻 Lesson 是否只是换 property 重复。

### Misconception Coverage

Predict / Compare / debugging Exercise 是否覆盖关键错误 mental model。

### Product Fit

现有 Activity/Workspace/Preview 是否足够。

---

## 5. Capability Gap Register finalization

建立最终表：

| Gap | Category | Affected Lessons | Severity | Blocks publication? | Suggested future milestone |
| --- | --- | --- | --- | --- | --- |

Category 只使用：

```text
Activity
Workspace
Checker
Preview/Runtime
Authoring Tooling
```

候选 checker gaps 必须以真实最终内容重新确认：

- source-aware CSS validation。
- geometry/layout validation。
- pseudo-state validation。
- pseudo-element validation。
- scroll-state validation。
- paint/stacking validation。
- multi-viewport validation。
- Grid authored track validation。

如果最终课程没有使用其中某项，则删除对应 gap。

---

## 6. Implementation-fit reclassification

对全部 Lesson 重新标记：

```text
READY
TEACHABLE_BUT_CHECKER_LIMITED
NEEDS_ACTIVITY_CAPABILITY
NEEDS_WORKSPACE_CAPABILITY
NEEDS_CHECKER_CAPABILITY
```

比较与规划基线的差异。

任何升级/降级必须写原因。

---

## 7. Publication review

每个 entity 的 `status` 必须根据真实 readiness 决定。

### Published Lesson 最低要求

- content complete。
- source reviewed。
- factual accuracy reviewed。
- Exercise sequence complete。
- checker checks truthful。
- progressive hints reviewed。
- content contract pass。
- learner-visible E2E pass。
- no blocking capability gap。

### 不允许 publication 的情况

- checker 使用错误 proxy。
- Lesson outcome 本质依赖缺失 Workspace capability。
- source conflict unresolved。
- major misconception 未处理。
- Exercise 只有 syntax copying。
- draft source/placeholder/TODO。

不要为了让 Course 看起来完整把所有内容改 published。

允许：

```text
published stable core
+ draft future/gap-blocked lessons
```

但 learner navigation 和课程叙事必须保持一致。

---

## 8. Independent reviewers

至少 3 个独立只读 review：

### R1 — CSS Technical Reviewer

检查 spec accuracy、terminology、edge cases、outdated simplification、browser assumptions。

### R2 — Curriculum Reviewer

检查 dependency、cognitive load、transfer、misconception、exercise progression。

### R3 — Product / Checker Reviewer

检查 Activity fit、Workspace fit、Preview observability、checker false-positive/false-negative、publication integrity。

所有 Critical / Major 修复后重新全量验证。

---

## 9. Full verification

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

Generator idempotency：

```bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

正式 PR 前必须再次同步最新 `main` 并重新验证。

---

## 10. Final report

必须报告：

1. final Course / Module / Lesson count。
2. published vs draft count。
3. final dependency graph。
4. major source sets。
5. implementation fit distribution。
6. unresolved Capability Gaps。
7. existing flexbox-alignment 最终变化。
8. checker limitations。
9. workspace limitations。
10. validation results。
11. reviewer findings and fixes。
12. 是否达到 merge-ready / publication-ready。

---

## 11. Stop point

Task 13 完成后：

```text
CSS Foundations v1
→ audited
→ validation complete
→ report readiness
```

不要自动实现 capability gap、启动 M6A、新增 Activity 或 merge main。

等待用户对最终课程和 gap roadmap 的审核。
