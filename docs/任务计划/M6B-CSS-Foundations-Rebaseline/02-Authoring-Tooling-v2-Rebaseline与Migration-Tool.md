# Task 02 — Authoring Tooling v2 Rebaseline 与 Offline Migration Tool

## 1. 目标

把 curriculum branch 中仍有价值的确定性 authoring tooling 前移到 current main，但保持 M6A v2 contract 为唯一正式 contract。

需要解决两个不同问题：

1. future authoring 仍需要 Module scaffold / Module-Lesson reorder。
2. 当前已有 100 个 legacy Exercise 需要一次性、可审计地迁移到 v2。

两者不能通过恢复旧 v1 scaffolder 解决。

## 2. Module scaffold / reorder forward-port

curriculum branch 已实现：

- scaffold.mjs module
- reorder.mjs module
- reorder.mjs lesson
- stable ID / order collision tests

这些能力可以选择性 forward-port。

要求：

- 基于 current main Skill 重新实现/移植。
- current Exercise scaffold 继续输出 M6A v2：
  - exercise.json schemaVersion 2
  - starter/index.html
  - starter/base.css
  - starter/style.css
  - solution/style.css
  - Browser runtime entry
- 不恢复 fixture.html/base.css/starter.css/solution.css 的新建模板。
- Skill 文档不能再声称 current contract 是 Exercise v1。

## 3. Offline v1 → v2 migrator

为 100 个现有 legacy Exercise 建立离线迁移工具。

建议位置：

~~~text
scripts/content/migrate-css-foundations-v1-to-v2.mjs
~~~

它属于 repository migration tooling，不属于 learner/runtime graph。

### 3.1 输入

单个 legacy Exercise directory：

~~~text
exercise.json
fixture.html
base.css
starter.css
solution.css
~~~

### 3.2 输出

~~~text
exercise.json
starter/
  index.html
  base.css
  style.css
solution/
  style.css
~~~

exercise.json mapping：

~~~text
schemaVersion: 1 -> 2

preserve:
  id
  revision
  slug
  title
  prompt
  order
  status
  hints
  checks

add:
  workspace.files = [
    index.html html locked
    base.css   css  locked
    style.css  css  editable
  ]

  runtime = {
    type: browser
    entry: index.html
  }
~~~

### 3.3 Fail-closed rules

Migrator 必须拒绝：

- 缺失 legacy source file。
- 多余/未知 legacy asset，除非显式支持。
- schemaVersion 不是预期 legacy v1。
- target v2 tree 已部分存在。
- stable metadata 无法通过 current schema。
- source symlink / non-regular file。
- overwrite current main overlapping Exercise，除非显式进入 Task 04 reconciliation mode。

默认先 dry-run。

### 3.4 不允许的实现

禁止：

- 在 FileContentReader 中加入 v1 fallback。
- 在 Exercise schema 里同时接受 v1/v2。
- production runtime 根据 schemaVersion 双分支读取。
- 把 legacy aliases 放回 Exercise runtime type。
- 在 learner route 执行迁移。

迁移只能发生在开发/authoring phase，最终仓库只保留 v2 content。

## 4. Reproducibility

工具至少提供：

~~~text
--source-root
--target-root 或 in-place 明确模式
--dry-run
机器可读 summary
~~~

迁移 summary 至少包含：

- exercises discovered。
- would-migrate / migrated。
- rejected。
- source hash 或足够的 path inventory。
- overlap skipped list。

不需要建设 generic migration framework。

## 5. Tests

至少覆盖：

- Module scaffold 默认 draft。
- duplicate module stable ID / order rejection。
- reorder dry-run。
- reorder apply。
- collision rejection。
- v2 Exercise scaffold 仍输出 current starter/solution tree。
- v2 Exercise scaffold 不生成 legacy files。
- migrator 正确映射一个普通 Exercise。
- migrator 保留 revision/status/checks/alsoAccepts。
- malformed source fail closed。
- partial target fail closed。
- overlapping current published Exercise 默认拒绝。
- dry-run 不写文件。
- migration output 能通过 current Exercise schema。

## 6. AGENTS / Skill sync

更新时只写 current truth：

- current Exercise = v2。
- fixed HTML + CSS-only 是 CSS Foundations v1 的课程选择，不是平台限制。
- module scaffold/reorder 是 authoring helper。
- legacy migrator 是 offline forward migration 工具，不是正式内容 contract。
- 不允许未来作者继续创建 v1 assets。

## 7. Validation

至少：

~~~bash
pnpm test:authoring-skill
pnpm test:content
pnpm lint
git diff --check
~~~

如果 migration test 通过 Playwright Node-side import 执行，保持现有 test runner，不引入第二套 framework。

## 8. Acceptance Criteria

- [ ] Module scaffold/reorder 能力在 v2 Skill 上可用。
- [ ] Exercise scaffold 保持纯 v2。
- [ ] offline migrator 有 dry-run 和 fail-closed contract。
- [ ] production graph 无任何 v1 reader。
- [ ] tests 覆盖 positive / negative / overwrite boundary。
- [ ] Skill / AGENTS 不再出现互相冲突的 v1/v2 authoring truth。
