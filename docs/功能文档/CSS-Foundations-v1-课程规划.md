# CSS Foundations v1 — 课程规划基线

> Status: Confirmed / Production baseline
>
> Repository baseline reviewed for Task 01: `feat/css-foundations-v1-curriculum-plan@0f2607bc7a4f97687febd7c21c2a497e18ca80dd`
>
> Task 01 freezes the Learner Contract and curriculum boundary. This document is the product/curriculum baseline for subsequent tooling and content production; it does not claim that the planned Lessons already exist.

---

## 1. 课程目标

CSS Foundations v1 不按 property list 组织课程，而按可迁移 mental model 组织：

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

Course hierarchy remains:

```text
Course → Module → Lesson → Activity → Exercise → Checker
```

正式 Activity v1 只有 `Concept / Predict / Compare / Exercise`。调试任务优先通过错误 starter state 的普通 Exercise 表达，不为了课程完整感新增 Activity primitive。

---

## 2. Learner Contract — Confirmed

Task 01 已按 scheduled execution contract 冻结以下 v1 baseline。后续 Task 不再把这些项目视为 blocking open decisions。

| Decision | Confirmed v1 baseline | Consequence |
| --- | --- | --- |
| HTML prerequisite | learner 能阅读基础 HTML / DOM | 可以解释 selector / structure；不承担 HTML 入门教学 |
| CSS prerequisite | zero CSS | M1 从 rule / declaration / matching 开始 |
| endpoint | 能实现、解释并系统 debug 常见 CSS | scope 由 mental-model graph 决定，不由 property 数量决定 |
| styling vs layout | visual styling + layout；system/layout mental model 优先 | 不做纯视觉 property catalog |
| browser policy | 面向 modern evergreen CSS semantics | 自动化事实仍只宣称当前 Chromium coverage；不把它等同跨浏览器验证 |
| learner language | 中文 | learner-facing prose 默认中文 |
| code / identifiers | 英文 | selector/class/property/value/code identifiers 使用英文 |
| Lesson granularity | 10–20 min；一个核心 mental model | 需要第二个独立 mental model 时拆 Lesson |
| Exercise density | 通常 2–4；默认约 3 | 以 transfer / misconception coverage 为准，不机械凑数 |
| capstone | included | M9 保留 integrated capstone |
| capstone boundary | fixed HTML + CSS-only | v1 不要求 HTML editing Workspace capability |
| advanced CSS | 不进入 v1 core | advanced animation、container queries、subgrid deep dive 等延后 |

### 2.1 Formal endpoint

完成 CSS Foundations v1 后，learner 应能够：

> 面对已有、语义合理的 HTML，阅读和编写 CSS；预测规则如何匹配、竞争和继承；理解 box 与 normal flow；使用 Flexbox、Grid 和 positioning 建立布局；让布局适应不同可用空间；并从 selector、cascade、value、formatting context、constraint 与 environment 等层面系统解释“为什么 CSS 没生效”。

### 2.2 v1 core exclusions

以下不属于 CSS Foundations v1 core：

- advanced animation systems；
- container queries；
- subgrid 深入；
- cascade layers 深入；
- CSS nesting 深入；
- CSS architecture methodology；
- complex form normalization；
- multi-column layout 深入；
- print CSS；
- browser-specific compatibility training。

这些主题可以进入后续课程，但不得在 v1 production 中隐式扩大 scope。

---

## 3. Repository / Product Constraints

当前生产必须遵守：

- learner editable surface 以 CSS 为主；HTML fixture 是可信、固定实验环境。
- Lesson 围绕 mental model，不围绕 property list。
- Activity v1 只有 Concept / Predict / Compare / Exercise。
- Checker vocabulary 只有 `style / exists / count`；`style` 检查 resolved result。
- 新课程内容默认 `draft`。
- Preview 已有 Auto / 390 / 768 / 1280 presets。
- 当前正式 automated browser coverage 是 Chromium。
- checker 是 curriculum implementation constraint，但不能反过来定义错误的 learning outcome。
- 不能为了可判题把真实 outcome 换成错误 proxy。

技术事实 evidence hierarchy：

```text
CSSWG / W3C specifications
→ MDN
→ 其他高质量 primary / authoritative references
```

freeCodeCamp 只作为 coverage / progression / practice cadence benchmark，不作为 CSS semantics authority，也不复制 learner-facing prose、exercise wording、solution 或 unique task sequence。

---

## 4. Confirmed Curriculum Architecture

9 Module architecture 在 Task 01 复核后保持不变：

| # | slug | Core mental model |
| --- | --- | --- |
| M1 | `css-language-and-selection` | 规则先匹配元素，再产生候选 declarations |
| M2 | `cascade-and-values` | 候选值经 cascade / inheritance / value processing 得到结果 |
| M3 | `box-model-and-flow` | 元素生成盒子，盒子有尺寸、间距并先参与 normal flow |
| M4 | `visual-styling-and-typography` | paint / color / font / text 建立在 value / inheritance / box 上 |
| M5 | `flexbox` | 一维 formatting context 沿 main/cross axis 分配空间 |
| M6 | `grid` | 二维 track system 中定义空间再放置 items |
| M7 | `flow-positioning-and-layering` | 不同机制改变 normal flow、reference context 与 paint order |
| M8 | `responsive-css` | 规则随可用空间和环境条件变化 |
| M9 | `integration-and-debugging` | 从症状反向定位 selector → cascade → value → layout prerequisite → constraint |

Dependency graph：

```text
M1 → M2 → M3
M3 → M4
M3 → M5
M3 → M6
M3 + M4 → M7
M3 + M5 + M6 → M8
M1 ~ M8 → M9
```

Flexbox 与 Grid 是 sibling layout systems；课程顺序可以 Flex → Grid，但 Grid 不以 Flexbox 为知识 prerequisite。

---

## 5. Confirmed 32-Lesson Map

Task 01 对 lesson boundary、dependency、practiceability、observability、checkability、misconception coverage 与 product fit 复核后，不需要在生产前合并或拆分 Lesson。32 Lesson map 冻结如下。

### M1 — CSS Language & Selection

1. `css-rules-and-declarations` — READY
2. `selector-matching` — TEACHABLE_BUT_CHECKER_LIMITED
3. `selector-relationships-and-structure` — TEACHABLE_BUT_CHECKER_LIMITED

### M2 — Cascade, Inheritance & Values

1. `cascade-and-specificity` — TEACHABLE_BUT_CHECKER_LIMITED
2. `inheritance-and-defaults` — TEACHABLE_BUT_CHECKER_LIMITED
3. `values-units-and-functions` — TEACHABLE_BUT_CHECKER_LIMITED
4. `custom-properties-and-fallbacks` — TEACHABLE_BUT_CHECKER_LIMITED

### M3 — Box Model & Normal Flow

1. `box-model-and-box-sizing` — READY
2. `block-inline-and-display` — READY
3. `sizing-constraints-and-overflow` — TEACHABLE_BUT_CHECKER_LIMITED
4. `normal-flow-and-spacing` — TEACHABLE_BUT_CHECKER_LIMITED

### M4 — Visual Styling & Typography

1. `color-backgrounds-and-borders` — READY
2. `typography-and-text-flow` — READY
3. `interaction-states-and-focus` — NEEDS_CHECKER_CAPABILITY

### M5 — Flexbox

1. `flex-formatting-context-and-axes` — READY
2. `flexbox-alignment` — READY; existing Lesson moves to order 2 via deterministic migration
3. `flex-wrapping-and-multiline-alignment` — READY
4. `flexible-items-and-free-space` — READY
5. `flex-item-control-and-order` — READY

### M6 — Grid

1. `grid-formatting-context-and-tracks` — NEEDS_CHECKER_CAPABILITY
2. `grid-placement-and-lines` — READY
3. `implicit-grid-and-auto-placement` — TEACHABLE_BUT_CHECKER_LIMITED
4. `grid-alignment-and-gaps` — READY

### M7 — Flow, Positioning & Layering

1. `positioned-layout-and-containing-blocks` — READY
2. `fixed-and-sticky-positioning` — NEEDS_CHECKER_CAPABILITY
3. `stacking-context-and-z-index` — NEEDS_CHECKER_CAPABILITY
4. `floats-and-flow-interaction` — READY

### M8 — Responsive CSS

1. `fluid-sizing-and-responsive-constraints` — NEEDS_CHECKER_CAPABILITY
2. `media-queries-and-breakpoints` — NEEDS_CHECKER_CAPABILITY
3. `responsive-layout-strategies` — NEEDS_CHECKER_CAPABILITY

### M9 — Integration & Debugging

1. `diagnose-css-systematically` — TEACHABLE_BUT_CHECKER_LIMITED
2. `responsive-component-capstone` — NEEDS_CHECKER_CAPABILITY

Initial implementation-fit distribution remains:

```text
READY                          14
TEACHABLE_BUT_CHECKER_LIMITED  10
NEEDS_CHECKER_CAPABILITY        8
NEEDS_WORKSPACE_CAPABILITY      0
NEEDS_ACTIVITY_CAPABILITY       0
```

Fit 是 implementation classification，不是 Lesson 质量评分。Task 13 必须按最终内容重新分类。

---

## 6. Existing flexbox-alignment

现有 Lesson 的核心 mental model 保留：

```text
flex-direction
→ main axis / cross axis
→ justify-content / align-items
```

正式顺序：

```text
01 flex-formatting-context-and-axes
02 flexbox-alignment
03 flex-wrapping-and-multiline-alignment
04 flexible-items-and-free-space
05 flex-item-control-and-order
```

现有 stable IDs 不因课程重排改变。order 迁移必须由 Task 02 提供的 deterministic reorder/migration tooling 执行，不能手改规避 authoring contract。

---

## 7. Capability Gap Baseline

### Activity

v1 core 不需要新增 Activity primitive。

### Workspace

在 confirmed fixed-HTML / CSS-only contract 下，没有 core Lesson 必须要求 HTML editing。

### Checker

已知候选 gap：

1. source-aware CSS validation；
2. geometry/layout validation；
3. pseudo-state validation；
4. pseudo-element validation；
5. scroll-state validation；
6. paint/stacking validation；
7. multi-viewport validation；
8. authored Grid track validation。

这些 gap 不授权 Lane B/C 实现平台 capability。无法诚实判定时保持 draft / limited classification，最终由 Task 13 复核。

### Preview / Runtime

当前不是 core blocker。未来可能需要 deterministic viewport matrix、controlled hover/focus、controlled scroll、environment emulation 或 geometric observation API；这些不在本课程生产任务中顺带实现。

### Authoring Tooling

正式 Course scaffold 前必须补：

```text
Module scaffold
Existing entity reorder / migration
```

这是 Task 02 的 blocker 与职责。

---

## 8. Debugging Strategy

Debugging 贯穿课程，而不是只存在于 M9：

```text
M1 selector 没命中
M2 cascade 覆盖
M3 sizing / flow 预期错误
M5 axis / flex prerequisite
M6 track / placement
M7 sticky / stacking prerequisite
M8 media query / responsive condition
```

M9 统一 diagnosis pipeline：

```text
match
→ cascade
→ value
→ formatting context
→ constraint
→ environment
```

---

## 9. Production Contract

后续生产必须：

1. 先完成 Task 02 deterministic Module / reorder tooling。
2. Task 03 只建立 curriculum structure，不创作 learner-facing Lesson 正文。
3. 新 Module / Lesson 默认 draft。
4. 每个 Module 独立 source grounding。
5. 每批最多 1–2 个 Lesson，不跨 Module。
6. 每个 Lesson 先明确 mental model、misconceptions、exercise objectives，再 scaffold。
7. 不新增 per-exercise JavaScript checker。
8. 不降低 Content Contract 来让测试通过。
9. 不因为 checker limitation 改写真实 CSS semantics。
10. scheduled mode 的 fast gate / deferred full gate 以 `00-执行总计划与Codex编排.md` 为准。

---

## 10. Task 01 Decision Status

### Confirmed

- HTML prerequisite：基础 HTML / DOM 阅读能力。
- CSS prerequisite：zero CSS。
- endpoint：实现 + 解释 + 系统 debug 常见 CSS。
- styling/layout scope：两者都覆盖，system/layout mental model 优先。
- browser policy：modern evergreen semantics；当前自动化只宣称 Chromium coverage。
- learner-facing language：中文。
- code / identifier language：英文。
- Lesson granularity：10–20 min / 一个核心 mental model。
- Exercise density：通常 2–4 / 默认约 3。
- capstone：包含；fixed HTML + CSS-only。
- advanced animation / container queries / subgrid deep dive 等：排除在 v1 core。
- 9 Module architecture：confirmed。
- 32 Lesson map：confirmed for production baseline。
- initial capability classification：reviewed and retained；Task 13 finalizes from actual content。

### Blocking open decisions

```text
none
```

任何后续证据若要求新增 Workspace / Checker / Runtime / Activity capability，或会显著扩大课程边界，必须停在对应 Task 的 capability gate；不能把 Task 01 的 baseline 当作实现新平台能力的授权。
