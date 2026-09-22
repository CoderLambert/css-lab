# Task 07 — M4 Visual Styling & Typography

## 1. Module goal

让 learner 理解：

```text
layout box exists
→ paint / color / border
→ inherited text style
→ text metrics influence layout
→ interaction states alter matched styling
```

Module：

```text
visual-styling-and-typography
```

Prerequisite：M2 + M3。

---

## 2. Source grounding

优先：

- CSS Color。
- Backgrounds and Borders。
- CSS Fonts。
- CSS Text。
- Selectors pseudo-class definitions。
- MDN color / backgrounds / borders / typography / focus-visible。

涉及 focus 必须同时核对 accessibility guidance，但本 Module 不扩展成完整 accessibility curriculum。

---

## 3. Batch plan

```text
Batch A
  color-backgrounds-and-borders
  typography-and-text-flow

Batch B
  interaction-states-and-focus
```

---

## 4. Lesson — color-backgrounds-and-borders

Mental model：

> foreground/background/border 是不同 painting layers；visual styling 建立在 box model 上，不等于 layout。

Outcome：

- apply text color。
- background。
- border/radius。
- 预测 border 对 box size 的影响（连接 M3）。

Misconceptions：

- background 会自动改变 box dimensions。
- border 纯装饰，不影响 box model。
- color 与 background-color 是同一层。

Exercises：3。

Checker：computed styles 适合。

Fit：READY。

---

## 5. Lesson — typography-and-text-flow

Mental model：

> 字体和 line metrics 既是视觉样式，也是 layout input；很多文字属性继承。

Scope：

- font-family。
- font-size。
- font-weight。
- line-height。
- text-align。
- wrapping/measure 的基础观察。
- 不做 advanced font loading。

Misconceptions：

- font-size 只影响“看起来多大”。
- line-height 必须等于 font-size。
- 文本样式都只作用单个 text node。
- 设置固定 height 是控制文字排版的好方法。

Exercises：

1. inherited typography。
2. line-height/readability。
3. text flow within constrained box。

Fit：READY。

---

## 6. Lesson — interaction-states-and-focus

Mental model：

> pseudo-class 匹配元素的当前状态；状态变化会改变 matched rule set。

Scope：

- `:hover`。
- `:focus`。
- `:focus-visible`。
- 必要时 `:active` 做 Compare。
- 不把全部 pseudo-class 放进一课。

Misconceptions：

- hover 是永久 class。
- focus 只与鼠标有关。
- outline 可以无条件删除。
- pseudo-class 创建新 DOM element。

Exercise：

1. hover styling。
2. focus/focus-visible styling。
3. compare mouse vs keyboard state。

当前 checker 无法主动控制 pseudo-state 并可靠运行 style assertion。

Fit：NEEDS_CHECKER_CAPABILITY。

### Production rule

允许 author Lesson narrative / Predict / Compare / draft Exercise design。

不得：

- 为发布强行检查静态 non-state property 作为假 proxy。
- 新增 per-exercise JS。
- 在本 Task 扩展 checker runtime。

把 gap 记录到 Task 13。

---

## 7. Acceptance Criteria

- [ ] Visual vs layout distinction 清楚。
- [ ] typography 与 inheritance / layout 连接。
- [ ] focus lesson 不破坏 accessibility baseline。
- [ ] pseudo-state checker gap 明确记录。
- [ ] no checker scope expansion。
- [ ] all eligible content gates pass。
