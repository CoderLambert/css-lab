# Task 06 — M3 Box Model & Normal Flow

## 1. Module goal

建立布局前最重要的底层 mental model：

```text
element
→ generated box
→ box edges / sizing constraints
→ normal flow
→ overflow / spacing behavior
```

Module：

```text
box-model-and-flow
```

Prerequisite：M1 + M2。

---

## 2. Source grounding

优先：

- CSS Box Model。
- CSS Display。
- CSS Sizing。
- CSS Overflow。
- relevant CSS2 / current CSSWG normal flow definitions。
- MDN box model / display / sizing / overflow / normal flow。

margin collapsing 必须基于 authoritative behavior，不靠经验口诀。

---

## 3. Batch plan

```text
Batch A
  box-model-and-box-sizing
  block-inline-and-display

Batch B
  sizing-constraints-and-overflow
  normal-flow-and-spacing
```

---

## 4. Lesson — box-model-and-box-sizing

Mental model：

```text
content box
→ padding
→ border
→ margin
```

`box-sizing` 改变 authored size 如何映射到 box edges。

Misconceptions：

- width 永远是最终可见宽度。
- margin 在 border 内。
- border 不参与 rendered size。
- border-box 让所有尺寸问题消失。

Exercises：

1. add padding/border and predict total size。
2. switch content-box / border-box。
3. debug overflow caused by sizing assumption。

Checker：declarations 可可靠检查。

Fit：READY。

---

## 5. Lesson — block-inline-and-display

Mental model：

> `display` 决定 box 的 outer/inner participation behavior；block/inline 不只是“是否换行”。

Scope：

- block。
- inline。
- inline-block。
- none。
- 引出 flex/grid，但不提前深入。

Misconceptions：

- inline 可以与 block 一样自由设置所有 sizing behavior。
- `display:none` 只是透明。
- block = width:100%。

Exercises：

1. block vs inline observation。
2. inline-block sizing。
3. display none / debugging。

Fit：READY。

---

## 6. Lesson — sizing-constraints-and-overflow

Mental model：

> 最终尺寸来自 intrinsic content + authored constraints + containing context，而不是一条 width 指令。

Scope：

- width/height basics。
- min/max constraints。
- overflow。
- intrinsic behavior。
- `max-width: 100%` 等案例只在 mental model需要时出现。

Misconceptions：

- fixed width 总能赢。
- overflow:hidden 是通用修复。
- min/max 只是 width 的简写替代。
- content 永远会被 box 自动压缩。

Exercises：

1. oversized content observation。
2. min/max constraint。
3. overflow strategy。
4. debug fixed-width failure。

Checker limitation：真实 geometry / overflow outcome 当前不完全可验证。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 7. Lesson — normal-flow-and-spacing

Mental model：

> 在没有特殊 layout/positioning 时，浏览器已经在运行 normal flow algorithm。

Scope：

- block flow。
- inline flow high-level。
- margin spacing。
- auto margin high-level。
- margin collapsing。
- 不在此 Lesson 教 Flex/Grid。

Misconceptions：

- 不写 layout 就“没有布局”。
- 元素默认靠 x/y 坐标放置。
- vertical margins 必然相加。
- margin collapse 是随机 bug。

Exercises：

1. observe default flow。
2. spacing with margin。
3. margin collapse Compare/Predict。
4. debugging flow assumption。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 8. Checker constraints

禁止使用固定 pixel geometry proxy 来宣称 learner 掌握：

- margin collapse。
- intrinsic sizing。
- overflow geometry。

可以诚实检查：

- relevant declarations。
- display values。
- box-sizing。
- min/max property。

---

## 9. Acceptance Criteria

- [ ] Box mental model 在 Flex/Grid 前完整建立。
- [ ] display lesson 没有提前变成 Flexbox lesson。
- [ ] normal flow 被明确作为默认 layout algorithm。
- [ ] overflow 不被教成隐藏问题的 shortcut。
- [ ] checker coverage claims truthful。
- [ ] all gates pass。
