# Task 03 — MDX Authoring Contract 与编译约束

## 并行属性

本任务属于 Parallel Wave 1，可与 Task 02、Task 04 并行。

本 Agent 不得修改 package.json / pnpm-lock.yaml / lesson.mdx。

---

## 目标

把当前“普通 MDX + 默认组件映射”收敛成真正受控的：

```text
Lesson MDX Teaching DSL v1
```

课程作者只能写：

- Markdown prose。
- fenced code。
- 标准 Markdown list/blockquote/emphasis。
- approved Activity components。

禁止课程内容直接依赖 application implementation。

---

## 1. v1 允许的 custom components

唯一白名单：

```text
Concept
Predict
Compare
Exercise
```

不要新增其他 component。

---

## 2. 禁止项

Lesson MDX 中必须在编译时拒绝：

### import / export

```mdx
import X from "@/..."
export const foo = ...
```

对应 AST：

```text
mdxjsEsm
```

全部 reject。

### flow/text arbitrary expression

```mdx
{someFunction()}
{globalThis.foo}
```

对应：

```text
mdxFlowExpression
mdxTextExpression
```

全部 reject。

### 未知 JSX component

```mdx
<Whatever />
<div />
<MyComponent />
```

v1 全部 reject，除白名单四个。

本轮不开放 raw HTML JSX。

### H1

```md
# Heading
```

reject。

页面唯一 H1 来自：

```text
lesson.json.title
```

Lesson MDX 从 H2 开始。

---

## 3. Remark plugin

新增：

```text
scripts/mdx/remark-lesson-contract.mjs
```

它属于 build/content tooling，不属于 client application runtime。

不要引入 generic plugin framework。

导出：

```js
export function remarkLessonContract() {
  return (tree, file) => { ... };
}
```

错误必须包含：

- source file path（如果 VFile 提供）。
- node position line/column（如果提供）。
- 清晰原因。

示例：

```text
Lesson MDX contract violation at lesson.mdx:12:1:
imports/exports are not allowed in lesson content
```

---

## 4. AST traversal

不要为了遍历树增加 `unist-util-visit`。

实现一个窄 recursive visitor：

```js
function walk(node, visit) {
  visit(node);

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, visit);
    }
  }
}
```

本轮 AST 规模很小，这足够且更明确。

---

## 5. JSX component props contract

不仅检查 component name，还必须检查 props。

禁止：

- spread attributes。
- 未知 prop。
- 缺少 required prop。
- event-handler-like props。
- 动态 identifier/call expression。

### Concept

允许：

```text
title: literal string, required
```

允许 children Markdown。

禁止 self props 之外其他 attribute。

### Predict

允许：

```text
question: literal string, required
options: static array of >= 2 unique non-empty strings, required
answer: literal string, required
explanation: literal string, required
```

且：

```text
answer 必须属于 options
```

Predict 不允许 children。

当前语法继续允许：

```mdx
options={["justify-content", "align-items"]}
```

但 expression 必须是**静态字面量数组**。

### Compare

required literal string props：

```text
leftTitle
leftCode
leftMeaning
rightTitle
rightCode
rightMeaning
```

不允许 children。

### Exercise

Task 04 会把最终 API 改成：

```text
slug
label
goal
```

本 plugin 直接按最终 API 校验：

- 三个都是 literal string。
- slug 必须符合项目 slug grammar：
  ```text
  ^[a-z0-9]+(?:-[a-z0-9]+)*$
  ```
- 不允许 children。

Task 03 与 Task 04 并行时，短暂的 branch integration 顺序由主 Agent 处理。

---

## 6. Static expression validator

只为 `Predict.options` 支持 attribute expression。

MDX attribute expression 的 ESTree 必须只表示：

```js
["a", "b", "c"]
```

允许节点：

```text
Program
ExpressionStatement
ArrayExpression
Literal / string literal equivalent
```

禁止：

```text
Identifier
CallExpression
MemberExpression
ArrowFunctionExpression
ObjectExpression
SpreadElement
TemplateLiteral with expressions
AssignmentExpression
```

如果 parser 版本的 string literal AST 使用 `Literal` 或 Babel 风格 `StringLiteral`，实现时可以兼容这两种已观察到的实际 shape，但不得放宽到可执行 expression。

如果 `data.estree` 缺失，直接报 authoring error，不要 fallback eval。

---

## 7. Heading semantics

MDX components mapping 调整为语义真实：

```text
lesson.json.title → LessonPanel 的 h1
MDX ##           → h2
MDX ###          → h3
```

不要继续：

```text
MDX h1 -> h2
MDX h2 -> h3
```

因为 contract 已经禁止 H1。

`src/mdx-components.tsx`：

- 删除/不定义 h1 降级映射。
- h2 渲染 h2。
- h3 渲染 h3。
- 其他现有 typography 可保留。

---

## 8. Next MDX 配置

`next.config.ts` 使用：

```ts
const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkLessonContract],
  },
});
```

具体 import path 使用：

```text
./scripts/mdx/remark-lesson-contract.mjs
```

不要启用：

- remote MDX。
- runtime eval。
- rehype raw HTML。
- arbitrary component imports。

---

## 9. 错误行为

Contract violation 必须导致：

```text
pnpm build ❌
```

不能：

- warning 后继续。
- 静默删除 unsupported component。
- fallback 成纯文本。

课程作者必须在 source 阶段修正。

---

## 10. 本任务禁止

- 不改 lesson.mdx。
- 不改 Activity component API implementation。
- 不加 dependency。
- 不改 package scripts。
- 不写 content checker。
- 不修改 generated registry。

Task 05 会补 content-side compile/check tests。

---

## 11. 验证

在当前合法 content 下：

```bash
pnpm lint
pnpm build
git diff --check
```

主 Agent 集成后还必须通过 Task 05 的 contract tests。

---

## 12. Acceptance Criteria

- [ ] import/export 被 compile-time reject。
- [ ] flow/text arbitrary expression 被 reject。
- [ ] unknown JSX component 被 reject。
- [ ] H1 被 reject。
- [ ] Concept props contract 明确。
- [ ] Predict options 只允许 static string array。
- [ ] Predict answer 必须属于 options。
- [ ] Compare props contract 明确。
- [ ] Exercise 按最终 slug/label/goal contract 校验。
- [ ] no spread attributes。
- [ ] no unknown props。
- [ ] MDX h2/h3 输出语义正确 heading。
- [ ] build 对合法 lesson.mdx 成功。
