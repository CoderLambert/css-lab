# Task 05 — Content Check、Studio Health 与旧链路清理

## 依赖

必须在 Task 01 完成，且 Parallel Wave 的 Task 02/03/04 已集成后执行。

本任务串行执行，统一处理 dependency / package scripts / cleanup，避免并发修改 lockfile。

---

## 目标

建立正式 authoring validation：

```text
content:generate
content:check
test:content
```

并删除旧 Markdown 双栈。

---

## 1. 开始前重新读取

```text
scripts/content/*
scripts/mdx/remark-lesson-contract.mjs
src/features/learning/generated/lesson-content-registry.tsx
src/lib/content/lesson-content-source.ts
src/lib/content/file/file-lesson-content-inspector.ts
src/features/studio/lib/content-health.ts
src/features/learning/components/lesson-markdown.tsx
src/mdx-components.tsx
package.json
pnpm-lock.yaml
AGENTS.md
e2e/*
content/**
```

---

## 2. 直接声明 MDX compiler dependency

Content tooling 需要独立解析/编译 Lesson MDX。

增加 devDependency，版本与当前 MDX stack 对齐：

```text
@mdx-js/mdx: 3.1.1
```

原因：

- `content:check` 不应依赖 @next/mdx 的 transitive dependency 偶然存在。
- Node content tests 需要直接 import compiler。

使用 pnpm 正常更新 lockfile。

不要手工编辑 lockfile。

---

## 3. content:generate

package.json 增加：

```json
"content:generate": "node scripts/content/generate-lesson-content-registry.mjs"
```

职责只有生成 registry。

不要自动在 `dev` / `build` 前修改 working tree。

---

## 4. content:check

新增：

```text
scripts/content/check.mjs
```

package：

```json
"content:check": "node scripts/content/check.mjs"
```

### 4.1 扫描 manifest

复用 Task 02 的 scanner/source builder。

不要复制第二套目录扫描代码。

### 4.2 registry stale check

重新生成 expected source 到内存，不写文件。

与：

```text
src/features/learning/generated/lesson-content-registry.tsx
```

比较。

不一致：

```text
FAIL
Generated lesson registry is stale.
Run: pnpm content:generate
```

### 4.3 Lesson MDX compile/contract check

对 manifest 中每个 `lesson.mdx`：

使用：

```js
import { compile } from "@mdx-js/mdx";
```

并使用同一个：

```text
remarkLessonContract
```

不要维护第二套 contract validator。

目标：

- MDX syntax error 在 content:check 失败。
- contract violation 在 content:check 失败。
- 输出具体 lesson key/path。

这里仅编译验证，不执行生成代码。

### 4.4 Exercise reference validation

不能用正则扫描 MDX 源文，因为 fenced code 中可能合法出现：

```text
<Exercise ...>
```

必须通过 MDX AST/plugin 收集真实 JSX nodes。

推荐新增：

```text
scripts/mdx/remark-collect-exercise-references.mjs
```

它只收集已经满足 contract 的：

```mdx
<Exercise slug="..." ... />
```

实现必须通过 VFile data 传递结果，避免第二次解析或全局 mutable state。推荐：

```js
export function remarkCollectExerciseReferences() {
  return (tree, file) => {
    const references = [];
    // walk real MDX JSX nodes
    // push { slug, position }
    file.data.lessonExerciseReferences = references;
  };
}
```

`content:check`：

```js
const compiled = await compile(source, {
  remarkPlugins: [
    remarkLessonContract,
    remarkCollectExerciseReferences,
  ],
});

const references =
  compiled.data.lessonExerciseReferences ?? [];
```

plugin 顺序固定为：

```text
contract validation
→ reference collection
```

这样 collector 只处理已经满足静态 authoring contract 的 Exercise node。

每个 reference 验证：

```text
target directory / exercise.json 存在。
exercise.json.slug === directory slug === MDX reference slug
同一 lesson.mdx 内 slug 唯一
```

错误示例：

```text
Unknown Exercise reference:
lesson: css-foundations/flexbox/flexbox-alignment
slug: centor-box
expected: .../exercises/centor-box/exercise.json
```

只允许引用**同 Lesson** exercise。

不允许 cross-lesson path。

对 effective learner-visible Lesson：

```text
course.status === published
&& module.status === published
&& lesson.status === published
```

必须同时满足：

- MDX 不得引用 draft Exercise。
- 所有 published Exercise 必须被引用。
- 每个 published Exercise 恰好引用一次。
- MDX reference 顺序必须等于 `exercise.order` 升序序列。

`exercise.order` 是 learner navigation 的唯一 canonical sequence source；MDX references 只是该序列在教学叙事中的呈现。如果出现遗漏、重复、draft target 或顺序不一致，`content:check` 必须失败并给出具体 slug/expected/actual 信息。

hidden/draft Lesson 仍必须满足 target existence、slug match 和 no duplicate，但允许引用 draft Exercise，也不要求所有 Exercise 都已被 MDX 引用。

### 4.5 orphan exercise

对 hidden/draft Lesson，v1 允许暂时存在未被 MDX 引用的 Exercise；对 effective learner-visible Lesson，published orphan 不再被允许，因为完整 reference sequence 是 repository hard gate。

---

## 5. Content contract tests

新增 Node built-in test：

```text
scripts/content/lesson-contract.test.mjs
```

package：

```json
"test:content": "node --test scripts/content/lesson-contract.test.mjs"
```

不引入 Vitest/Jest。

测试必须至少覆盖：

### valid

- 普通 Markdown。
- Concept。
- Predict static options。
- Compare。
- Exercise slug/label/goal。
- H2/H3。

### invalid

- import。
- export。
- H1。
- unknown component。
- raw lowercase JSX。
- mdx flow expression。
- mdx text expression。
- Predict options 使用 function call。
- Predict options 含 identifier。
- Predict answer 不属于 options。
- missing required prop。
- unknown prop。
- spread prop。
- Exercise invalid slug。

测试使用 `@mdx-js/mdx.compile` + 正式 `remarkLessonContract`，不能测试复制版逻辑。

---

## 6. Studio Health 最终确认

Task 01 已完成 missing/empty source inspection。

本任务确认：

- missing `lesson.mdx` 始终是 error；它代表 source structure broken，与 publication status 无关。
- empty `lesson.mdx` 才根据 effective published chain 区分 error/warning。
- 当前 Studio 仍 0 blocking issues。
- 当前 Studio 仍 0 warnings。
- learner links 数量不变。
- Lesson runtime model 无 MDX source。

必要时更新：

```text
e2e/studio-content-health.spec.ts
```

但不要把 `content:check` 逻辑复制进 Studio。

职责：

```text
Studio health
= authoring health UI

content:check
= CI / repository validation
```

两者可以使用相同事实，但不要求完全同一输出格式。

---

## 7. 删除旧 Markdown 链路

确认无消费者后删除：

```text
src/features/learning/components/lesson-markdown.tsx
```

移除 dependency：

```text
react-markdown
```

更新 lockfile。

全局确认：

```bash
git grep -n "react-markdown"
git grep -n "LessonMarkdown"
```

应无 production 命中。

---

## 8. AGENTS.md 更新

只更新与 MDX 正式基线相关内容，不提前写 M6A 已完成能力。

新增明确规则：

### Lesson Content

```text
lesson.json = metadata
lesson.mdx = teaching content
```

### MDX authoring

只允许：

```text
Concept
Predict
Compare
Exercise
```

禁止：

- import/export。
- arbitrary JSX。
- arbitrary JS expression。
- H1。

### Generated registry

- generated file 不手改。
- 新 Lesson 后运行 `pnpm content:generate`。
- 完成内容修改前运行 `pnpm content:check`。

### Exercise Activity

- 使用 lesson-local slug。
- 不在 MDX 中硬编码 learner absolute route。

不要在本任务把项目描述改成已经支持 HTML editing / JS/TS runtime。

---

## 9. package scripts 最终形态

保留现有 scripts，并新增：

```json
"content:generate": "node scripts/content/generate-lesson-content-registry.mjs",
"content:check": "node scripts/content/check.mjs",
"test:content": "node --test scripts/content/lesson-contract.test.mjs"
```

不要把 generate 隐式挂到：

```text
predev
prebuild
postinstall
```

原因：生成 source 应是显式 authoring action；CI 用 content:check 阻止 stale。

---

## 10. 正式 CI hard gate

更新：

```text
.github/workflows/quality.yml
```

在 dependency install 完成后、build/e2e 之前加入正式步骤：

```yaml
- name: Check content
  run: pnpm content:check

- name: Test content contract
  run: pnpm test:content
```

保持现有 lint/build/e2e 流程。

不要创建新的长期重复 quality workflow。

目的：

```text
PR / push
→ stale registry 不能合入
→ invalid MDX contract 不能合入
→ broken Exercise reference 不能合入
```

`content:generate` **不能**在 CI 中自动运行，因为 CI 应检测 stale，而不是替作者修 source。

---

## 11. 本任务验证

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
```

然后再执行一次：

```bash
pnpm content:generate
git status --short
```

如果第一次已经提交正确 generated file，第二次不能产生额外变更。

---

## 12. Acceptance Criteria

- [ ] @mdx-js/mdx 为直接 devDependency。
- [ ] content:generate 存在。
- [ ] content:check 存在。
- [ ] test:content 存在。
- [ ] content:check 检查 registry stale。
- [ ] content:check 编译全部 Lesson MDX。
- [ ] contract checker 只维护一套。
- [ ] Exercise reference 使用 AST 收集，不用正则。
- [ ] invalid Exercise slug reference 会失败。
- [ ] missing lesson.json / lesson.mdx 会 hard fail。
- [ ] visible Lesson 的 published Exercise completeness/order 会 hard fail。
- [ ] visible Lesson 的 draft Exercise reference 会 hard fail。
- [ ] Node contract tests 覆盖 valid/invalid cases。
- [ ] Studio 当前 0/0。
- [ ] LessonMarkdown 删除。
- [ ] react-markdown 删除。
- [ ] AGENTS 记录 MDX 正式规则。
- [ ] package/lockfile 一致。
- [ ] quality.yml 正式执行 content:check。
- [ ] quality.yml 正式执行 test:content。
- [ ] CI 不自动执行 content:generate。
