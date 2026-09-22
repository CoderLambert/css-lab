# Task 01 — Lesson Content Contract 与 Source Boundary

## 目标

消除当前 Lesson 正文双路径，使：

```text
Lesson runtime domain
!=
lesson.mdx source
```

完成后：

```text
lesson.json
→ FileContentReader
→ Lesson metadata

lesson.mdx
→ static MDX module / generated registry

lesson.mdx filesystem facts
→ LessonContentInspector
→ Studio Content Health
```

本任务是 Task 02/03/04 的串行前置任务。

---

## 1. 开始前读取

至少：

```text
AGENTS.md
src/lib/content/types.ts
src/lib/content/reader.ts
src/lib/content/file/file-content-reader.ts
src/lib/content/file/file-utils.ts
src/features/studio/lib/content-health.ts
src/app/studio/page.tsx
src/app/learn/[courseSlug]/[moduleSlug]/[lessonSlug]/[exerciseSlug]/page.tsx
src/features/learning/lib/lesson-content-registry.tsx
content/**/lesson.json
content/**/lesson.mdx
e2e/studio-content-health.spec.ts
e2e/learner-runtime.spec.ts
```

全局搜索：

```text
bodyMdxSource
readTextFile
lesson.mdx
readStudioContentHealth
Lesson
```

---

## 2. Lesson runtime type 收敛

删除：

```ts
bodyMdxSource: string;
```

最终 `Lesson` 只包含 metadata + parent IDs：

```ts
export interface Lesson {
  schemaVersion: 1;
  id: string;
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  status: EntityStatus;
  courseId: string;
  moduleId: string;
}
```

不要新增：

```text
mdxPath
mdxImportPath
contentComponent
body
source
compiledMdx
```

到 runtime Lesson。

---

## 3. FileContentReader 不再读取 lesson.mdx

当前 `readLesson()` 中类似：

```ts
const bodyMdxSource = await readTextFile(join(directoryPath, "lesson.mdx"));
```

删除。

`readLesson()` 只读取：

```text
lesson.json
```

并返回 Lesson metadata。

### 重要语义

缺失 `lesson.mdx` 不应让 `FileContentReader.getLessonBySlug()` 失败。

原因：

```text
metadata loading
!=
authoring source health
```

是否缺少/为空由专门的 source inspector + Studio Health 处理。

---

## 4. 新增 Lesson Content Source Inspector

不要把 MDX source 再塞回 `Lesson`。

新增窄接口，推荐：

```text
src/lib/content/lesson-content-source.ts
src/lib/content/file/file-lesson-content-inspector.ts
```

语义：

```ts
export interface LessonSourceRef {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
}

export interface LessonContentInspection {
  exists: boolean;
  isEmpty: boolean;
}

export interface LessonContentInspector {
  inspectLessonContent(
    source: LessonSourceRef,
  ): Promise<LessonContentInspection>;
}
```

### File implementation

`FileLessonContentInspector`：

- 必须 `import "server-only"`。
- courses root convention 与 FileContentReader 一致。
- 只接受已经过 slug grammar 的 slug；建议复用 `SlugSchema`。
- 拼接：
  ```text
  content/courses/<course>/modules/<module>/lessons/<lesson>/lesson.mdx
  ```
- ENOENT：
  ```ts
  { exists: false, isEmpty: true }
  ```
- 文件存在：
  ```ts
  {
    exists: true,
    isEmpty: source.trim().length === 0
  }
  ```
- 其他 IO 错误必须 throw，不能伪装成 missing。
- 不返回 source body。
- 不返回绝对 OS path。

### 为什么只返回 source facts

本 Inspector 用于 Studio authoring health，不是另一个 MDX loader。

禁止：

```ts
interface LessonContentInspection {
  source: string;
}
```

否则会重新制造双路径。

---

## 5. Studio Content Health 接入

当前 `readStudioContentHealth(contentReader)` 需要新增明确依赖：

```ts
readStudioContentHealth(
  contentReader: ContentReader,
  lessonContentInspector: LessonContentInspector,
)
```

不要在 health 函数内部 `new FileLessonContentInspector()`。

原因：

- 保持 dependency injection。
- E2E/未来 adapter 可替换。
- Studio domain 不应硬编码 filesystem implementation。

`src/app/studio/page.tsx` 负责构造：

```ts
const contentReader = new FileContentReader();
const lessonContentInspector = new FileLessonContentInspector();

const health = await readStudioContentHealth(
  contentReader,
  lessonContentInspector,
);
```

名称可结合当前代码风格轻微调整，但依赖方向必须如此。

---

## 6. Health 规则

替换当前：

```ts
lesson.bodyMdxSource.trim().length === 0
```

为 inspector 结果。

### missing lesson.mdx

code：

```text
missing-lesson-mdx
```

severity：

```text
完整 published chain + lesson published → error
其他 → warning
```

message 必须明确：

```text
Lesson “...” 缺少 lesson.mdx。
```

### empty lesson.mdx

保留/使用：

```text
empty-lesson-body
```

severity 同上。

message 改为准确的：

```text
Lesson “...” 的 lesson.mdx 为空。
```

### 不重复报告

如果 missing：

- 只报 missing。
- 不再同时报 empty。

---

## 7. Learner route 调整

当前 learner page 有：

```ts
const { bodyMdxSource, ...lessonMetadata } = lesson;
void bodyMdxSource;
```

删除该 workaround。

直接把 Lesson metadata 传给 LearningWorkspace。

当前手工 `renderLessonContent()` 暂时保留，Task 02 会替换。

---

## 8. 类型传播

检查：

```text
LessonPanel
LearningWorkspace
StudioLessonEntry
learner-content
ContentReader
tests
```

删除所有：

```ts
Omit<Lesson, "bodyMdxSource">
```

应该统一回归：

```ts
Lesson
```

不要为了兼容旧代码增加 optional field。

---

## 9. 本任务禁止

- 不改 generated registry。
- 不实现 registry generator。
- 不改 MDX component whitelist。
- 不改 Activity API。
- 不删 react-markdown。
- 不改 Exercise schema。
- 不改 Preview/checker/runtime。
- 不改 package dependencies。

Task 01 结束时允许手工 registry 暂时仍存在，因为 Task 02 紧接着替换。

---

## 10. 验证

执行：

```bash
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
```

额外搜索：

```bash
git grep -n "bodyMdxSource"
git grep -n 'Omit<Lesson, "bodyMdxSource">'
```

两者应无 production 命中。

Studio 应保持：

```text
0 blocking issues
0 warnings
```

---

## 11. Acceptance Criteria

- [ ] Lesson runtime type 删除 bodyMdxSource。
- [ ] FileContentReader 不再读取 lesson.mdx。
- [ ] FileLessonContentInspector 为 server-only。
- [ ] Inspector 不返回 MDX source body。
- [ ] missing 与 empty MDX 有独立 health 语义。
- [ ] published missing/empty 为 error。
- [ ] draft/hidden missing/empty 为 warning。
- [ ] Studio 通过注入 Inspector 获取 source facts。
- [ ] Learner route 无 bodyMdxSource workaround。
- [ ] LessonPanel / LearningWorkspace 直接使用 Lesson。
- [ ] 手工 registry 暂时仍可运行。
- [ ] lint/build/e2e 全过。
