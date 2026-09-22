# Task 01 — Workspace Domain 与 Exercise Schema v2

## 目标

建立 M6A 的领域基础。此阶段只修改类型、schema 和纯 domain helper，不改 learner UI、不改 IndexedDB、不实现 Browser Runtime 新行为。

## 开始前读取

至少重新读取：

```text
AGENTS.md
src/lib/content/types.ts
src/lib/content/schemas/common.ts
src/lib/content/schemas/exercise.ts
src/lib/content/file/file-content-reader.ts
src/features/exercise/lib/preview-messages.ts
```

## 1. 新建 Workspace Domain

推荐目录：

```text
src/lib/workspace/
  types.ts
  path.ts
  draft.ts
  execution-snapshot.ts
```

不要创建 barrel file，除非现有项目风格明确需要。

### 1.1 核心类型

类型语义必须等价于：

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

如实现时能减少无意义 wrapper，可调整文件拆分，但不要改变这些领域边界。

### 1.2 Workspace path 规则

实现一个单一 path validator/schema，Content schema 和纯 helper 共享。

必须拒绝：

- 空字符串
- 绝对路径
- 以 `/` 开头
- 反斜杠 `\`
- `.` path segment
- `..` path segment
- 空 segment，例如 `foo//bar.css`
- trailing slash
- 与 language 不一致的扩展名

M6A 固定扩展名映射：

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

不要支持 jsx/tsx/mjs/cjs/vue/svelte。

### 1.3 WorkspaceDefinition invariants

Exercise schema validation必须保证：

- `files` 非空。
- path 唯一。
- 至少存在一个 `editable: true` 文件。
- declaration order 保留；不要自动排序。
- language 与 extension 匹配。

不要为 file 增加 `order` 字段，数组顺序就是稳定顺序。

## 2. Draft helpers

实现纯函数，职责明确：

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

规则：

- initial draft 只包含 editable files。
- update locked file 必须失败，不允许静默加入。
- update unknown path 必须失败。
- reset single file 恢复对应 starter content。
- reset all 只产生 editable files。
- helper 不操作 React state、不操作 IndexedDB。

可以额外提供：

```ts
isDraftDirty(...)
isDraftFileDirty(...)
```

但 dirty 必须是 derived state，不得成为持久化字段。

## 3. Execution Snapshot helper

实现：

```ts
createExecutionSnapshot(
  workspace: ExerciseWorkspace,
  draft: ExerciseDraft,
): ExecutionSnapshot
```

规则：

1. 按 `WorkspaceDefinition.files` declaration order 输出。
2. editable file 使用 draft content。
3. locked file 使用 starter content。
4. draft 缺少 editable path 时应视为 domain invariant violation；不要静默生成不完整 snapshot。
5. snapshot 不包含 `editable`。
6. snapshot 不引用 React state，不做 side effect。

## 4. Schema version 重构

当前 `SchemaVersionSchema = z.literal(1)` 不应继续作为所有 entity 的统一 version。

要求：

- CourseRecordSchema 仍只接受 v1。
- ModuleRecordSchema 仍只接受 v1。
- LessonRecordSchema 仍只接受 v1。
- ExerciseRecordSchema 改为只接受 v2。
- 不允许 Course/Module/Lesson 因通用 union 而接受 v2。

可把 common fields 与 version literal 拆开，但保持 strict object 语义。

## 5. ExerciseRecordSchema v2

推荐磁盘结构：

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
      {
        "path": "index.html",
        "language": "html",
        "editable": false
      },
      {
        "path": "base.css",
        "language": "css",
        "editable": false
      },
      {
        "path": "style.css",
        "language": "css",
        "editable": true
      }
    ]
  },
  "runtime": {
    "type": "browser",
    "entry": "index.html"
  },
  "checks": []
}
```

M6A Browser Runtime validation必须保证：

- runtime.type 固定为 `browser`。
- entry 是合法 WorkspacePath。
- entry 存在于 workspace files。
- entry language 是 `html`。

此阶段不要加入：

- worker runtime variant
- no-runtime variant
- toolchain metadata
- TypeScript compiler options

### 当前 Browser capability 限制

虽然 WorkspaceLanguage 已包含 JS/TS，为长期 domain 稳定性保留；但当前 M6A Browser exercise 只能声明 HTML/CSS workspace file。

因此 ExerciseRecord v2 应明确拒绝 published/current Browser exercise 中的 javascript/typescript 文件，避免 schema 表达能力被误认为 runtime capability。

如果为了未来 schema 迁移更合理，也可把该限制放在 content health，而不是基础 Workspace schema；但当前所有 learner-facing Browser v2 内容必须被阻止运行 JS/TS。

## 6. Exercise runtime type

重写 `src/lib/content/types.ts` 中 Exercise：

- `schemaVersion: 2`
- 删除 `fixtureHtml`
- 删除 `baseCss`
- 删除 `starterCss`
- 增加 `workspace: ExerciseWorkspace`
- 增加 `runtime: BrowserRuntimeDefinition`
- checks 保留当前 Browser checks

Solution 绝对不能加到 Exercise。

## 7. CheckResult 解耦准备

当前 `CheckState` 从 preview message module 获取 CheckResult。此阶段可新增一个 exercise/check result domain type，为 Task 05 做准备，但不要顺手做 CheckerRegistry。

## 8. 本阶段不要做

- 不移动 Preview 文件。
- 不改 Content assets。
- 不改 DB。
- 不实现 HTML editor。
- 不实现 JS/TS runtime。
- 不创建 runtime registry。

如果 Exercise v2 schema 导致当前 content 暂时不能通过 ContentReader，可在 Task 02 紧接着迁移；但提交前至少 TypeScript/schema 单元逻辑应一致，且不要留下一个无法编译的 commit。

## 9. 验证

至少：

```bash
pnpm lint
pnpm build
```

如仓库没有 unit test runner，不要为本任务引入新的测试框架。可用已有 build/typecheck 保证 schema/type 正确，并在后续 E2E 覆盖行为。

## 10. Acceptance Criteria

- [ ] WorkspaceLanguage 是闭合 union。
- [ ] path validator 实现上述约束。
- [ ] Workspace path 支持受控子目录。
- [ ] Definition path 唯一。
- [ ] 至少一个 editable file。
- [ ] Draft 只包含 editable files。
- [ ] locked/unknown path 不可被 update。
- [ ] Execution Snapshot 是完整文件输入且保持 declaration order。
- [ ] Course/Module/Lesson 仍为 schema v1。
- [ ] Exercise 为 schema v2。
- [ ] runtime entry 属于 Browser Runtime metadata。
- [ ] Exercise domain 没有 solution。
- [ ] 没有加入 Toolchain/Worker 的提前抽象。
