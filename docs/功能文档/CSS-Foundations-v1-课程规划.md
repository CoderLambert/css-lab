# CSS Foundations v1 — 课程规划基线

> Status: Planning / Review
>
> Repository baseline: `main@1cc5b7134ea3bafca4398d48aceadf5b5be64b7d`
>
> Curriculum/code audit was performed at `7aaf4ba1`; the later `1cc5b713` commit hardens M6A planning docs only and does not change the audited content/runtime state.
>
> 本文档定义 CSS Foundations v1 的课程架构、Learner Contract、Lesson Map、实施条件与已知能力缺口。它是后续课程生产的产品/教学基线，不代表当前仓库已经实现这些 Lesson。

---

## 1. 文档目标

CSS Foundations v1 的目标不是批量生成 CSS property 题目，而是建立一套可长期维护、可逐批生产的课程：

```text
Course
→ Module
→ Lesson
→ Activity
→ Exercise
→ Checker
```

每个 Lesson 必须围绕可迁移 mental model，而不是“一个 property = 一个 Lesson”。

CSS Lab 的学习循环保持：

```text
Concept
→ Predict
→ Observe / Compare
→ Implement
→ Check
→ Diagnose
→ Hint
→ Retry
→ Correct mental model
```

当前正式 Activity 仍只有：

```text
Concept
Predict
Compare
Exercise
```

不得为了课程完整感新增 Explore / Debug Activity / Quiz / Workshop / Review 等 primitive。调试任务优先通过带错误 starter state 的普通 Exercise 表达。

---

## 2. Repository / Evidence Audit

### 2.1 当前真实内容

当前 `content/courses/` 只有：

```text
css-foundations/
  course.json
  modules/
    flexbox/
      module.json
      lessons/
        flexbox-alignment/
          lesson.json
          lesson.mdx
          exercises/
            center-box/
            space-between-items/
            align-items-end/
```

因此当前内容是产品链路的真实样本，不是已经完成的 Curriculum Architecture。

当前：

- `flexbox` module order = 1。
- `flexbox-alignment` lesson order = 1。
- 现有 3 个 Exercise 全部 published。
- learner 主要编辑 CSS。
- `fixture.html` 是固定实验环境。
- checker DSL 只有 `style / exists / count`。
- `style` 通过 `getComputedStyle(...).getPropertyValue(...)` 检查 resolved result。
- Playwright 正式 E2E 项目当前只有 Chromium。

### 2.2 当前 authoring system

仓库已经有：

```text
.agents/skills/css-lesson-authoring/
```

确定性工具：

```text
inspect-context.mjs
scaffold.mjs
inspect-source-pack.mjs
```

当前 `scaffold.mjs` 只支持：

```text
lesson
exercise
```

尚不支持：

```text
module
course
existing entity reorder / migration
```

这会成为新 Curriculum 实施前的确定性 authoring blocker。

### 2.3 已有研究资料状态

仓库中没有发现此前讨论形成的完整：

- freeCodeCamp curriculum analysis。
- CSS curriculum research。
- source notes。
- 正式 CSS Foundations 课程规划。

现有 `MDX-Learning-Flow-v1-产品方案.md` 只保存了产品层面对 freeCodeCamp 的差异定位。

因此：

> 旧分析没有形成当前可审查的持久化资料。

后续 benchmark 必须以当前可验证资料重新建立，禁止引用未持久化旧聊天结论。

---

## 3. Evidence hierarchy

技术事实优先级：

```text
CSSWG / W3C specifications
→ MDN
→ 其他高质量 primary / authoritative references
```

freeCodeCamp 用于：

- topic coverage benchmark。
- progression benchmark。
- exercise granularity。
- repetition strategy。
- beginner onboarding。
- project/lab cadence。
- automatic validation pattern。

freeCodeCamp 不用于：

- 决定 CSS semantics。
- 直接复制 learner-facing prose。
- 直接复制 exercise wording。
- 直接复制 unique task sequence。
- 直接复制 solution / curriculum text。

正式 source-grounded authoring 必须遵守：

```text
Source
→ Grounded Claims
→ Learning Outcomes
→ Misconceptions
→ Lesson Design
→ Exercise Objectives
→ Exercises
```

---

## 4. Learner Contract

### 4.1 Confirmed Assumptions

当前仓库可以确认：

1. learner-facing language 主要为中文。
2. code / identifier 使用英文。
3. 当前 Exercise v1 的 learner editable surface 是 CSS。
4. HTML fixture 是可信、固定实验环境。
5. Lesson 应围绕 mental model，不围绕 property list。
6. Activity v1 只有 Concept / Predict / Compare / Exercise。
7. debugging-oriented Exercise 可通过错误 starter state 表达。
8. Checker 只能使用 style / exists / count。
9. 新内容默认 draft。
10. Preview 已有 Auto / 390 / 768 / 1280 viewport presets。
11. 当前 automated browser coverage 是 Chromium，不等于正式 browser-support policy。

### 4.2 Open Decisions

以下不能由 Codex 自行发明：

| Decision | Provisional default | 影响 |
| --- | --- | --- |
| HTML prerequisite | learner 会阅读基础 HTML / DOM | selector、fixture、course entry |
| CSS prerequisite | zero CSS | M1 起点 |
| Foundations endpoint | 能实现 + 解释 + 系统 debug 常见 CSS | 全课程 scope |
| styling vs layout | 都覆盖，system/layout mental model 优先 | Module depth |
| browser policy | modern evergreen，需正式确认 | compatibility/source |
| Lesson 粒度 | 10–20 min，一个核心 mental model | Lesson 数量 |
| Exercise 密度 | 通常 2–4，默认约 3 | production volume |
| capstone | fixed HTML + CSS-only integrated capstone | Workspace/checker |

进入正式课程生产前必须由人类审核这些决定。

Codex 可以检查仓库是否已有新证据，但不得静默把 provisional default 升格为已确认决策。

---

## 5. CSS Foundations v1 provisional endpoint

完成 CSS Foundations v1 后，learner 应能够：

> 面对已有、语义合理的 HTML，阅读和编写 CSS；预测规则如何匹配、竞争和继承；理解 box 与 normal flow；使用 Flexbox、Grid 和 positioning 建立布局；让布局适应不同可用空间；并从 selector、cascade、resolved value、formatting context、constraint 等层面系统解释“为什么 CSS 没生效”。

这一定义优先于“学过多少 property”。

### 5.1 v1 core 暂不纳入

除非 Learner Contract 复审明确改变：

- advanced animation systems。
- container queries。
- subgrid 深入。
- cascade layers 深入。
- CSS nesting 深入。
- CSS architecture methodology。
- complex form normalization。
- multi-column layout 深入。
- print CSS。
- browser-specific compatibility training。

这些不代表“不重要”，只是不属于第一版最小完整 mental-model graph。

---

## 6. Curriculum Architecture

建议 9 个 Module：

| # | slug | Module | Core mental model |
| --- | --- | --- | --- |
| M1 | `css-language-and-selection` | CSS 规则与命中 | 规则先匹配元素，再产生候选 declarations |
| M2 | `cascade-and-values` | Cascade、Inheritance 与 Values | 多个候选值经过 cascade / inheritance / value processing 得到最终结果 |
| M3 | `box-model-and-flow` | Box Model 与 Normal Flow | DOM 元素生成盒子，盒子有尺寸、间距并先参与 normal flow |
| M4 | `visual-styling-and-typography` | 视觉样式与文字 | paint、color、font、text 建立在 value/inheritance/box 上 |
| M5 | `flexbox` | Flexbox | 一维 formatting context 中沿 main/cross axis 分配空间 |
| M6 | `grid` | Grid | 二维 track system 中定义空间再放置 items |
| M7 | `flow-positioning-and-layering` | Flow Override、Positioning 与 Layering | 不同机制改变 normal flow、reference context 与 paint order |
| M8 | `responsive-css` | Responsive CSS | 规则随可用空间和环境条件变化 |
| M9 | `integration-and-debugging` | 系统整合与 Debugging | 从症状反向定位 selector → cascade → value → layout prerequisite → constraint |

### 6.1 Dependency graph

```text
M1 CSS Language & Selection
→ M2 Cascade, Inheritance & Values
→ M3 Box Model & Normal Flow

M3 → M4 Visual Styling & Typography
M3 → M5 Flexbox
M3 → M6 Grid
M3 + M4 → M7 Flow / Positioning / Layering
M3 + M5 + M6 → M8 Responsive CSS

M1 ~ M8
→ M9 Integration & Debugging
```

Flexbox 和 Grid 是 sibling layout systems；课程顺序可以 Flex → Grid，但 dependency 不应定义为“Grid 依赖 Flexbox”。

---

## 7. Lesson Map

### M1 — CSS Language & Selection

1. `css-rules-and-declarations`
   - Mental model: selector 决定目标；declaration 提供候选 property/value。
   - Exercises: 3。
   - Fit: READY。
2. `selector-matching`
   - Mental model: selector 定义 matched element set。
   - Exercises: 3。
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
3. `selector-relationships-and-structure`
   - Mental model: combinator / attribute / structural selector 描述 DOM relationship/state。
   - Exercises: 3–4。
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。

### M2 — Cascade, Inheritance & Values

1. `cascade-and-specificity`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
2. `inheritance-and-defaults`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
3. `values-units-and-functions`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
4. `custom-properties-and-fallbacks`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。

### M3 — Box Model & Normal Flow

1. `box-model-and-box-sizing`
   - Fit: READY。
2. `block-inline-and-display`
   - Fit: READY。
3. `sizing-constraints-and-overflow`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
4. `normal-flow-and-spacing`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。

### M4 — Visual Styling & Typography

1. `color-backgrounds-and-borders`
   - Fit: READY。
2. `typography-and-text-flow`
   - Fit: READY。
3. `interaction-states-and-focus`
   - Fit: NEEDS_CHECKER_CAPABILITY。

### M5 — Flexbox

1. `flex-formatting-context-and-axes`
   - Fit: READY。
2. `flexbox-alignment`
   - 现有 Lesson，需迁移为 order 2。
   - Fit: READY。
3. `flex-wrapping-and-multiline-alignment`
   - Fit: READY。
4. `flexible-items-and-free-space`
   - Fit: READY。
5. `flex-item-control-and-order`
   - Fit: READY。

### M6 — Grid

1. `grid-formatting-context-and-tracks`
   - Fit: NEEDS_CHECKER_CAPABILITY。
2. `grid-placement-and-lines`
   - Fit: READY。
3. `implicit-grid-and-auto-placement`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
4. `grid-alignment-and-gaps`
   - Fit: READY。

### M7 — Flow, Positioning & Layering

1. `positioned-layout-and-containing-blocks`
   - Fit: READY。
2. `fixed-and-sticky-positioning`
   - Fit: NEEDS_CHECKER_CAPABILITY。
3. `stacking-context-and-z-index`
   - Fit: NEEDS_CHECKER_CAPABILITY。
4. `floats-and-flow-interaction`
   - Fit: READY。

### M8 — Responsive CSS

1. `fluid-sizing-and-responsive-constraints`
   - Fit: NEEDS_CHECKER_CAPABILITY。
2. `media-queries-and-breakpoints`
   - Fit: NEEDS_CHECKER_CAPABILITY。
3. `responsive-layout-strategies`
   - Fit: NEEDS_CHECKER_CAPABILITY。

### M9 — Integration & Debugging

1. `diagnose-css-systematically`
   - Fit: TEACHABLE_BUT_CHECKER_LIMITED。
2. `responsive-component-capstone`
   - Fit: NEEDS_CHECKER_CAPABILITY。

### 7.1 Initial fit count

```text
READY                          14
TEACHABLE_BUT_CHECKER_LIMITED  10
NEEDS_CHECKER_CAPABILITY        8
NEEDS_WORKSPACE_CAPABILITY      0
NEEDS_ACTIVITY_CAPABILITY       0
```

这是 implementation fit，不是 Lesson 质量评分。

---

## 8. 当前 flexbox-alignment 的正式定位

当前 Lesson 的核心观点正确：

```text
flex-direction
→ main axis / cross axis
→ justify-content / align-items
```

但它不适合作为 Flexbox 第一课。

正式顺序建议：

```text
01 flex-formatting-context-and-axes
02 flexbox-alignment
03 flex-wrapping-and-multiline-alignment
04 flexible-items-and-free-space
05 flex-item-control-and-order
```

现有 3 个 Exercise 可以保留核心意图，但正式 review 时需要检查：

- 是否过度依赖默认 `row`。
- 是否需要新增真正的 `column` transfer exercise。
- Exercise prompt 是否仍与新前置 Lesson 重复。
- checker 是否接受合理等价 computed values。
- source grounding 是否完整。

不能为了新 Curriculum 直接手改 order；应先补 deterministic reorder/migration tooling。

---

## 9. Capability Gap Register

### 9.1 Activity

当前 v1 core 没有强制 Activity gap。

```text
NEEDS_ACTIVITY_CAPABILITY = 0
```

如果未来真实 Lesson 证明 Concept/Predict/Compare/Exercise 不够，再独立提出能力扩展。

### 9.2 Workspace

在 provisional contract “基础 HTML 可读、HTML 固定、CSS editable” 下，没有 core Lesson 必须要求 HTML editing。

如果未来 endpoint 改为“从空白 HTML + CSS 构建页面”，必须重新分类相关 Lesson，不得偷偷把 HTML authoring 藏进 fixture。

### 9.3 Checker

已知真实 gap：

1. source-aware CSS validation。
2. geometry/layout validation。
3. pseudo-state validation。
4. pseudo-element validation。
5. scroll-state validation。
6. paint/stacking validation。
7. multi-viewport validation。
8. authored Grid track validation。

禁止为了可判题把真实 learning outcome 改成方便的 proxy。

### 9.4 Preview / Runtime

当前不是 core blocker，但未来可能需要：

- deterministic viewport matrix。
- controlled hover/focus state。
- controlled scroll state。
- environment emulation。
- geometric observation API。

### 9.5 Authoring Tooling

实施前必须解决：

```text
Module scaffold
Existing entity reorder / migration
```

否则将破坏“确定性结构优先”的 authoring 原则。

---

## 10. freeCodeCamp benchmark 的重新确认

当前 freeCodeCamp curriculum 同时包含：

- topical modules。
- lecture。
- workshop / lab。
- review。
- quiz。
- certification project。

旧式 Flexbox challenge sequence 也体现了高密度 micro-step practice。

CSS Lab 应借鉴：

- coverage discipline。
- beginner progression。
- repetition。
- project/lab cadence。
- automatic validation。

CSS Lab 不应复制：

- learner-facing prose。
- property-by-property Lesson boundary。
- “下一步输入这一行”的长期教学模式。
- unique task sequence。
- checker-driven curriculum objective。

CSS Lab 的差异应保持：

```text
mental model
→ prediction
→ observation
→ implementation
→ failure
→ diagnosis
→ transfer
```

---

## 11. Debugging strategy

Debugging 不只存在于 M9。

建议逐 Module 埋入 debugging-oriented Exercise：

```text
M1 selector 没命中
M2 cascade 覆盖
M3 sizing / flow 预期错误
M5 axis / flex prerequisite
M6 track / placement
M7 sticky / stacking prerequisite
M8 media query / responsive condition
```

M9 负责把这些局部 diagnosis rules 整合为统一 pipeline：

```text
match
→ cascade
→ value
→ formatting context
→ constraint
→ environment
```

---

## 12. Production principles

正式生产阶段必须：

1. 先冻结 Learner Contract。
2. 先补 deterministic Module / reorder tooling。
3. 新 Module 默认 draft。
4. 每个 Module 独立 source grounding。
5. 每批最多创建 1–2 个 Lesson。
6. 每个 Lesson 先设计 mental model / misconceptions / exercise objectives，再 scaffold。
7. 不一次生成整个 Course。
8. 每批都运行完整 content gates。
9. learner-visible experience 改动必须运行 E2E。
10. 不降低 Content Contract 来让测试通过。

---

## 13. Required quality gates

每批至少：

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm test:authoring-skill
pnpm lint
pnpm build
```

涉及 learner-visible content：

```bash
pnpm test:e2e
```

额外：

```bash
git diff --check
```

---

## 14. 决策状态

### 已有足够依据

- 课程必须 mental-model oriented。
- selector / cascade / box / flow 必须在 Flex/Grid 前。
- Flexbox 先 axes，再 alignment。
- Responsive 不应被降级成 media-query syntax chapter。
- Debugging 应贯穿课程。
- 当前 checker 是 curriculum constraint，但不能反过来定义 curriculum。
- Module/reorder deterministic tooling 是 production prerequisite。
- 当前核心 v1 不需要新增 Activity primitive。

### 仍依赖人类确认

- HTML prerequisite。
- zero-CSS entry。
- endpoint。
- browser support policy。
- Lesson / Exercise density。
- capstone 边界。
- animation 是否排除在 v1 core。

在这些决策未冻结前，Codex 不得开始大规模课程 scaffold。
