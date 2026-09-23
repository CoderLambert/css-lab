# Task 03 — CSS Foundations Curriculum Assets v1 → v2 Forward-Port

## 1. 目标

把 curriculum source branch 中非重叠的课程资产 forward-port 到 current M6A branch，并把 legacy Exercise source 转换为 Exercise v2。

Task 03 处理大规模新增资产；3 个现有 published Flexbox Exercises 的语义冲突留给 Task 04。

## 2. 目标规模

source branch 总规模：

~~~text
9 Modules
32 Lessons
100 Exercises
~~~

current main 已有：

~~~text
1 Module: flexbox
1 Lesson: flexbox-alignment
3 Exercises
~~~

因此主要 forward-port 工作是：

- 8 个新 Module。
- 31 个新 Lesson。
- 97 个新 Exercise。
- Flexbox Module 内除现有 alignment 外的新 Lesson/Exercise。
- CSS Foundations v1 planning / final audit docs。

实现时以真实 inventory 为准，不硬编码 97/31 作为脚本逻辑。

## 3. Content preservation rules

对新资产，课程 source branch 是语义 source of truth。

迁移必须保持：

- stable id。
- slug。
- order。
- status。
- revision。
- title / description / prompt。
- estimatedMinutes。
- lesson.mdx narrative。
- hints。
- checks。
- alsoAccepts。
- authored starter/base/fixture/solution text。

不能因为 v2 migration 随意改教学语义。

## 4. Exercise mapping

每个 legacy Exercise：

~~~text
fixture.html  -> starter/index.html
base.css      -> starter/base.css
starter.css   -> starter/style.css
solution.css  -> solution/style.css
~~~

metadata：

~~~text
schemaVersion = 2

workspace.files:
  index.html  html editable=false
  base.css    css  editable=false
  style.css   css  editable=true

runtime:
  type  = browser
  entry = index.html
~~~

CSS Foundations v1 本阶段全部保持 fixed HTML + CSS-only authoring。

不得为了使用 M6A HTML editor 而把 index.html 改为 editable。

## 5. Solution boundary

迁移后：

- solution path set 必须与 editable path set 精确相等。
- 当前 CSS Foundations 每题 editable set = style.css。
- solution/ 只含 style.css。
- solution 不进入 Exercise runtime type。
- learner props / ExecutionSnapshot / Browser Runtime 永远看不到 solution。

## 6. Module/order migration

curriculum source 已冻结 Module order 1–9。

其中 current main 的 Flexbox 从 order 1 移到 order 5。

优先使用 Task 02 的 reorder tooling，而不是手改大量 metadata。

需要保持：

- course stable ID/status。
- flexbox module stable ID/status。
- new modules 默认/现有 status 与 source branch 一致。

## 7. Batch strategy

建议按 Module 做稳定 acceptance boundary：

~~~text
M1 css-language-and-selection
M2 cascade-and-values
M3 box-model-and-flow
M4 visual-styling-and-typography
M5 flexbox new lessons only
M6 grid
M7 flow-positioning-and-layering
M8 responsive-css
M9 integration-and-debugging
~~~

同一运行可连续迁移多个已满足依赖的 Module，不得完成一个文件就主动停止。

每个 Module batch：

1. 重新读取 implementation feature HEAD。
2. 从 frozen source HEAD 提取本 Module assets。
3. run migrator。
4. 校验 JSON/MDX/order/stable IDs。
5. 确认无 legacy assets 残留。
6. run focused/fast gates。
7. commit/push。
8. 重新读取远端 HEAD 后继续下一 batch。

## 8. Draft/publication contract

保留 source branch publication state。

规划时审核报告记录：

~~~text
Lessons:
  1 published
  31 draft

Exercises:
  3 published
  97 draft
~~~

Task 03 不自动提升任何 draft。

特别是 capability-gap blocked Lessons/Exercises 不得为了减少 Studio warning 或增加 E2E 覆盖而 publish。

## 9. Checks boundary

迁移不扩展 Checker DSL。

仍只接受 current：

- style
- exists
- count

旧课程审核中明确标记 source-aware、geometry、pseudo-state、scroll、paint、multi-viewport、Grid authored-track gaps。

不能用弱代理制造“自动检查已覆盖真实 outcome”的假象。

空 checks 的 draft Exercise 可以继续是 draft warning；不得为了 0 warning 填入误导性 checks。

## 10. Generated registry

不要从 source branch复制 generated registry。

Lesson assets forward-port 后：

~~~bash
pnpm content:generate
~~~

由 current main generator 重新生成。

## 11. Validation per batch

至少：

~~~bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
git diff --check
~~~

跨多个 Module 后追加：

~~~bash
pnpm lint
pnpm build
~~~

如果本轮不执行完整 E2E，报告 DEFERRED_FULL_E2E。

## 12. Acceptance Criteria

- [ ] 所有非重叠 Modules/Lessons 已 forward-port。
- [ ] 所有非重叠 Exercises 已转为 schemaVersion 2。
- [ ] 所有迁移 Exercise 使用 starter/ + solution/ current layout。
- [ ] content tree 内无新 legacy fixture.html/base.css/starter.css/solution.css layout。
- [ ] fixed HTML + CSS-only learner contract 保持。
- [ ] stable IDs/orders/status/revisions 未无故改变。
- [ ] solution path equality 成立。
- [ ] new content 仍按 source decision 保持 draft。
- [ ] generated registry 由 current generator 产生，不从旧分支复制。
