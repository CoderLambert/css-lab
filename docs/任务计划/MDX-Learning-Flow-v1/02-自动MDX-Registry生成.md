# Task 02 — 自动 MDX Registry 生成

## 并行属性

本任务属于 Parallel Wave 1，可与 Task 03、Task 04 并行。

**子 Agent 文件所有权必须遵守 00 文档。**

---

## 目标

删除手工维护：

```text
src/features/learning/lib/lesson-content-registry.tsx
```

改为：

```text
content filesystem
→ deterministic manifest
→ generated static MDX imports
→ generated render switch
```

满足：

> 新增一个符合目录约定的 Lesson 后，不需要再手工修改 application source。

---

## 1. 开始前读取

```text
src/features/learning/lib/lesson-content-registry.tsx
src/app/learn/[courseSlug]/[moduleSlug]/[lessonSlug]/[exerciseSlug]/page.tsx
tsconfig.json
content/courses/**
package.json
next.config.ts
```

本任务不得修改 package.json / pnpm-lock.yaml。

---

## 2. Registry key

明确使用 filesystem curriculum path：

```text
<courseSlug>/<moduleSlug>/<lessonSlug>
```

例如：

```text
css-foundations/flexbox/flexbox-alignment
```

不要使用 Lesson stable id 作为 module locator。

理由：

```text
stable id
= domain identity

filesystem path
= build-time source locator
```

二者职责分离。

---

## 3. 新增 manifest scanner

新增：

```text
scripts/content/lesson-manifest.mjs
```

只使用 Node 标准库，不引入 glob 库。

推荐导出：

```js
export async function readLessonManifest({
  coursesRoot,
} = {}) { ... }
```

每个 entry：

```js
{
  key: "css-foundations/flexbox/flexbox-alignment",
  courseSlug: "css-foundations",
  moduleSlug: "flexbox",
  lessonSlug: "flexbox-alignment",
  mdxImportPath:
    "@content/courses/css-foundations/modules/flexbox/lessons/flexbox-alignment/lesson.mdx"
}
```

### 扫描规则

严格按现有 hierarchy：

```text
content/courses/*
  /modules/*
    /lessons/*
```

一个目录只有存在：

```text
lesson.json
```

才被视为 Lesson source directory。

对每个 Lesson：

- `lesson.mdx` 必须存在，否则 generator 直接失败。
- key 必须唯一。
- manifest 最终按 `key.localeCompare()` 的确定顺序排序。
- 不读取/编译 MDX body。
- 不解析 exercise。
- 不 follow symlink。
- 只接受 directory entry。

不要设计 generic recursive content discovery framework。

---

## 4. Registry source builder

新增：

```text
scripts/content/lesson-registry-source.mjs
```

推荐：

```js
export function createLessonRegistrySource(manifest) { ... }
```

生成目标：

```text
src/features/learning/generated/lesson-content-registry.tsx
```

文件头必须：

```ts
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: pnpm content:generate
```

虽然 `content:generate` script 到 Task 05 才统一加入 package.json，
生成器内部 CLI 现在就可通过：

```bash
node scripts/content/generate-lesson-content-registry.mjs
```

运行。

---

## 5. React 19 static-components 约束

**不要生成动态 ComponentType lookup 后再在 render 中实例化。**

之前 Demo 已经遇到 React static-components lint。

禁止生成：

```tsx
const Component = registry[key];
return <Component />;
```

生成静态 import + switch：

```tsx
import type { ReactNode } from "react";

import LessonContent0000 from "@content/.../lesson.mdx";
import LessonContent0001 from "@content/.../lesson.mdx";

export function renderLessonContent(
  contentKey: string,
): ReactNode {
  switch (contentKey) {
    case "css-foundations/flexbox/flexbox-alignment":
      return <LessonContent0000 />;

    case "...":
      return <LessonContent0001 />;

    default:
      return null;
  }
}
```

变量名：

```text
LessonContent0000
LessonContent0001
...
```

按 manifest 排序生成，确保 deterministic。

---

## 6. Generator

新增：

```text
scripts/content/generate-lesson-content-registry.mjs
```

流程：

1. read manifest。
2. create source。
3. 与目标文件现有内容比较。
4. 相同则不写。
5. 不同才写。
6. 保证最终 newline。

不要调用 shell 格式化器。

生成 source 本身必须符合项目 Prettier/ESLint 风格。

---

## 7. Learner route 切换

删除：

```text
src/features/learning/lib/lesson-content-registry.tsx
```

learner page 改为 import generated registry。

构造 key：

```ts
const lessonContentKey =
  `${course.slug}/${courseModule.slug}/${lesson.slug}`;

const lessonContent = renderLessonContent(lessonContentKey);

if (!lessonContent) {
  notFound();
}
```

不要让 UI 知道完整 filesystem path。

不要从 lesson stable id 查 registry。

---

## 8. 生成文件是否提交 Git

**必须提交。**

本项目不采用 build 时偷偷写 source tree 的方案。

理由：

- IDE/typecheck 始终能看到 registry。
- PR 能看到课程新增导致的 registry diff。
- CI 可检查 stale。
- build 不修改 working tree。

Task 05 会实现 `content:check` 检查 stale。

---

## 9. 不要在本任务实现

- package scripts。
- stale check command。
- Exercise reference validation。
- MDX compile contract。
- Studio Health。
- react-markdown cleanup。

这些属于后续任务。

---

## 10. 本任务本地验证

由于 package script 尚未接入，直接：

```bash
node scripts/content/generate-lesson-content-registry.mjs
git diff --check
pnpm lint
pnpm build
```

重复执行 generator：

```bash
node scripts/content/generate-lesson-content-registry.mjs
git status --short
```

第二次执行不得产生新的 diff。

---

## 11. Acceptance Criteria

- [ ] manifest scanner 使用 Node 标准库。
- [ ] Lesson key 使用 course/module/lesson slug path。
- [ ] missing lesson.mdx 使 generator 明确失败。
- [ ] manifest 排序 deterministic。
- [ ] generated registry 有 DO NOT EDIT header。
- [ ] generated registry 使用 static JSX switch。
- [ ] 不使用动态 ComponentType render。
- [ ] learner page 使用 generated registry。
- [ ] 手工 registry 删除。
- [ ] 新 Lesson 不需要改 application source。
- [ ] generator 重复执行幂等。
- [ ] lint/build 通过。
