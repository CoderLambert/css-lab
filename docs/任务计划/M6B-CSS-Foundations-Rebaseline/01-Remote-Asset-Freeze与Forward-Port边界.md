# Task 01 — Remote Asset Freeze 与 Forward-Port 边界

## 1. 目标

在任何代码迁移前，把两个远端事实源的职责冻结清楚：

~~~text
main
  = 平台、security、storage、Exercise v2、authoring v2 的 authoritative baseline

feat/css-foundations-v1-curriculum-plan
  = 已审核课程语义与课程结构的 source branch
~~~

Task 01 不做大规模内容复制，不修改 Runtime/Progress。

## 2. 每轮开始必须读取

- 最新 main HEAD。
- 最新 feat/css-foundations-v1-curriculum-plan HEAD。
- 两边最近 commits。
- AGENTS.md。
- current css-lesson-authoring Skill。
- CSS Foundations v1 Task 13 最终课程审核报告。
- M6B 00 总计划。

不得依赖本计划写入时的 SHA 判断“远端没变”。

## 3. 审计时已确认的 inventory

规划时 remote evidence：

~~~text
main:
  9762a9ed06aeeec296591f06d43ea517b79e77ad

curriculum source:
  70cb8dcfcbda6456b35f64826a7a634c071f6a8f

compare:
  status    = diverged
  ahead_by  = 34
  behind_by = 36
  merge_base = 7252b93505427582c6483edb910a5051bdd30fe3
~~~

curriculum tree：

~~~text
9   module.json
32  lesson.json
100 exercise.json

100 fixture.html
100 base.css
100 starter.css
100 solution.css

0 starter/index.html
~~~

实现时必须重新计算并确认 inventory；如果 source branch 又前进，先重做差异审计。

## 3.1 Post-freeze source reconciliation（2026-09-24 remote read）

重新读取到的 remote HEAD：

~~~text
main                                      9762a9ed06aeeec296591f06d43ea517b79e77ad
feat/m6b-css-foundations-rebaseline       b63c72c5cd2a54872d1159ea9d9b07337a665ba4
feat/css-foundations-v1-curriculum-plan  e48f365cc6a6f0688916813cb4bc4a8c765b98c2
feat/m6a-workspace-domain-v6              573f630b4d77a34824cb1f746eca914a0960e8af
~~~

`70cb8dcfcbda6456b35f64826a7a634c071f6a8f` 仍表示实际 frozen migration/planning source；`e48ba8781ed78e37ca0af77cea75e324cd4c24e4` 是 migration freeze 之后新增、必须审计的 latest observed source。两者不能相互替换。

`70cb..e48` 的可重复分类为：1 commit、160 files；100 Exercise JSON、42 Lesson files、3 legacy/runtime/schema files、2 E2E files、1 audit report、12 module/assets/other。其中 116 files 只有 `draft → published`（77 Exercise、31 Lesson、8 Module）。随后 `e48..702` 增加 2 个 source-only commits、3 个文件（`AGENTS.md`、checker-guidelines、authoring-skill drift test），用于修正 source branch 自己的 checker guidance drift；`702..247` 增加 4 个 curriculum-only commits、12 个文件，修正 #8/#10/#23/#26；`247..f3` 增加 2 个 curriculum-only commits、12 个文件，修正 #16/#28；`f3..7c` 增加 1 个 curriculum-only commit、8 个文件，修正 #20 及相关 responsive threshold observation；`7c..2adc` 增加 2 个 curriculum-only commits、8 个文件，修正 #22/#27，其中 #27 新增一个 source-only unsupported-checker Exercise；`2adc..489` 增加 3 个 curriculum-only commits、12 个文件，修正 #9/#15，并新增 9 个 source-only unsupported-checker Exercises；`489..7ba` 增加 2 个 curriculum-only commits、9 个文件，修正 #14，并新增 7 个 source-only authored-value/custom-property checker Exercises；`7ba..d91` 增加 1 个 curriculum-only commit、5 个文件，修正 #18 的 focus-state framing；`d91..46a` 增加 2 个 curriculum-only commits、4 个文件，修正 #25/#30；`46a..77eb` 增加 5 个 curriculum-only commits、17 个文件，部分修正 #7 并新增 3 个 source-only checker Exercises；`77eb..8bfa` 增加 3 个 curriculum-only commits、11 个文件，进一步减少 #7 answer leakage；`8bfa..54a` 增加 5 个 commits、18 个文件，继续修正 cascade evidence/Flex progression/mobile-first scope，并在 source-only legacy schema/runtime/guidance 中加入 optional `rule-style` priority，新增 2 个 source-only checker Exercises；`54a..1b1` 增加 2 个 commits、6 个文件，加入 source-only `rule-style.afterSelector` source-order validation 和 source-contract guard，未新增 unsupported-checker Exercise；`1b1..e48f` 增加 3 个 commits、3 个文件，修正 breakpoint space budget 并刷新 source Task 13 audit evidence，未新增 checker type 或 unsupported-checker Exercise。上述新增 source 变化不改变 M6B 当前 checker contract 或 publication boundary；全范围 `70cb..e48f` 是 38 commits、216 个 unique files；其余 source checker/publication/narrative/asset 变化见 `06-source-reconciliation-evidence.md`。

M6B 不 bulk-forward-port 这次 publication sweep，也不把 `rule-style` / `viewport-style` 或 source-only `rule-style.priority` / `afterSelector` 偶然带入当前 `style | exists | count` contract。当前 9/32/100 inventory、1/31 published Lesson、3/97 published Exercise 和 13 个 warning 保持不变；source branch 仍为 read-only evidence。

## 4. 重叠区域

以下路径不能整树覆盖：

- content/courses/css-foundations/course.json
- content/courses/css-foundations/modules/flexbox/module.json
- flexbox-alignment lesson metadata / MDX
- flexbox-alignment 的 3 个 published Exercises
- .agents/skills/css-lesson-authoring/**
- AGENTS.md
- generated lesson registry
- M6A planning docs
- application/runtime/progress/content reader code

这些路径需要按当前 main contract 选择性 forward-port。

## 5. Forward-port allowlist

可以从 curriculum source 提取并在 current main 上重建：

- CSS Foundations v1 新 Module metadata。
- 新 Lesson metadata 与 lesson.mdx。
- 新 Exercise 的教学字段：
  - id
  - revision
  - slug
  - title
  - prompt
  - order
  - status
  - hints
  - checks
- legacy Exercise source assets 的内容：
  - fixture.html
  - base.css
  - starter.css
  - solution.css
- docs/任务计划/CSS-Foundations-v1/** 的课程规划与审核记录。
- authoring tooling 中经独立审查后仍适用于 current v2 contract 的 module scaffold / reorder 逻辑。

## 6. Explicit denylist

不得直接从 old branch 覆盖：

- 旧 Exercise schema。
- 旧 ContentReader / learner flow。
- 旧 v1 Exercise templates。
- 旧 generated registry。
- 旧 AGENTS 全文件。
- 旧 M6A docs。
- 任何为了读取 v1 content 而加入 production runtime 的 compatibility reader。
- 任何 legacy fixtureHtml/baseCss/starterCss runtime aliases。

## 7. Source branch policy

feat/css-foundations-v1-curriculum-plan 进入 read-only preservation 状态。

M6B：

- 不 force push 它。
- 不 rebase 它。
- 不把它 reset 到 main。
- 不要求它自己升级到 v2。
- 不删除它，直到 M6B merge 后完成 source-to-target reconciliation audit。

这样保留课程生产历史，同时避免把 stale platform code 带回 main。

## 8. Migration inventory

Task 01 应生成可复核 inventory，至少包含：

- source Module/Lesson/Exercise count。
- stable ID set。
- slug/order/status。
- Exercise revision。
- checks count / empty-check draft list。
- legacy asset completeness。
- 与 main 的 overlap set。
- overlapping file 的 semantic differences。

inventory 可以由脚本生成；不要手工维护 100 Exercise 的易漂移表格。

## 9. Conflict protocol

写入 implementation branch 前再次读取：

- implementation feature HEAD。
- main HEAD。
- curriculum source HEAD。

如果 curriculum source 在本轮前进：

1. 不覆盖。
2. 重算 inventory。
3. 判断新增提交是否改变课程语义、orders/status/revision。
4. 更新 forward-port plan 后再写。

如果 main 前进并修改 content/runtime/authoring contract：

1. 以 main 为准。
2. 重新评估 Task 02/03 mapping。
3. 不使用 rebase 或 force 解决。

## 10. Acceptance Criteria

- [ ] 两个远端 HEAD 均重新读取。
- [ ] 9/32/100 inventory 用真实 tree 重新确认。
- [ ] legacy asset layout 数量真实确认。
- [ ] overlap set 明确。
- [ ] allowlist / denylist 可执行。
- [ ] source branch 不被修改。
- [ ] 没有开始 production v1 dual-read。
- [ ] 为 Task 02 提供机器可读或可重复生成的迁移 inventory。
