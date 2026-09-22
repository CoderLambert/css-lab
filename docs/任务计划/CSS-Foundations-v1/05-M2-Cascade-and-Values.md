# Task 05 — M2 Cascade, Inheritance & Values

## 1. Module goal

建立：

```text
matched declarations
→ cascade
→ inheritance/defaults
→ value processing
→ resolved result
```

避免 learner 把 CSS 错误统一理解为“属性没生效”。

Module：

```text
cascade-and-values
```

Prerequisite：M1。

---

## 2. Source grounding

优先：

- CSS Cascading and Inheritance spec。
- CSS Values and Units spec。
- CSS Custom Properties spec / relevant CSSWG source。
- MDN cascade / specificity / inheritance / values / units / custom properties。

重点 grounding：

- origin / importance 只讲 Foundations 真正需要范围。
- specificity。
- source order。
- inheritance / initial / unset 等只按 lesson scope。
- specified / computed / used / resolved value distinction。
- relative units reference context。
- custom property cascade / inheritance / var fallback。

不要把 cascade layers 深入纳入 v1 core，除非 Task 01 已改变 scope。

---

## 3. Batch plan

```text
Batch A
  cascade-and-specificity
  inheritance-and-defaults

Batch B
  values-units-and-functions
  custom-properties-and-fallbacks
```

每批独立 validate / review。

---

## 4. Lesson — cascade-and-specificity

Mental model：

> 同一个 property 可能有多个 candidate declarations；浏览器通过 cascade 决定 winner。

Outcome：

- 能分析简单 conflicting rules。
- 能区分 source order 与 specificity。
- 不使用 `!important` 作为默认修复。

Misconceptions：

- 后写永远赢。
- selector 字符更多就 specificity 更高。
- specificity 是整个 stylesheet 的全局排名。

Exercises：

1. same specificity + source order。
2. different specificity。
3. debugging conflict。

Checker：

final resolved style 可检查，但 checker 不能证明 learner 是否真正理解 winning mechanism。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 5. Lesson — inheritance-and-defaults

Mental model：

> child 没有显式 winning declaration 不等于“没有值”；property 可能 inherit 或回到 initial/default behavior。

Outcome：

- trace inherited value。
- distinguish inherited vs non-inherited property。
- override inherited value deliberately。

Misconceptions：

- 所有 CSS properties 都继承。
- 没写 CSS 就没有 value。
- inherited style 和 selector matching 是同一机制。

Exercises：

1. inherited text property。
2. non-inherited contrast。
3. nested override / debugging。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

避免用 hardcoded child value 作为“理解 inheritance”的唯一 pass condition。

---

## 6. Lesson — values-units-and-functions

Mental model：

> CSS authored value 需要结合 property/context 才能变成实际结果；source spelling 与 resolved/used result 不总相同。

Scope：

- absolute length。
- percentage。
- rem/em。
- viewport relative unit 只做基础。
- `calc()`。
- 必要的 keywords。

Outcome：

- 能判断常用 relative unit 的 reference context。
- 能选择合理 unit。
- 能理解 checker/runtime 看到的 computed/resolved result 可能被 normalize。

Misconceptions：

- `rem` 相对 parent。
- 所有 percentage 都相对 viewport。
- source CSS value 必然原样出现在 getComputedStyle。
- relative unit 本身等于 responsive design。

Exercises：

1. absolute vs relative observation。
2. rem/em context。
3. percentage reference。
4. calc constraint。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

检查必须避免把最终 px 值错误宣传为 learner 必须使用的 authored unit。

---

## 7. Lesson — custom-properties-and-fallbacks

Mental model：

> custom property 是参与 cascade/inheritance 的 CSS value carrier；`var()` 在使用点 substitution。

Outcome：

- define/use variable。
- scoped override。
- fallback。
- trace inherited custom property。

Misconceptions：

- CSS variable 是 JS/global constant。
- fallback 总会使用。
- custom property 不参与 cascade。

Exercises：

1. define/use。
2. nested override。
3. fallback / broken variable debugging。

Checker：

可查 custom property resolved token value和最终 property，但无法证明 learner 的 linkage strategy 是唯一实现。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 8. Module review focus

Reviewer 必须检查：

- 是否把 cascade 与 selector matching 混在一起。
- 是否把 inheritance 描述成 universal。
- 是否正确处理 computed/used/resolved terminology。
- unit reference context 是否准确。
- custom properties 是否正确表达 cascade/inheritance。
- checker 是否因 normalized values reject valid CSS。

---

## 9. Acceptance Criteria

- [ ] 4 Lesson dependency 清楚。
- [ ] 至少一个 cascade debugging Exercise。
- [ ] learner 不被训练成依赖 `!important`。
- [ ] values lesson 不把 getComputedStyle 简化成 source CSS。
- [ ] checker limitations explicitly documented。
- [ ] no new matcher/checker framework。
- [ ] all gates pass。
