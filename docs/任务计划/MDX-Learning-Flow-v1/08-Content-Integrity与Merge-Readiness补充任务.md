# MDX Learning Flow v1 — Content Integrity 与 Merge Readiness 补充任务

## 0. 文档定位

本文档是 `MDX Learning Flow v1` 在第一轮实现完成后的**补充修复任务**。

适用基线：

```text
branch: feat/mdx-learning-flow-demo
reviewed HEAD: 165fb1df752c7cd2e4ea87150f75aea56469272e

关键实现提交：
c36e925d  feat: finalize MDX learning flow v1
2ebc6e22  fix: make MDX contract plugin Turbopack compatible
165fb1df  sync merge
```

现有 `00~07` 任务已经完成大部分 MDX v1 基础设施，但严格审核确认仍有 Content Integrity Contract 未闭环。

本文档只处理这些**剩余缺口与 merge readiness**。

如果本文档与以下旧任务文档存在冲突：

```text
00-执行总计划与Codex编排.md
01-Lesson-Content-Contract与Source-Boundary.md
02-自动MDX-Registry生成.md
05-Content-Check-Studio-Health与旧链路清理.md
06-Integration-E2E与Merge-Readiness.md
07-M6A-衔接约束.md
```

**以本文档为准。**

完成本任务后，再执行最终独立审核；未完成前不要 squash / merge 到 `main`。

---

# 1. 当前已确认正确、禁止重做的部分

以下能力已经通过实现审核，除为本任务修复必要接口外，不要重新设计：

```text
Lesson metadata / MDX source 分离
generated static MDX registry
controlled MDX DSL
Concept / Predict / Compare / Exercise
H1 / H2 / H3 heading contract
lesson-local Exercise link
旧 react-markdown 链路删除
progressive hints
Preview viewport presets
structured checker diagnostics
Turbopack-compatible remark plugin loading
content:generate
content:check
test:content
quality.yml content hard gates
```

特别禁止：

- 不重写 MDX compiler 架构。
- 不改 Activity v1 组件集合。
- 不扩展 Workspace v2。
- 不做 HTML/JS/TS Editor。
- 不做 Browser Runtime v2。
- 不做 Checker Registry / Matcher DSL。
- 不做 Exercise v2。
- 不做 Progress v2。

本轮目标不是继续扩功能，而是：

> **保证 Content Source、MDX Teaching Flow 和正式 learner navigation 三者不会产生静默不一致。**

---

# 2. 本轮必须解决的三个 Major

## Major A — Lesson source structural invariant 不一致

当前实现：

```js
// lesson-manifest.mjs

if (!hasRegularFile(lessonContents, "lesson.json")) {
  continue;
}
```

这意味着：

```text
lessons/foo/
└── lesson.mdx
```

会被 registry scanner 静默忽略。

但 `FileContentReader` 仍会把 `lessons/foo/` 当作 Lesson directory，并尝试读取 `lesson.json`。

因此：

```text
Registry Scanner 对 Lesson directory 的定义
!=
FileContentReader 对 Lesson directory 的定义
```

必须统一。

### 最终结构 invariant

所有：

```text
content/courses/<course>/modules/<module>/lessons/*
```

下的**直接子目录**都视为 Lesson source directory。

每个 Lesson source directory 必须同时存在：

```text
lesson.json   REQUIRED
lesson.mdx    REQUIRED
```

规则：

```text
missing lesson.json
→ structural error

missing lesson.mdx
→ structural error
```

这两个错误与 publication status 无关。

publication status 只影响：

```text
empty lesson.mdx
```

### empty MDX 规则

定义：

```text
effective learner-visible lesson
=
course.status === published
&& module.status === published
&& lesson.status === published
```

如果：

```text
effective learner-visible
+ lesson.mdx empty
→ error

otherwise
+ lesson.mdx empty
→ warning
```

不要把 missing file 和 empty content 混为同一种 severity。

---

## Major B — Exercise reference integrity 只检查文件存在

当前 `content:check` 基本只有：

```text
<Exercise slug="x" />
→ exercises/x/exercise.json exists
```

存在即通过。

这不够。

以下全部必须被检测：

1. target directory / `exercise.json` 不存在。
2. `exercise.json.slug !== MDX reference slug`。
3. 同一个 Exercise 在同一 lesson.mdx 中重复引用。
4. learner-visible Lesson 引用 draft Exercise。
5. learner-visible Lesson 漏掉一个 published Exercise。
6. MDX Exercise 顺序与 canonical learner sequence 不一致。

---

## Major C — MDX Teaching Flow 与 `exercise.order` 存在双顺序源

正式 learner navigation 当前仍来自：

```text
readPublishedExerciseSequence()
→ exercise.order
```

但 `lesson.mdx` 也通过：

```mdx
<Exercise slug="..." />
```

表达教学中的 Exercise 顺序。

如果不校验，就可能出现：

```text
MDX:
A → C → B

Footer navigation:
A → B → C
```

这是产品层错误。

### v1 最终 canonical sequence

明确规定：

> **`exercise.order` 是 learner navigation 的唯一 canonical sequence source。**

MDX 中的 Exercise references 不是第二个 navigation source，而是 canonical sequence 在教学叙事中的呈现。

对于 effective learner-visible Lesson，要求：

```text
published exercises sorted by order
===
Exercise references in MDX
```

即：

- 每个 published Exercise 必须被引用。
- 每个 published Exercise 恰好引用一次。
- 不得遗漏。
- 不得重复。
- 顺序必须与 `exercise.order` 完全一致。

---

# 3. 实现范围

主要修改文件预计：

```text
scripts/content/lesson-manifest.mjs
scripts/content/check.mjs
scripts/content/*.test.mjs
src/features/studio/lib/content-health.ts

docs/功能文档/MDX-Learning-Flow-v1-产品方案.md
docs/任务计划/MDX-Learning-Flow-v1/00-执行总计划与Codex编排.md
docs/任务计划/MDX-Learning-Flow-v1/01-Lesson-Content-Contract与Source-Boundary.md
docs/任务计划/MDX-Learning-Flow-v1/02-自动MDX-Registry生成.md
docs/任务计划/MDX-Learning-Flow-v1/05-Content-Check-Studio-Health与旧链路清理.md
docs/任务计划/MDX-Learning-Flow-v1/06-Integration-E2E与Merge-Readiness.md
docs/任务计划/MDX-Learning-Flow-v1/07-M6A-衔接约束.md

README.md
AGENTS.md
docs/变更记录/2026-09-23-mdx-learning-flow-v1.md
```

如实现时发现无需修改其中某文件，可以不改，但必须在最终报告说明。

---

# 4. Task A — 修正 Lesson Manifest structural invariant

## 4.1 Scanner 行为

当前禁止：

```js
if (!hasRegularFile(lessonContents, "lesson.json")) {
  continue;
}
```

改为：

```text
遍历 lessons/* 所有 direct directories
→ validate lesson directory slug
→ assert lesson.json exists
→ assert lesson.mdx exists
→ create manifest entry
```

伪代码：

```js
for (const lessonEntry of sortedDirectories(lessonEntries)) {
  assertSlug(lessonEntry.name, lessonsRoot);

  const lessonRoot = join(lessonsRoot, lessonEntry.name);
  const contents = await readDirectoryEntries(lessonRoot);

  if (!hasRegularFile(contents, "lesson.json")) {
    throw new Error(
      `Missing lesson.json for lesson ${key}: ...`
    );
  }

  if (!hasRegularFile(contents, "lesson.mdx")) {
    throw new Error(
      `Missing lesson.mdx for lesson ${key}: ...`
    );
  }

  manifest.push(...);
}
```

不要：

- 静默 continue。
- 通过存在某文件来决定目录是不是 Lesson。
- 引入 recursive generic scanner。
- follow symlink。

---

## 4.2 course/module structural behavior

本任务只修 Lesson invariant。

不要顺手重新设计：

```text
course directory invariant
module directory invariant
```

除非当前实现已有明确 bug 导致本任务无法正确判断 Lesson。

禁止 scope creep。

---

# 5. Task B — Studio Health 对 missing / empty 的语义修正

当前 Studio：

```text
missing lesson.mdx
→ 根据 published chain 决定 error/warning
```

改成：

```text
missing lesson.mdx
→ always error
```

因为它是 source structure broken，不是 publication readiness。

保持：

```text
empty lesson.mdx
→ effective learner-visible: error
→ otherwise: warning
```

### missing lesson.json

Studio Health 不要求额外构造一个“虚拟 Lesson issue”。

原因：

`FileContentReader` 在 metadata hydration 前已经无法形成 Lesson runtime entity。

本轮由：

```text
content:check / lesson-manifest
```

作为 repository structural gate 捕获 missing `lesson.json`。

不要为了让 Studio 展示这个错误而引入新的 generic filesystem catalog abstraction。

---

# 6. Task C — 为 content checker 增加 Lesson / Exercise metadata context

当前 manifest 只提供：

```text
key
courseSlug
moduleSlug
lessonSlug
mdxImportPath
```

为了判断 effective visibility 和 Exercise sequence，`content:check` 需要 metadata context。

## 推荐实现

不要把 UI 的 `FileContentReader` 强行引入 Node content tooling。

为 scripts 增加窄 helper，例如：

```text
scripts/content/content-json.mjs
```

或者在 `check.mjs` 内部保持小型 helper。

职责：

```js
readJsonObject(path)
readRequiredString(...)
readStatus(...)
readPositiveInteger(...)
```

只解析本轮 integrity check 需要的字段：

### course.json

```text
slug
status
```

### module.json

```text
slug
status
```

### lesson.json

```text
slug
status
```

### exercise.json

```text
slug
status
order
```

不要复制整个 Zod schema。

完整 schema validation 仍属于：

```text
FileContentReader + Zod
```

这里是 repository authoring integrity 的窄检查。

## 必须检查 directory slug match

至少验证：

```text
course.json.slug === course directory
module.json.slug === module directory
lesson.json.slug === lesson directory
exercise.json.slug === exercise directory / MDX reference slug
```

如果发现不一致：

```text
content:check FAIL
```

错误信息必须包含：

- entity kind。
- directory slug。
- metadata slug。
- source path。

---

# 7. Task D — Exercise reference integrity

在 `checkLesson()` 或拆出的窄 helper 中实现。

## 7.1 所有 Lesson 通用规则

每个真实 MDX Exercise reference：

```text
slug must be unique inside lesson.mdx
target exercise.json must exist
exercise.json must parse
exercise metadata.slug must equal reference.slug
target must be same Lesson directory
```

### duplicate error

例如：

```text
Duplicate Exercise reference:
lesson: css-foundations/flexbox/flexbox-alignment
slug: center-box
first: lesson.mdx:42:1
duplicate: lesson.mdx:55:1
```

位置可根据已有 AST position 实现。

---

## 7.2 effective learner-visible Lesson

定义：

```js
const lessonVisible =
  course.status === "published" &&
  module.status === "published" &&
  lesson.status === "published";
```

如果 `lessonVisible === true`：

### referenced Exercise 必须 published

```text
MDX reference → target.status === published
```

如果引用 draft：

```text
FAIL
```

因为 learner 点击必然 404。

### canonical published sequence

枚举：

```text
<lesson>/exercises/*
```

读取所有 Exercise metadata。

筛选：

```text
status === published
```

按：

```text
order ASC
```

得到：

```js
canonicalPublishedSlugs
```

MDX AST collector 得到：

```js
referencedSlugs
```

必须：

```js
deepEqual(referencedSlugs, canonicalPublishedSlugs)
```

但不要只输出：

```text
arrays differ
```

错误必须尽量说明实际原因：

- missing reference。
- unexpected/draft reference。
- wrong order。
- duplicate reference。

---

## 7.3 hidden / draft Lesson

如果 Lesson 不在 effective published chain：

允许：

```text
MDX → draft Exercise
MDX → published Exercise
```

但仍必须：

- target exists。
- slug match。
- no duplicate reference。

本轮不要求：

```text
所有 draft/published exercises 都必须被 MDX 引用
```

因为 hidden Lesson 允许处于创作中的中间状态。

---

# 8. Task E — Published sequence order 的错误定义

需要显式区分以下情况。

## Case 1 — missing reference

Exercises：

```text
A order 1 published
B order 2 published
C order 3 published
```

MDX：

```text
A
C
```

FAIL：

```text
Missing published Exercise reference: B
```

---

## Case 2 — wrong order

MDX：

```text
A
C
B
```

FAIL：

```text
Exercise reference order does not match learner sequence.

expected: A -> B -> C
actual:   A -> C -> B
```

---

## Case 3 — duplicate

MDX：

```text
A
B
B
C
```

FAIL duplicate B。

不要让 duplicate 最终只表现成 generic order mismatch。

---

## Case 4 — draft target in visible lesson

MDX：

```text
A
FutureDraft
B
C
```

FAIL：

```text
Learner-visible lesson references non-published Exercise "FutureDraft".
```

---

# 9. Task F — 补齐 content tooling integration tests

当前：

```text
lesson-contract.test.mjs
```

对 MDX AST contract 覆盖已经足够，不要重写。

当前：

```text
lesson-reference.test.mjs
```

只覆盖“fenced code 中假 Exercise 不被收集”，不足以验证 repository checker。

## 9.1 测试策略

使用 Node built-in：

```text
node:test
```

使用：

```js
mkdtemp()
writeFile()
mkdir()
rm()
```

建立临时 content tree。

不要：

- 引入 Jest/Vitest。
- 修改真实 `content/`。
- 依赖测试执行顺序。
- 用 shell 创建 fixtures。

## 9.2 让 checker 可测试

将：

```js
checkContent()
```

调整为支持依赖注入路径：

```js
checkContent({
  coursesRoot = defaultCoursesRoot,
  generatedRegistryPath = defaultRegistryPath,
} = {})
```

生产 CLI 不传参数，行为不变。

测试传 temp path。

如果需要 registry expected source，可以直接复用：

```text
readLessonManifest
createLessonRegistrySource
```

不要复制生成逻辑。

---

## 9.3 必须新增测试案例

至少：

### Structural

- valid Lesson source。
- missing `lesson.json` → fail。
- missing `lesson.mdx` → fail。
- stale generated registry → fail。

### Exercise reference

- valid visible Lesson sequence → pass。
- target exercise missing → fail。
- metadata slug mismatch → fail。
- duplicate Exercise reference → fail。
- visible Lesson references draft Exercise → fail。
- visible Lesson missing one published Exercise → fail。
- wrong MDX Exercise order → fail。
- hidden/draft Lesson referencing draft Exercise → pass。

### Existing AST collector

继续保留：

```text
fenced code 中 <Exercise> 不被收集
```

---

# 10. Task G — 对现有真实 Flexbox Lesson 的回归

当前真实：

```text
center-box order 1
space-between-items order 2
align-items-end order 3
```

`lesson.mdx` references 必须保持：

```text
center-box
space-between-items
align-items-end
```

不得为测试方便修改 canonical order。

运行：

```bash
pnpm content:check
```

应继续：

```text
PASS
```

---

# 11. Task H — 文档 contract 回写

本补充任务完成后，必须把最终规则回写到正式基线文档。

## 产品方案

更新：

```text
docs/功能文档/MDX-Learning-Flow-v1-产品方案.md
```

至少增加：

### Lesson structural invariant

```text
Lesson directory
= lesson.json + lesson.mdx
both required
```

### Exercise sequence

```text
exercise.order
= canonical learner sequence

MDX Exercise references
= canonical sequence 在教学叙事中的呈现

learner-visible Lesson
→ all published exercises referenced exactly once
→ reference order equals exercise.order
```

### Registry scalability trade-off

明确：

```text
generated static registry
= accepted v1 implementation trade-off

如果未来 curriculum 规模导致可测量的 build/dev 性能问题，
允许迁移到 lazy/static-chunk loading strategy，
但不得改变 lesson.json / lesson.mdx / Activity authoring contract。
```

不要现在实现 lazy registry。

---

## Task 文档

同步修订：

```text
01
02
05
06
07
```

核心要求：

### 01

- missing lesson.mdx always structural error。
- empty lesson.mdx 才按 effective visibility 分 error/warning。

### 02

- 所有 lessons/* direct directories 都是 Lesson source directories。
- missing lesson.json / lesson.mdx hard fail。

### 05

- Exercise reference integrity 使用本文档最终规则。
- published sequence completeness/order 成为 content:check hard gate。

### 06

最终 review 增加：

```text
Teaching Flow order == learner navigation order
```

### 07

M6A 的 checker compatibility 不要写成：

```text
必须永远保留 alsoAccepts?: string[]
```

应写成：

> M6A migration 不得丢失“一个 style check 可接受多个语义等价 computed values”的现有行为能力。

同理 CheckResult：

保留的是：

```text
learner mismatch
vs
checker/runtime fault
```

以及足够的 learner diagnostics。

不要把当前 flat field shape 冻结成永久架构。

---

# 12. Task I — README / AGENTS / changelog 小修

## README

当前 Verification 应补齐：

```bash
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
```

CI 描述同步说明：

```text
content check
content contract tests
lint
build
Chromium E2E
```

当前：

```text
/studio：内容创作区占位入口
```

改为准确描述，例如：

```text
/studio：只读内容健康与目录检查
```

---

## AGENTS

Verification 部分补充：

```text
涉及 Content / MDX 修改时：
pnpm content:check
pnpm test:content

所有代码任务：
pnpm lint
pnpm build
```

不要删除现有 MDX authoring contract。

---

## changelog

更新：

```text
docs/变更记录/2026-09-23-mdx-learning-flow-v1.md
```

删除或改写已经因 `165fb1d` 失效的风险说明，例如：

```text
origin branch 尚有未合入 remote docs commit
```

不要让变更记录描述当前已经不存在的分叉状态。

---

# 13. ButtonLink 审核

当前：

```text
src/components/ui/button-link.tsx
```

只有一个主要消费者，且新增原因主要是复用 Button style。

这属于 Minor，不阻塞 Content Integrity。

本补充任务**不要因为清理欲望强制重构它**。

主 Agent只做一次判断：

### 保留条件

如果当前 `ButtonLink` 是为解决已验证的 Base UI Button + Next Link composition 行为问题：

- 保留。
- 在 final report 说明原因。

### 删除条件

如果只是 convenience wrapper，且恢复现有 Button composition 后：

```text
lint/build/e2e
```

全部通过，则可以删除。

无论保留或删除：

> 不允许让这个 Minor cleanup 延迟或扩大本轮 Content Integrity 修复。

---

# 14. 并行执行方案

本补充任务可以使用子 Agent，但要控制文件冲突。

## Wave 1

Task A/B/C/D/E 有强依赖，主 Agent自己执行：

```text
Manifest structural invariant
Studio missing severity
content checker metadata context
Exercise reference integrity
canonical sequence validation
```

不要拆给多个 Agent同时修改：

```text
lesson-manifest.mjs
check.mjs
content-health.ts
```

避免核心 contract 分叉。

---

## Wave 2 — 并行

核心实现稳定后启动两个子 Agent。

### Agent T — Content Tooling Tests

主要写权限：

```text
scripts/content/*.test.mjs
```

可提出 integration request，但不得自行改：

```text
check.mjs
lesson-manifest.mjs
```

任务：

- temp filesystem integration tests。
- structural cases。
- reference cases。
- sequence cases。

---

### Agent D — Docs Consistency

主要写权限：

```text
docs/功能文档/MDX-Learning-Flow-v1-产品方案.md
docs/任务计划/MDX-Learning-Flow-v1/*.md
README.md
AGENTS.md
docs/变更记录/2026-09-23-mdx-learning-flow-v1.md
```

不得修改 production code。

任务：

- 回写 structural invariant。
- 回写 canonical Exercise sequence。
- 回写 registry v1 trade-off。
- 修正 M6A `alsoAccepts` / diagnostics 的“行为能力而非字段形状”表述。
- README/AGENTS/changelog consistency。

---

## Wave 3 — 主 Agent集成

主 Agent：

- review 两个子 Agent diff。
- 修 integration requests。
- 不盲目接受测试或文档变更。
- 确认没有降低 contract 标准来“修绿”。

---

# 15. 禁止的错误修复方式

测试失败时禁止：

- 重新允许 missing lesson.json 被 scanner 忽略。
- 把 missing lesson.mdx 改回 warning。
- 对 draft Exercise reference 只显示 warning 但 CI 继续通过。
- 允许 visible Lesson 漏掉 published Exercise。
- 允许 MDX order 与 `exercise.order` 不一致。
- 修改 `exercise.order` 来迁就错误 MDX 顺序。
- 用正则扫描 `<Exercise>`。
- 删除/skip content tests。
- 把 `content:check` 从 CI 移除。
- CI 中运行 `content:generate` 自动修 stale registry。
- 顺手实现 Matcher DSL / Checker Registry。

---

# 16. 最终验证

全部执行：

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

### generator idempotency

再执行：

```bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

必须无 diff。

---

# 17. Official Quality Gate

当前正式：

```text
.github/workflows/quality.yml
```

只在：

```text
push main
pull_request → main
```

触发。

因此：

> 本地命令全绿不能替代最终 PR Quality Gate。

在用户要求进入合并流程时：

1. 确保 branch 再次同步最新 `main`。
2. 创建/更新 PR 到 `main`。
3. 等待正式 `Quality Gate` 对当前最终 HEAD 成功。
4. Quality Gate 未成功前不得 merge。

不要为了当前 feature branch 创建新的临时 validation workflow。

如果用户尚未要求创建 PR：

- 可以报告“implementation-ready / local gates passed”。
- **不要报告“official merge gate passed”。**

---

# 18. 最终独立审核

完整验证通过后，再启动两个只读 reviewer。

## Reviewer R1 — Content Architecture

必须检查：

- Lesson directory invariant。
- Lesson metadata/source boundary。
- manifest 与 FileContentReader 世界观一致。
- generated registry deterministic。
- no new dual source。
- no silent ignored Lesson directories。

---

## Reviewer R2 — Learning Flow Integrity

必须检查：

- effective visibility 定义与 learner route 一致。
- MDX references target validity。
- duplicate detection。
- draft Exercise link protection。
- published Exercise completeness。
- MDX order 与 `exercise.order` 一致。
- existing learner navigation E2E 无回归。

Critical / Major 全部修复后，重新跑全部验证。

---

# 19. Merge-ready Acceptance Criteria

以下全部满足才允许认为 MDX v1 已到最终合并阶段：

## Lesson Source

- [ ] every `lessons/*` direct directory 被视为 Lesson source directory。
- [ ] missing lesson.json hard fail。
- [ ] missing lesson.mdx hard fail。
- [ ] Studio missing lesson.mdx always error。
- [ ] empty visible lesson.mdx error。
- [ ] empty hidden/draft lesson.mdx warning。

## Exercise Integrity

- [ ] MDX reference target exists。
- [ ] exercise metadata.slug matches directory/reference slug。
- [ ] duplicate Exercise reference hard fail。
- [ ] visible Lesson cannot reference draft Exercise。
- [ ] all published Exercises in visible Lesson referenced exactly once。
- [ ] MDX Exercise order equals published exercise.order sequence。
- [ ] hidden/draft Lesson may reference draft Exercise。

## Testing

- [ ] content checker has temp-filesystem integration tests。
- [ ] missing lesson.json test。
- [ ] missing lesson.mdx test。
- [ ] stale registry test。
- [ ] missing Exercise test。
- [ ] slug mismatch test。
- [ ] duplicate reference test。
- [ ] draft target test。
- [ ] missing published reference test。
- [ ] wrong order test。
- [ ] hidden draft reference valid test。

## Existing v1 behavior

- [ ] MDX DSL contract unchanged。
- [ ] Concept / Predict / Compare / Exercise unchanged。
- [ ] progressive hints unchanged。
- [ ] Preview presets unchanged。
- [ ] checker diagnostics unchanged。
- [ ] Turbopack dev remains functional。
- [ ] generated registry remains static/deterministic。

## Docs

- [ ] 产品方案回写 structural invariant。
- [ ] 产品方案回写 canonical Exercise sequence。
- [ ] static registry scalability trade-off documented。
- [ ] M6A compatibility expressed as behavior semantics, not permanent field shape。
- [ ] README verification current。
- [ ] AGENTS verification current。
- [ ] changelog stale branch-risk statement removed/fixed。

## Validation

- [ ] `pnpm content:check` PASS。
- [ ] `pnpm test:content` PASS。
- [ ] `pnpm lint` PASS。
- [ ] `pnpm build` PASS。
- [ ] `pnpm test:e2e` PASS。
- [ ] `git diff --check` PASS。
- [ ] generator idempotent。
- [ ] no unresolved reviewer Critical/Major。
- [ ] branch synced with latest main before PR。
- [ ] official PR Quality Gate PASS before merge。

---

# 20. 完成后停止点

本补充任务完成后：

```text
MDX Learning Flow v1
→ final independent audit
→ PR quality gate
→ merge-ready
```

不要自动：

- merge main。
- 启动 M6A。
- 修改 M6A production code。
- 扩展新的 Activity。

等 MDX v1 真正合入 `main` 后，再基于真实最新代码对 M6A `00~06` 做最终 rebaseline。
