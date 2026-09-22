# Task 09 — M6 Grid

## 1. Module goal

建立二维 layout mental model：

```text
grid formatting context
→ explicit tracks
→ grid lines
→ placement
→ auto-placement / implicit grid
→ alignment / gap
```

Module：

```text
grid
```

Prerequisite：M3。

Flexbox 不是 Grid 的硬前置；可以在教学叙事中做 Compare，但不得把 Grid 解释成“二维 Flexbox”。

---

## 2. Source grounding

优先：

- CSS Grid Layout specification。
- CSS Box Alignment specification。
- MDN Grid guide。

必须特别查证：

- explicit vs implicit grid。
- lines vs tracks。
- auto-placement。
- `fr`。
- `minmax()` / `repeat()` 只按 Foundations scope。
- getComputedStyle 对 grid-template-* 的 serialization / resolved value 行为。

---

## 3. Batch plan

```text
Batch A
  grid-formatting-context-and-tracks
  grid-placement-and-lines

Batch B
  implicit-grid-and-auto-placement
  grid-alignment-and-gaps
```

---

## 4. Lesson — grid-formatting-context-and-tracks

Mental model：

> Grid 先定义二维 track system；items 再被 placement algorithm 放入 grid areas。

Scope：

- `display:grid`。
- rows / columns。
- track / line distinction。
- fixed track / `fr`。
- `repeat()` / `minmax()` only if source-grounded and cognitive load acceptable。

Misconceptions：

- Grid 是二维 Flexbox。
- `1fr` = 固定百分比。
- column 数字指的是 track，而不是 grid line。
- authored `1fr 2fr` 可以直接通过 getComputedStyle 原样验证。

Exercises：

1. basic explicit tracks。
2. mixed fixed + flexible tracks。
3. track definition Compare / observation。

### Checker boundary

当前 resolved-style checker 对 authored Grid track expression 不可靠；浏览器可能返回 resolved used track sizes。

因此不得用字符串 `equals: "1fr 2fr"` 作为未经验证的 contract。

Fit：NEEDS_CHECKER_CAPABILITY。

可以 author draft Lesson/Exercise，但 publication 必须诚实处理 gap。

---

## 5. Lesson — grid-placement-and-lines

Mental model：

> Grid placement 使用 line start/end 或 span 表达 item 占据区域，不是坐标系统。

Scope：

- grid-column / grid-row。
- start/end line。
- span。
- basic named area only if Task 01 curriculum review明确纳入；默认不在本课扩大 scope。

Misconceptions：

- line number = track number。
- end line 包含在 track count 内。
- placement 会改变 DOM/source order。

Exercises：

1. place item across columns。
2. rows + columns。
3. span。

Checker：placement declarations通常可可靠检查；同时 review computed serialization。

Fit：READY。

---

## 6. Lesson — implicit-grid-and-auto-placement

Mental model：

> 未显式放置的 items 由 auto-placement algorithm 排布；必要时浏览器创建 implicit tracks。

Misconceptions：

- 未定义 track 就不存在。
- auto-placement 是随机。
- implicit grid 与 explicit grid 是两套完全无关系统。
- 所有 items 都必须手写 line positions。

Exercises：

1. observe auto-placement。
2. overflow into implicit tracks。
3. change auto-flow / diagnose unexpected placement。

Checker：

可以验证部分 declarations；最终 item geometry/order 不完全可证明。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 7. Lesson — grid-alignment-and-gaps

Mental model：

> Grid 中 gap、item alignment、content alignment 作用于不同对象层级。

Scope：

- gap。
- justify/align items。
- justify/align content。
- 必要 Compare with Flexbox Box Alignment。

Misconceptions：

- gap 会在 grid 外缘创建等量空间。
- items alignment = content alignment。
- Grid alignment properties 与 Flexbox 是完全不同语义。

Exercises：

1. gap。
2. item alignment。
3. content alignment / free space。

Fit：READY。

---

## 8. Reviewer focus

必须检查：

- line / track terminology。
- explicit / implicit boundaries。
- auto-placement algorithm 表述。
- Grid 与 Flexbox 比较不产生错误等同。
- `fr` 与 percentage 的差异。
- checker 不锁死 browser-normalized grid template value。
- Exercise fixture 足够小，Preview 可观察。

---

## 9. Acceptance Criteria

- [ ] 4 Lesson mental model 连贯。
- [ ] Grid 第一课没有使用不可靠 authored track string checker。
- [ ] line / track terminology准确。
- [ ] implicit grid 不是附加 property list。
- [ ] alignment 复用 Box Alignment mental model。
- [ ] Capability Gap Register 更新 Grid track validation。
- [ ] all gates pass。
