# Task 04 — Published Flexbox Reconciliation 与 Progress Revision Boundary

## 1. 目标

处理 current main 与 curriculum source 唯一最敏感的重叠区：

~~~text
css-foundations
└─ flexbox
   └─ flexbox-alignment
      ├─ center-box
      ├─ space-between-items
      └─ align-items-end
~~~

这些内容已经 published，并且真实用户可能已经在 IndexedDB v2 中有 progress。

不能使用整文件覆盖。

## 2. Module / Lesson order

curriculum source 的课程 progression 要求：

~~~text
flexbox module order: 1 -> 5

flexbox-alignment lesson order: 1 -> 2
~~~

原因是 curriculum branch 增加了 M1–M4 和 Flexbox 前置 Lesson。

迁移 order 时：

- stable ID 不变。
- slug 不变。
- published status 不变。
- learner published sequence 必须仍可正确进入 alignment Lesson，即使前面的 Module/Lesson 仍为 draft。

## 3. Lesson narrative reconciliation

curriculum source 对 flexbox-alignment 做了教学重构：

- 明确上一课已建立 formatting context 与 axes。
- 更强调 main/cross axis transfer。
- Compare 文案更精确。
- 第三个 Exercise 变为 column 方向下验证 cross-axis end。

应 forward-port这些课程语义，但必须继续满足 current MDX Learning Flow v1 contract。

不能把旧文档中的 fixture/starter 术语带回 runtime domain；面向作者的文字应同步为 current starter/workspace vocabulary。

## 4. Exercise revision policy

revision 是 progress compatibility boundary，不是随意版本号。

### center-box

source branch 仍为 revision 1。

教学提示有所改进，但核心 workspace topology、checks 和 accepted outcome 没有形成不兼容变化时，应保持 revision 1，以保留现有 progress。

### space-between-items

source branch仍为 revision 1。

同样只有在 starter/check/goal 的真实 compatibility 审计确认仍兼容时保持 revision 1。

### align-items-end

source branch 已明确改为 revision 2：

~~~text
旧：
  默认 row
  cross-axis end = 视觉底部

新：
  flex-direction: column
  cross-axis end = 常见水平书写模式中的右侧
  新增 flex-direction: column check
~~~

这是 exercise semantics 与 starter/check contract 的真实变化，应保留 revision 2。

不得把旧 revision 1 progress 恢复到 revision 2。

## 5. v2 Workspace merge rules

3 个 published Exercise 最终都必须保留 current platform fields：

~~~text
schemaVersion: 2

workspace:
  index.html locked
  base.css locked
  style.css editable

runtime:
  browser
  entry index.html
~~~

教学字段来自 reconciliation 结果；Workspace/Runtime contract 来自 current main。

## 6. Asset reconciliation

不能假设 old fixture/base/starter/solution 与 current starter tree 相同。

对每题逐项比较：

- HTML fragment。
- base CSS。
- starter CSS。
- solution CSS。
- checks。
- prompt/hints。
- revision。

如果 source branch 的教学调整要求 source asset 改变，则把其内容映射到 v2 paths。

特别是 align-items-end revision 2 必须保证 fixture/base/starter/solution 与 column task 一致。

## 7. Progress regression

必须验证：

- center-box revision 1 的已有 v2 Draft 可继续恢复。
- space-between-items revision 1 的已有 v2 Draft 可继续恢复。
- align-items-end revision 1 record 不会恢复到 revision 2。
- revision 2 可新建 Draft / completion。
- completed achievement 的 semantics 不跨 revision 错误继承。
- DB 仍为 css-lab version 2；不进行 DB v3 migration。

M6B 是 content revision change，不是 storage schema migration。

## 8. Learner E2E

更新真实 published learner E2E，不降低断言。

至少：

- alignment Lesson MDX 正确渲染。
- 3 Exercise canonical order 不变。
- center-box check/completion。
- space-between check/completion。
- align-items-end revision 2 的 column/cross-axis behavior。
- reload restore。
- progress percent。
- hints。
- formatter/undo/swatches 既有回归。
- Browser Runtime generation/security invariants 继续通过。

## 9. Acceptance Criteria

- [ ] Flexbox module order 与课程 plan 一致。
- [ ] alignment Lesson order 与课程 plan 一致。
- [ ] published stable IDs 保持。
- [ ] center-box / space-between revision 兼容性有明确证据。
- [ ] align-items-end 使用 revision 2。
- [ ] 3 Exercise 都是纯 v2 Workspace/Runtime。
- [ ] revision 1 → 2 不发生 progress restore。
- [ ] current 3 published learner flow 真实 E2E 通过。
