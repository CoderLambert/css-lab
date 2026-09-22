# Task 04 — M1 CSS Language & Selection

## 1. Module goal

建立 learner 的第一个 CSS mental model：

```text
HTML element
→ selector matching
→ matched rule
→ declarations become candidates
```

本 Module 不提前教授 cascade resolution 的完整规则；它只建立“CSS 规则如何命中对象”的基础。

Module slug：

```text
css-language-and-selection
```

Prerequisite：按 Learner Contract，learner 能阅读基础 HTML / DOM。

---

## 2. Source grounding

优先：

- CSS Selectors specification。
- CSS Syntax / CSSOM 相关 primary references（仅用于必要语义）。
- MDN CSS selectors / CSS syntax。

freeCodeCamp 只用于 beginner progression / exercise granularity benchmark。

必须建立 grounding brief，至少覆盖：

- CSS rule / declaration。
- selector matching。
- type / class / id selector。
- selector list。
- combinators。
- attribute selector。
- structural pseudo-classes（只选本 Lesson 真正需要的范围）。

不要把整个 Selectors spec 塞进 Foundations。

---

## 3. Batch plan

```text
Batch A
  01 css-rules-and-declarations
  02 selector-matching

validate + review

Batch B
  03 selector-relationships-and-structure

validate + module review
```

---

## 4. Lesson 01 — css-rules-and-declarations

### Mental model

CSS rule 先通过 selector 找对象；declaration 只是对已匹配对象提供 property/value 候选。

### Learning outcome

learner 能：

- 阅读基本 CSS rule。
- 区分 selector / property / value / declaration。
- 为固定 fixture 中已知元素写出简单规则。
- 解释“规则没有命中”与“property/value 不正确”是不同问题。

### Misconceptions

- CSS 会“修改 HTML”。
- property 写了就会对整个页面生效。
- selector 只是命名标签，不参与实际匹配。

### Activities

```text
Concept
→ Predict
→ Exercise
→ debugging-oriented Exercise
```

### Exercises

建议 3：

1. 对单一已知元素应用 property。
2. 一个 rule 中组合多个 declarations。
3. 给错误 selector starter，先修 matching 再修 declaration。

Checker：style 可诚实验证本 Lesson 的主要结果。

Fit：READY。

---

## 5. Lesson 02 — selector-matching

### Mental model

selector 定义一个 matched element set；规则只影响这个集合。

### Learning outcome

learner 能：

- 预测 type / class / id / selector list 会匹配哪些固定 DOM elements。
- 为一个目标集合选择足够明确的 selector。
- 理解 selector 是 matching expression，不是“优先级数字”。

### Misconceptions

- class 与 id 的主要区别只是写法。
- selector 越长就越正确。
- comma selector 表示 hierarchy。
- 只要视觉结果对，就代表 selector intent 正确。

### Activities

```text
Concept
→ Predict
→ Compare
→ Exercise
```

### Exercises

建议 3：

1. type selector targeting。
2. class selector targeting。
3. mixed targets / non-targets。

Checker limitation：

current checker 能检查目标元素最终 style，但不能证明 learner 使用了要求的 selector strategy。

禁止为了验证 selector source 而新增 custom JS checker。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

报告必须明确：

- machine-checkable: target resolved style。
- not machine-proven: authored selector strategy。

---

## 6. Lesson 03 — selector-relationships-and-structure

### Mental model

复杂 selector 表达 DOM relationship / attribute / structural state，而不是“更强的 selector”。

### Scope

Foundations v1 只覆盖高价值子集：

- descendant。
- child。
- attribute selector。
- 必要的 structural pseudo-class，例如 `:first-child` / `:nth-child()`。

避免把全部 pseudo-class/pseudo-element catalog 放进一课。

### Misconceptions

- descendant = direct child。
- `:nth-child()` 按 tag type 自动计数。
- attribute selector 必须与 class/id 配合。
- 更复杂 selector 应用于 specificity hack。

### Activities

Concept → Predict → Compare → Exercise。

### Exercises

建议 3–4：

1. descendant vs child。
2. attribute targeting。
3. structural selector。
4. debugging：DOM relationship 与预期不同。

Checker：只能验证最终 target effect，不能证明 authored source selector。

Fit：TEACHABLE_BUT_CHECKER_LIMITED。

---

## 7. Authoring steps

每个 batch：

1. run inspect-context。
2. grounding brief。
3. scaffold Lesson（draft）。
4. scaffold Exercises（draft）。
5. author MDX。
6. 按当前最新 CSS Lesson Authoring Skill 的正式 Exercise/Workspace contract author assets。
7. review hints。
8. review checks。
9. validate。
10. two-viewpoint review。
11. only then next batch。

---

## 8. Acceptance Criteria

- [ ] 3 Lesson 全部围绕 matching mental model。
- [ ] 未提前教授完整 specificity/cascade。
- [ ] fixture DOM 足够简单，可观察 selector effect。
- [ ] debugging task 已出现。
- [ ] checker limitation 被诚实记录。
- [ ] 没有引入 source-aware checker。
- [ ] 新内容默认 draft。
- [ ] all content gates pass。


---

## 9. Scheduled execution status

Task 04 / M1 is complete under the scheduled execution override.

### Grounding brief

Authoritative grounding used for production:

- Selectors Level 4 / MDN: selectors define element matching conditions.
- Type / class / ID / selector list: used to establish matched-element-set reasoning.
- Descendant combinator: the right-hand target may appear at any descendant depth below a matching ancestor.
- Child combinator: the right-hand target must be a direct child.
- Attribute selector: can match directly on attribute presence/value; no class or ID is required.
- Tree-structural pseudo-classes: `:nth-child()` uses sibling-list position and is not “the Nth element of the same tag type”.

The module intentionally does not teach full cascade or specificity resolution.

### Production result

```text
01 css-rules-and-declarations
02 selector-matching
03 selector-relationships-and-structure
```

All three Lessons and all new Exercises remain `draft`.

### Checker boundary

```text
machine-checkable:
  target and explicit non-target resolved style

not machine-proven:
  exact authored selector source strategy
```

No source-aware checker, custom JavaScript checker, new Activity, Workspace change, or runtime change was introduced.

### Fast-gate evidence

```text
lesson orders: 1 / 2 / 3
Lesson 03 exercise orders: 1 / 2 / 3 / 4
all new statuses: draft
MDX Exercise refs match exercise.order
all Exercise asset files present
checker types: current style DSL only
no duplicate touched stable IDs
no TODO placeholders in Lesson 03
no H1 in Lesson 03 MDX
```

### Narrow module review

CSS technical view:
- descendant vs child semantics are separated correctly.
- attribute selector is taught as an independent matching condition.
- the `:nth-child()` fixture includes a different element type before the target so sibling-position counting is observable.
- resolved-style checks are not presented as proof of selector source.

Curriculum view:
- progression remains rule → matched set → relationship/structure.
- misconceptions become progressively more structural rather than repeating selector syntax.
- debugging appears both as selector typo repair and DOM-relationship repair.
- M1 does not cross into full specificity/cascade, preserving the M2 boundary.

Full generated-registry, build, lint, E2E, exhaustive source review, and independent module review remain deferred to Task 13 by the scheduled execution contract.

Task 05 / M2 may begin on the next Lane B run.
