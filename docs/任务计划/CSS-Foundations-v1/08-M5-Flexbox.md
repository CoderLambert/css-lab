# Task 08 — M5 Flexbox

## 1. Module goal

建立完整的一维 Flexbox mental model：

```text
flex formatting context
→ flex items
→ main / cross axis
→ free space
→ alignment
→ wrapping / lines
→ grow / shrink / basis
→ per-item control
```

Module：

```text
flexbox
```

Prerequisite：M3。

当前已有 `flexbox-alignment`，必须迁移/复用，不得删除后重建稳定 ID。

---

## 2. Source grounding

优先：

- CSS Flexible Box Layout specification。
- CSS Box Alignment specification。
- MDN Flexbox guide。

freeCodeCamp Flexbox challenge sequence只作为：

- beginner repetition。
- property progression。
- exercise granularity benchmark。

不得复制挑战内容。

---

## 3. Final Lesson order

```text
1 flex-formatting-context-and-axes
2 flexbox-alignment
3 flex-wrapping-and-multiline-alignment
4 flexible-items-and-free-space
5 flex-item-control-and-order
```

Task 03 已完成或准备好 alignment order migration。

---

## 4. Batch plan

```text
Batch A
  flex-formatting-context-and-axes
  review/migrate existing flexbox-alignment

Batch B
  flex-wrapping-and-multiline-alignment
  flexible-items-and-free-space

Batch C
  flex-item-control-and-order
  full Flexbox module review
```

现有 alignment Lesson 修改必须与新前置课一起审查，避免重复教学。

---

## 5. Lesson — flex-formatting-context-and-axes

Mental model：

> `display:flex` 建立 flex formatting context；direct children 成为 flex items；`flex-direction` 定义 main axis，cross axis 与之垂直。

Misconceptions：

- Flexbox = center 工具。
- main axis = horizontal。
- `flex-direction` 只是视觉排序。

Exercises：

1. create flex context。
2. row vs column observation。
3. debugging: alignment property “方向不对”的前置 axis diagnosis。

Fit：READY。

---

## 6. Existing Lesson — flexbox-alignment

必须先 run Review mode：

```bash
node .../inspect-context.mjs --course css-foundations --module flexbox --lesson flexbox-alignment
```

审查现有：

- lesson.mdx。
- center-box。
- space-between-items。
- align-items-end。

### 保留核心

```text
justify-content → main axis
align-items → cross axis
```

### 必须检查

1. 与 Lesson 1 的 axis explanation 是否重复。
2. existing Lesson 是否承担过多“什么是 flex”内容。
3. 3 个 Exercise 是否都过度依赖 default row。
4. hints 是否重复 Lesson 1。
5. `align-items: end` / `flex-end` equivalent behavior 是否保持。
6. source grounding 是否补齐。

### 建议新增 transfer Exercise

用 fixed fixture + `flex-direction: column`：

- 要求视觉水平方向对齐。
- learner 必须真正用 cross-axis model。
- 不能只背“justify 水平 / align 垂直”。

新增 Exercise 默认 draft。

Fit：READY。

---

## 7. Lesson — flex-wrapping-and-multiline-alignment

Mental model：

> wrap 创建多条 flex lines；items alignment 与 lines/content alignment 是不同层级。

Scope：

- flex-wrap。
- line concept。
- gap。
- align-content。
- 必要 Compare: align-items vs align-content。

Misconceptions：

- wrap = Grid。
- align-content 在 single-line flex container 也总有明显作用。
- gap 与 justify-content 相同。

Exercises：3。

Fit：READY。

---

## 8. Lesson — flexible-items-and-free-space

Mental model：

> Flexbox sizing 先有 basis，再根据正/负 free space 进行 grow/shrink；不是简单“百分比宽度”。

Scope：

- flex-basis。
- flex-grow。
- flex-shrink。
- flex shorthand。
- min-content/min-width 等复杂细节只在真实 misconception 需要时提及。

Misconceptions：

- grow = width。
- grow number = percentage。
- shrink 只在 overflow 已出现后做视觉修补。
- flex:1 永远等价 width:100%。

Exercises：4：

1. basis。
2. grow。
3. shrink。
4. combined free-space reasoning。

Fit：READY。

---

## 9. Lesson — flex-item-control-and-order

Mental model：

> container algorithm 可以被 item-level properties 局部调整，但 visual order 与 document/source order 不等价。

Scope：

- align-self。
- auto margin in flex context。
- order。
- 必要的 accessibility/source-order caution。

Misconceptions：

- order 改 DOM。
- visual order 自动改 keyboard/accessibility order。
- align-self 与 align-items 是完全独立两套模型。

Exercises：3。

Fit：READY。

---

## 10. Module-wide checks

必须确保 learner 最终不是记：

```text
justify = horizontal
align = vertical
```

而是能在 row/column 都迁移。

Checker review：

- equivalent alignment values。
- normalized computed styles。
- 不锁死无关实现。
- free-space behavior 如果 checker 只查 declaration，要确保 prompt 的 learning objective 与 check 一致。

---

## 11. Acceptance Criteria

- [ ] 5 Lesson order 正确。
- [ ] existing flexbox-alignment stable ID 保持。
- [ ] existing Exercise stable IDs 保持，除非真实内容修改需要 revision policy review。
- [ ] alignment lesson 不再承担 flex basics。
- [ ] 至少一个 column transfer Exercise。
- [ ] wrapping / align-content 与 align-items 明确区分。
- [ ] grow/shrink 以 free-space algorithm 为核心。
- [ ] order lesson 提到 visual/source order distinction。
- [ ] all gates + E2E pass。
