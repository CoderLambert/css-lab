# Task 02 — Content Assets、Exercise v2 Atomic Cutover、ContentReader 与 Studio Health

## 目标

在一个阶段内原子完成：

```text
content assets v1 -> workspace layout
exercise.json v1 -> v2
runtime Exercise type -> Workspace
FileContentReader -> workspace hydration
Studio -> workspace/source health
```

Task 02 结束后不再存在 production v1 Exercise runtime contract。

## 1. 开始前读取

```text
docs/任务计划/01-M6A-Workspace-Domain与Exercise-Schema-v2.md
src/lib/workspace/*
src/lib/content/file/file-content-reader.ts
src/lib/content/file/file-utils.ts
src/lib/content/reader.ts
src/lib/content/types.ts
src/lib/content/schemas/exercise.ts
src/features/studio/lib/content-health.ts
src/app/studio/page.tsx
src/features/learning/lib/learner-content.ts
content/courses/**
e2e/studio-content-health.spec.ts
```

全局搜索：

```text
fixtureHtml
baseCss
starterCss
fixture.html
base.css
starter.css
solution.css
ExerciseRecordSchema
```

## 2. 原子 cutover 原则

这个阶段同一 commit 必须同时包含：

- metadata v2
- asset relocation
- Exercise runtime type
- production ExerciseRecordSchema -> v2
- FileContentReader v2 hydration
- Studio updates

不要提交“Reader 只认 v2，但磁盘还是 v1”的中间态。

不要长期保留 v1/v2 双读 fallback。

## 3. 现有 Exercise asset 迁移

每个当前 exercise：

```text
exercise.json
fixture.html
base.css
starter.css
solution.css
```

迁移：

```text
exercise.json

starter/
  index.html
  base.css
  style.css

solution/
  style.css
```

映射：

```text
fixture.html  -> starter/index.html
base.css      -> starter/base.css
starter.css   -> starter/style.css
solution.css  -> solution/style.css
```

不创建 `support/`。

当前 3 个 Exercise 的 id/slug/order/revision/URL 不变；仅 asset representation 改变不 bump revision。

## 4. exercise.json v2

当前 CSS exercises：

```json
"workspace": {
  "files": [
    { "path": "index.html", "language": "html", "editable": false },
    { "path": "base.css", "language": "css", "editable": false },
    { "path": "style.css", "language": "css", "editable": true }
  ]
},
"runtime": {
  "type": "browser",
  "entry": "index.html"
}
```

顺序固定：

```text
index.html
base.css
style.css
```

CSS cascade 后续依赖 declaration order。

## 5. Production Exercise type cutover

Task 02 完成后 `Exercise`：

- `schemaVersion: 2`。
- 保留 metadata/checks/parent ids。
- 增加 `workspace: ExerciseWorkspace`。
- 增加 `runtime: BrowserRuntimeDefinition`。
- 删除 `fixtureHtml/baseCss/starterCss`。

不要保留 optional legacy fields、legacyAssets 或 v1/v2 UI union。

Task 01 transitional alias如已无用，本阶段删除/收敛。

## 6. FileContentReader hydration

`readExercise()`：

1. 读取 `exercise.json`。
2. 使用 production ExerciseRecordSchema(v2) validate。
3. 遍历 `record.workspace.files`。
4. 读取 `starter/<logical-path>`。
5. hydrate `StarterWorkspace.files`。
6. 返回 solution-free Exercise。

只有通过 WorkspacePath schema 的 logical path 可以进入 OS `join()`。

Runtime 永远看不到 OS path。

## 7. Hard loading errors 与 Content Health 分工

### Hard loading/schema error

以下继续让 FileContentReader throw，Studio 显示已有 `Content load failed`：

- JSON parse 失败。
- ExerciseRecordV2Schema 不合法。
- Workspace path 不合法。
- duplicate/case-collision path。
- language/extension mismatch。
- Browser entry 不存在或不是 HTML。
- 声明的 starter file 缺失/不可读。

不要为把这些变成 Health row 而重写整个 loading pipeline。

### Content Health issue

Reader 成功 hydrate 后才做：

- zero editable
- unsupported Browser language
- multiple HTML
- undeclared starter
- solution completeness
- 原有 stable-id/order/published/check rules

这样 schema/read error 与 authoring quality 不冲突。

## 8. Server-only ContentSourceInspector

Solution 不进入 Exercise，因此 Studio 使用窄 source inspection。

推荐：

```text
src/lib/content/file/file-content-source-inspector.ts
```

必须 `import "server-only"`。

建议 contract：

```ts
interface ExerciseSourceRef {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  exerciseSlug: string;
}

interface ExerciseAssetInspection {
  starterPaths: readonly WorkspacePath[];
  solutionPaths: readonly WorkspacePath[];
}

interface ContentSourceInspector {
  inspectExercise(
    source: ExerciseSourceRef,
  ): Promise<ExerciseAssetInspection>;
}
```

File implementation与 FileContentReader使用同一 courses root convention。

### Scanner rules

递归扫描 `starter/` / `solution/`，返回：

- 相对对应 root 的 logical path。
- separator 永远 `/`。
- sorted，报告 deterministic。
- 只包含 regular files。

遇到 symlink/socket/device/其他非 regular file：

- 不 follow。
- 作为 source inspection error/health error。

不得暴露绝对 OS path 到 Studio domain。

## 9. Studio Workspace Health

保留现有：

- duplicate stable id
- sibling duplicate order
- published-child-hidden
- empty lesson body
- published empty lesson/module/course
- exercise without checks
- duplicate check id

删除 `empty-fixture`。

### zero editable

```text
visible published exercise -> error
draft/hidden exercise      -> warning
```

### Browser current capability

`runtime.type === "browser"` 且 workspace 含 `javascript/typescript` -> error。

这是 authoring capability error，不改变 Workspace schema vocabulary。

### Multiple HTML

M6A Browser exercise 中 HTML files 必须正好 1。

0 HTML 已由 entry structural validation挡住；>1 -> Health error。

不定义 multi-page semantics。

### Undeclared starter

```text
actual starter paths - declared workspace paths
```

非空 -> error。

声明但缺 starter 已属于 Reader hard error，不重复诊断。

## 10. Solution completeness

```text
editablePaths = declared files where editable=true
solutionPaths = ContentSourceInspector.solutionPaths

set(solutionPaths) === set(editablePaths)
```

因此：

- editable path 缺 solution -> error
- locked path 出现在 solution -> error
- undeclared solution path -> error
- extra solution file -> error

当前 CSS Exercise 只能有 `solution/style.css`，不要复制 locked `index.html/base.css`。

## 11. Solution boundary

禁止：

```ts
interface Exercise {
  solution: ...
  solutionFiles: ...
}
```

也禁止“先读进 Exercise 再 omit”。

正确边界：

```text
FileContentReader
  -> learner-safe hydrated Exercise

FileContentSourceInspector
  -> server-only authoring source facts
```

Studio可依赖两者；learner只能依赖前者。

## 12. JS/TS interim rule

Task 02-04 期间不得向 content 添加 JS/TS workspace file。

schema vocabulary允许，但 Browser fail-closed 到 Task 05 才完成。

## 13. E2E

更新 `e2e/studio-content-health.spec.ts`：

- Studio 正常打开。
- exercise count 3。
- published exercise count 3。
- 0 errors。
- 0 warnings。
- learner links 3。
- learner href不变。

不要依赖样式 class。

## 14. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

人工确认旧 root assets不与新结构双存。注意 `starter/base.css` 是合法新路径。

## 15. Acceptance Criteria

- [ ] 当前 3 个 exercise 已迁移 starter/solution。
- [ ] Exercise production schema/type 原子切 v2。
- [ ] 不存在 v1/v2 UI union。
- [ ] fixtureHtml/baseCss/starterCss 从 runtime Exercise 删除。
- [ ] Reader metadata-driven hydrate declared starter files。
- [ ] declared starter missing 明确为 hard load error。
- [ ] ContentSourceInspector server-only。
- [ ] Inspector 只返回 normalized logical paths。
- [ ] solution 不进入 Exercise。
- [ ] zero editable 按状态 audit。
- [ ] JS/TS Browser capability 报 error。
- [ ] multiple HTML 报 error。
- [ ] solution path set 等于 editable path set。
- [ ] Studio 当前 0 error / 0 warning。
- [ ] URL/id/revision不变。
- [ ] lint/build/e2e通过。
