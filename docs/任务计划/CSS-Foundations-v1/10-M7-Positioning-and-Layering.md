# Task 10 — M7 Flow, Positioning & Layering

## 1. Module goal

让 learner 理解不同“离开默认布局”的机制：

```text
normal flow
→ positioned layout / containing block
→ viewport / scroll interaction
→ stacking context / paint order
→ legacy float flow interaction
```

Module：

```text
flow-positioning-and-layering
```

Prerequisite：M3。部分 Lesson 可引用 M4 visual model。

---

## 2. Source grounding

优先：

- CSS Positioned Layout。
- containing block definitions。
- CSS Overflow / sticky relevant specs。
- CSS painting / stacking context authoritative references。
- CSS2 floats + current MDN guidance。
- MDN positioning / z-index / stacking context / float。

z-index 不能靠“数字越大越前”的简化说明。

---

## 3. Batch plan

```text
Batch A
  positioned-layout-and-containing-blocks
  fixed-and-sticky-positioning

Batch B
  stacking-context-and-z-index
  floats-and-flow-interaction
```

---

## 4. Lesson — positioned-layout-and-containing-blocks

Mental model：

> relative / absolute 的关键差异不只是 offset property，而是 flow participation 与 containing block/reference context。

Scope：

- static。
- relative。
- absolute。
- inset / top/right/bottom/left high-level。
- containing block。

Misconceptions：

- absolute 永远相对 viewport。
- relative 会完全脱离 normal flow。
- position:absolute 是常规 layout 替代。
- top/left 等于 translate。

Exercises：

1. relative offset observation。
2. absolute child inside positioned parent。
3. debugging: wrong containing block。

Fit：READY。

---

## 5. Lesson — fixed-and-sticky-positioning

Mental model：

> fixed 与 viewport/containing context 有特定关系；sticky 是 normal-flow participation + scroll threshold/precondition 的混合行为，不是“弱版 fixed”。

Misconceptions：

- `position:sticky` 单独就一定 stick。
- sticky 与 fixed 只差一个 property name。
- sticky failure 一定是 browser bug。
- fixed 不可能受 ancestor/context 影响。

Exercises：

1. fixed control observation。
2. sticky with inset。
3. broken sticky starter：缺少必要条件或 scroll context。

### Checker boundary

current checker 可验证 `position: sticky` / inset，但不能可靠验证 scroll behavior。

Fit：NEEDS_CHECKER_CAPABILITY。

不得用“position property equals sticky”伪装完整 behavior mastery。

---

## 6. Lesson — stacking-context-and-z-index

Mental model：

> z-index 不是全局整数排名；元素先属于 stacking context hierarchy，再在 context 内参与 painting order。

Misconceptions：

- 999999 一定最前。
- z-index 无效就是数字不够大。
- stacking context 与 DOM parent 完全相同。
- position/z-index 是唯一创建 stacking context 的方式。

Scope：

Foundations 只教授：

- stacking context concept。
- common creation cases。
- nested context consequence。
- diagnose why high z-index cannot escape parent context。

不要把所有 stacking-context trigger 做成记忆表。

Exercises：

1. simple same-context z-index。
2. nested context Compare/Predict。
3. debugging overlay。

Checker：

current style checker 能检查 z-index declaration，但不能可靠验证 final paint order / occlusion。

Fit：NEEDS_CHECKER_CAPABILITY。

---

## 7. Lesson — floats-and-flow-interaction

Mental model：

> float 改变 box placement，并允许 inline content 围绕；它是特定 flow mechanism，不是现代整体 page layout 默认方案。

Scope：

- float。
- clear。
- text wrapping use case。
- historical context简短说明。

Misconceptions：

- float 完全脱离 normal flow。
- 所有现代 layout 都应该用 float。
- clear 等于 clearfix framework。

Exercises：

1. image + text wrap。
2. clear interaction。
3. optional debug flow。

Fit：READY。

---

## 8. Reviewer focus

- containing block 定义。
- sticky prerequisites。
- stacking context hierarchy。
- float 对 flow 的真实影响。
- 不使用“坐标定位”作为错误统一模型。
- Checker coverage 与 behavior coverage 分开报告。

---

## 9. Acceptance Criteria

- [ ] normal flow 作为前置 mental model 保持。
- [ ] absolute containing block 教学准确。
- [ ] sticky gap 登记。
- [ ] stacking paint-order gap 登记。
- [ ] float 保持短而现代，不扩成 legacy layout module。
- [ ] no runtime/checker expansion。
- [ ] all gates pass。
