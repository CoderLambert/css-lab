# Task 12 — M9 Integration & Debugging

## 1. Module goal

把前 8 个 Module 的局部 mental models 整合为可迁移 debugging workflow。

Module：

```text
integration-and-debugging
```

Prerequisite：M1–M8 core mental models。

---

## 2. Systematic debugging model

最终 Lesson 应建立类似：

```text
1. Did the selector match?
2. Did another declaration win?
3. What value did the browser resolve?
4. Is the required formatting context active?
5. Are sizing / intrinsic / overflow constraints changing the result?
6. Is positioning / stacking / scroll context relevant?
7. Is an environment / viewport condition controlling the rule?
```

这不是固定 DevTools checklist，而是课程 mental-model synthesis。

---

## 3. Source grounding

本 Module 的 source set 主要来自前 8 个 Module 已确认 claims。

还需要：

- MDN debugging CSS guidance。
- browser DevTools conceptual guidance only if learner-facing content真的引用。
- CSSWG sources用于重新验证关键因果关系。

禁止引入大量全新 CSS topics。

---

## 4. Batch plan

```text
Batch A
  diagnose-css-systematically

Batch B
  responsive-component-capstone
```

两课都需要单独 review。

---

## 5. Lesson — diagnose-css-systematically

Mental model：

> “CSS 没生效”不是一个原因类别，而是 pipeline 中某一阶段不满足预期。

Activities：

```text
Concept
→ multiple Predict
→ Compare
→ debugging-oriented Exercises
```

建议 4 Exercises：

1. selector mismatch。
2. cascade winner conflict。
3. flex/grid formatting-context prerequisite。
4. sizing/constraint/environment failure。

Starter state 必须是真实 plausible bug，不是故意拼写错误合集。

Progressive hints：

1. 定位 pipeline stage。
2. 提醒对应 mental model。
3. 接近实现方向。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

Checker 可确认最终修复状态，但不能证明 learner 的 diagnosis path。

---

## 6. Lesson — responsive-component-capstone

目标：

> 在固定、合理 HTML fixture 上完成一个综合 CSS component/page section，要求 learner 综合使用 styling、box、layout、responsive rules。

### Boundary

默认：

```text
HTML fixed
CSS editable
```

不把 capstone 偷偷升级为 HTML + CSS project。

如果 Learner Contract 已明确改变，先重新分类 Workspace fit。

### Design requirements

Capstone 不应是：

```text
复制最终 screenshot
→ 调 property 直到看起来像
```

应分阶段要求：

1. surface / typography。
2. internal component layout。
3. broader layout。
4. responsive adaptation。
5. final debugging pass。

不要把每一阶段拆成“输入指定一行 CSS”。

### Checker

多解 + responsive + geometry 使 current checker 不足。

Fit：NEEDS_CHECKER_CAPABILITY。

可以使用 honest subset checks，但不能宣称完整 capstone automated acceptance。

---

## 7. Cross-course misconception review

在 author M9 前，汇总 M1–M8 已出现 misconceptions，检查是否至少覆盖：

- selector matched wrong element。
- specificity/source order。
- inheritance。
- source value vs resolved result。
- width / box model。
- normal flow。
- main/cross axis。
- flex free space。
- Grid line/track。
- containing block。
- sticky preconditions。
- stacking context。
- media query condition。

M9 不需要重新讲全部概念，而是要求 learner 选择正确 diagnosis branch。

---

## 8. Acceptance Criteria

- [ ] debugging pipeline 来源于已学 mental models。
- [ ] Exercises 是 plausible failure states。
- [ ] hints 从概念到具体。
- [ ] capstone fixed-HTML boundary与 Learner Contract 一致。
- [ ] no HTML Editor scope creep。
- [ ] checker limitations truthful。
- [ ] all eligible content gates + E2E pass。
