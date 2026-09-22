# Task 01 — Workspace Domain 与 Exercise v2 Definitions

## 目标

建立 Workspace / Draft / Execution Snapshot / Exercise v2 的纯领域基础，同时保持现有 Exercise v1 production flow 完整可运行。

**本阶段禁止切换生产 ContentReader 到 v2。**

Task 01 完成后应是：

```text
旧 content v1 + 旧 learner runtime 仍可运行
+
新 Workspace/v2 domain 已存在并可验证
```

而不是半迁移状态。

## 1. 开始前读取

至少：

```text
AGENTS.md
src/lib/content/types.ts
src/lib/content/schemas/common.ts
src/lib/content/schemas/exercise.ts
src/lib/content/file/file-content-reader.ts
src/features/exercise/lib/preview-messages.ts
package.json
tsconfig.json
```

全局搜索：

```text
SchemaVersionSchema
CommonRecordSchema
ExerciseRecordSchema
fixtureHtml
baseCss
starterCss
```

## 2. 新建 Workspace Domain

推荐：

```text
src/lib/workspace/
  types.ts
  path.ts
  schemas.ts
  draft.ts
  execution-snapshot.ts
```

不要创建 VirtualFileSystem、WorkspacePlugin、registry。

### 2.1 Core types

语义等价于：

```ts
export type WorkspaceLanguage =
  | "html"
  | "css"
  | "javascript"
  | "typescript";

export type WorkspacePath = string;

export interface WorkspaceFileDefinition {
  readonly path: WorkspacePath;
  readonly language: WorkspaceLanguage;
  readonly editable: boolean;
}

export interface WorkspaceDefinition {
  readonly files: readonly WorkspaceFileDefinition[];
}

export interface StarterWorkspace {
  readonly files: Readonly<Record<WorkspacePath, string>>;
}

export interface ExerciseWorkspace {
  readonly definition: WorkspaceDefinition;
  readonly starter: StarterWorkspace;
}

export interface ExerciseDraft {
  readonly files: Readonly<Record<WorkspacePath, string>>;
}

export interface ExecutionFile {
  readonly path: WorkspacePath;
  readonly language: WorkspaceLanguage;
  readonly content: string;
}

export interface ExecutionSnapshot {
  readonly files: readonly ExecutionFile[];
}
```

不要把 `editable` 复制到 Draft 或 ExecutionFile。

## 3. WorkspacePath 使用 allow-list grammar

每个 segment：

```text
[A-Za-z0-9][A-Za-z0-9._-]*
```

完整 path：

```text
segment("/"segment)*
```

额外要求：

- 非空。
- 不能以 `/` 开头/结尾。
- 不允许 `\`。
- 不允许空 segment。
- segment 不能是 `.` / `..`。
- extension 只允许 lower-case `.html/.css/.js/.ts`。
- extension 与 language 一致。

固定映射：

```text
.html -> html
.css  -> css
.js   -> javascript
.ts   -> typescript
```

允许：

```text
index.html
style.css
main.js
main.ts
utils/math.ts
styles/card.css
```

拒绝：

```text
/index.html
foo\bar.css
foo//bar.css
./style.css
../style.css
foo/../style.css
style.CSS
a b.css
<script>.html
```

### Case collision

schema 必须拒绝 case-insensitive collision：

```text
Foo.css
foo.css
```

不能同时存在。

不要自动 lowercase；发现 collision 就报错。

## 4. Workspace structural schema

必须保证：

- `files` 至少 1 个。
- path 合法。
- 无 exact duplicate。
- 无 case-insensitive collision。
- language/extension 一致。
- declaration order 保留。

**不要要求至少一个 editable file。**

零 editable 是合法结构；是否为合格 learner Exercise 由 Task 02 Content Health 判断。

不要增加：

```text
order
locked
visible
readOnlyVisible
role
```

## 5. Draft helpers

实现：

```ts
createInitialDraft(workspace: ExerciseWorkspace): ExerciseDraft

updateDraftFile(
  workspace: ExerciseWorkspace,
  draft: ExerciseDraft,
  path: WorkspacePath,
  content: string,
): ExerciseDraft

resetDraftFile(
  workspace: ExerciseWorkspace,
  draft: ExerciseDraft,
  path: WorkspacePath,
): ExerciseDraft

resetDraft(workspace: ExerciseWorkspace): ExerciseDraft
```

要求：

- initial draft 只含 editable paths。
- unknown path update 必须显式失败。
- locked path update 必须显式失败。
- resetFile 只允许 editable path。
- reset all 只返回 editable paths。
- 不 mutate 输入。
- 不操作 React / IndexedDB。

dirty helpers可加，但 dirty只能派生。

## 6. Execution Snapshot

实现：

```ts
createExecutionSnapshot(
  workspace: ExerciseWorkspace,
  draft: ExerciseDraft,
): ExecutionSnapshot
```

规则：

1. 按 declaration order 输出。
2. editable -> draft content。
3. locked -> starter content。
4. starter 必须覆盖全部 declared paths。
5. draft 必须覆盖全部 editable paths。
6. draft 出现 unknown/locked path 视为 invariant violation。
7. snapshot 不含 `editable`。
8. 不 mutate workspace/draft。

不要在这里自动补错误 draft；Progress defensive reconciliation 在 Task 03。

## 7. Common schema version 重构

当前全局 `SchemaVersionSchema = z.literal(1)` 需要拆成 common fields + entity version。

目标：

- CourseRecordSchema 只接受 v1。
- ModuleRecordSchema 只接受 v1。
- LessonRecordSchema 只接受 v1。
- 新增 ExerciseRecordV2Schema，只接受 v2。
- **Task 01 结束时 production `ExerciseRecordSchema` 仍保持 v1 行为。**

不要创建全局 `z.union([1, 2])` 让所有 entity 自动接受两版。

## 8. ExerciseRecordV2Schema

新增 v2 definition，但本阶段不替换 production alias。

概念：

```json
{
  "schemaVersion": 2,
  "id": "...",
  "revision": 1,
  "slug": "...",
  "title": "...",
  "prompt": "...",
  "order": 1,
  "status": "published",
  "hints": [],
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
  },
  "checks": []
}
```

Browser structural invariant：

- `type === "browser"`。
- entry 是合法 WorkspacePath。
- entry 存在于 workspace。
- entry language 为 `html`。

### JS/TS 唯一规则

**ExerciseRecordV2Schema 允许 javascript/typescript vocabulary。**

不要在 v2 schema 禁止它们。

```text
Schema/domain vocabulary
!=
current Browser runtime capability
```

当前 capability 约束放：

- Task 02：Studio Content Health
- Task 05：Browser Runtime fail-closed

Task 05 前不向 content 添加 JS/TS。

## 9. Transitional type boundary

本阶段不要删除当前 `Exercise` 的：

```text
fixtureHtml
baseCss
starterCss
```

可以新增清晰 transitional type，如 `ExerciseV2` / `HydratedExerciseV2` / `BrowserRuntimeDefinition`。

但：

- Task 02 cutover 后删除无必要 alias。
- learner production components 不得同时兼容 v1/v2。

禁止：

```ts
type Exercise = ExerciseV1 | ExerciseV2
```

然后 UI 到处分支。

## 10. CheckResult 准备

可新增 neutral type：

```ts
export interface CheckResult {
  id: string;
  message: string;
  passed: boolean;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
}
```

不要包含 `type: Check["type"]`。

Task 05 再切 protocol。

## 11. 本阶段禁止

- 不移动 content assets。
- 不切 FileContentReader。
- 不删除 v1 runtime fields。
- 不改 IndexedDB。
- 不改 learner UI/Preview。
- 不实现 HTML editor。
- 不创建 Worker/Toolchain/runtime registry。

## 12. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

Task 01 核心就是“新定义存在，但旧 production flow 无回归”，所以要跑 E2E。

## 13. Acceptance Criteria

- [ ] Workspace domain types 已建立。
- [ ] WorkspacePath 使用 allow-list grammar。
- [ ] case-insensitive path collision 被拒绝。
- [ ] language/extension 一致。
- [ ] structural schema 不强制 editable >= 1。
- [ ] Draft 只含 editable files。
- [ ] locked/unknown path 不可 update。
- [ ] Execution Snapshot 完整且保持 declaration order。
- [ ] Course/Module/Lesson 仍只接受 v1。
- [ ] ExerciseRecordV2Schema 已存在且只接受 v2。
- [ ] production ExerciseRecordSchema/Reader 仍可读取当前 v1 content。
- [ ] v2 schema 接受 JS/TS vocabulary，但没有执行能力。
- [ ] production learner flow 无 v1/v2 union 分支污染。
- [ ] lint/build/e2e 全过。
