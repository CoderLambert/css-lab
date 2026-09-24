# CSS Lab 前端 IndexedDB Progress Persistence

## 1. 目标

M6A 使用浏览器 IndexedDB 持久化 learner 的 Exercise Draft 与完成状态。刷新页面后恢复当前 Workspace 中的可编辑文件；Checker 通过后保留完成状态。

当前持久化是核心学习流程的渐进增强：

```text
编辑任意 editable Workspace file
→ React Draft 立即更新
→ Preview / Browser Runtime 立即更新
→ IndexedDB 异步持久化
```

IndexedDB 失败不能阻塞 Workspace Editor、Preview、Checker 或 Reset。Progress persistence 只承担 Exercise progress，不承担 Course / Module / Lesson progress、云同步或服务端存储。

---

## 2. 架构与边界

```text
LearningWorkspace
      ↓
useExerciseProgress
      ↓
ProgressStore
      ↓
IndexedDbProgressStore
      ↓
idb → IndexedDB
```

Progress adapter 负责数据库访问；UI 不直接调用原生 IndexedDB，也不依赖具体 adapter。使用 `idb` Promise API 与 typed `DBSchema`，不维护自定义 request wrapper。

Workspace Draft 是当前编辑状态的 UI source of truth；IndexedDB 只是 persistence layer，不定义 Runtime topology，也不成为隐式 VFS。

---

## 3. Draft 与 Progress 数据模型

M6A Progress 不再保存单一 CSS 字符串。当前 Draft 是当前 Workspace 中 editable 文件的 map：

```ts
interface ExerciseDraft {
  files: Record<WorkspacePath, string>;
}
```

locked files 由当前 Workspace starter/content 提供，不写入 learner progress。Progress 使用 strict Zod discriminated union：

```ts
{
  exerciseId: string;
  revision: number;
  files: Record<string, string>;
  status: "started";
  updatedAt: number;
}

{
  exerciseId: string;
  revision: number;
  files: Record<string, string>;
  status: "completed";
  completedAt: number;
  updatedAt: number;
}
```

读取记录必须经过 `ExerciseProgressSchema.safeParse`。非法记录视为无有效 progress，不把 malformed domain data 暴露给 UI。

---

## 4. IndexedDB schema

```text
Database: css-lab
Version: 2
Object Store: exercise-progress
Primary Key: [exerciseId, revision]
```

`[exerciseId, revision]` 是 compatibility boundary：不同 revision 的 Draft / completed 状态不会互相恢复。

---

## 5. v1 → v2 migration

M6A 是 forward migration。历史 DB v1 记录可能包含：

```ts
{
  exerciseId,
  revision,
  code,
  status,
  updatedAt,
  completedAt?
}
```

只在 IndexedDB versionchange transaction 内迁移为：

```ts
{
  exerciseId,
  revision,
  files: { "style.css": code },
  status,
  updatedAt,
  completedAt?
}
```

`code` 只属于 historical v1 migration input；production Progress contract 只暴露 `files`。能够通过严格 legacy schema 的记录才迁移；malformed legacy record 不得使整个 upgrade 崩溃，后续读取时按无效记录处理。已经是 DB v2 的数据库不会重新执行 v1 mapping。

---

## 6. Database 生命周期与 blocked upgrade

数据库按需打开，不在 module evaluation 阶段访问 IndexedDB。正常路径缓存 connection / opening promise，并只在 `upgrade` callback 内执行 schema migration。

如果 legacy / non-cooperative v1 connection 阻塞 v2 upgrade：

```text
open v2
→ blocked
→ 当前 session persistence 标记 unavailable
→ hydration 有界结束
→ learner 继续使用 in-memory Draft
```

要求：

- Editor / Preview / Checker / Reset 继续工作。
- 不调用 production `deleteDatabase` 强拆旧 connection。
- 被阻塞后晚到的 stale open attempt 必须被丢弃并关闭。
- 晚到 DB data 不得覆盖当前 session 已发生的本地 Draft mutation。

该 fallback 是 session-local degradation，不是第二套 persistence backend。

---

## 7. ProgressStore contract

```ts
interface ProgressStore {
  getExercise(exerciseId: string, revision: number): Promise<ExerciseProgress | null>;
  getExercises(keys: readonly ExerciseProgressKey[]): Promise<ExerciseProgress[]>;
  saveDraft(input: SaveExerciseDraftInput): Promise<void>;
  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
```

普通编辑、Reset file 与 Reset All 通过 `saveDraft` 持久化完整 editable Draft。若记录已经 completed，保存 Draft 时必须保留 `completed` 与首次 `completedAt`。

只有 accepted successful Check 才调用 `markCompleted`，并保存该次 Check 开始时捕获的 Draft。`completedAt` 表示首次完成时间。

---

## 8. Transaction 与 hydration

`saveDraft` 与 `markCompleted` 都是 read-modify-write，必须在单个 `readwrite` transaction 内完成：

```text
begin transaction
→ get current progress
→ domain decision
→ put next progress
→ await transaction.done
```

Transaction 内不加入 network request、timer、React state update 或其他无关 async workflow。

`useExerciseProgress` 从 `createInitialDraft(workspace)` 开始，只包含 editable starter files。Hydration 必须通过 `reconcileDraft(workspace, savedFiles)`：

- 只恢复当前 Workspace 仍存在且 editable 的 path。
- locked file 永远来自 current starter/content。
- 已删除、未知或旧 revision path 不恢复。
- 新增 editable file 没有 saved value 时使用 current starter content。

Hydration 失败也必须结束 hydration，保留 in-memory Draft 并继续允许 Checker。用户本地 mutation 优先于晚到 storage data；旧 Exercise 的异步结果不能 hydrate 当前 session。

---

## 9. Checker 与 captured Draft

Checker 是 completion 的唯一 source，不通过 source/solution 字符串比较判断完成。

发起 Check 时，`LearningWorkspace` 捕获 immutable Draft 与 ExecutionSnapshot，并绑定 `requestId`：

```ts
const capturedDraft = { files: { ...draft.files } };
const request = {
  requestId,
  checks,
  snapshot: createExecutionSnapshot(exercise.workspace, capturedDraft),
};
```

只有 current generation、current request、仍存在的 active check 且 `result.passed === true` 时，才调用 `markCompleted(capturedDraft)`。用户编辑任意 Workspace file 或 Reset 后，旧 Checker result 不得写入 completed。

---

## 10. Autosave 与 Reset

```text
Workspace edit
→ React Draft
→ Preview / Runtime
→ saveDraft() fire-and-forget
→ IndexedDB
```

持久化失败只记录 development warning，不回滚 Draft，也不阻塞用户输入。当前 Workspace 数据量小，暂不引入 debounce 或 write queue。

`resetFile(path)` 恢复一个 editable file；`resetAll()` 恢复全部 editable files。Reset 改变 Draft，但不清除完成状态：

```text
completed exercise
→ Reset file / Reset All
→ current starter-derived Draft
→ status = completed
→ completedAt = original completedAt
```

---

## 11. Failure strategy

以下情况都不能使 learner workflow 崩溃：IndexedDB unavailable、open failure、blocked v2 upgrade、transaction failure、quota/storage error 或 malformed record。

```text
persistence failure
→ development warning
→ current in-memory Draft
→ Editor / Preview / Checker / Reset 继续工作
```

不使用 localStorage 作为静默 fallback，避免形成第二套 persistence semantics。

---

## 12. Release / rollback boundary

Exercise v2 与 IndexedDB v2 是同一个 forward compatibility unit。production client 打开 DB v2 后：

- 不得把 database version 降回 1。
- 不得使用 `deleteDatabase` 作为 rollback。
- 不得恢复 production v1/v2 dual-read 或 dual-write。
- hotfix / rollback 必须继续理解 DB v2 的 `files` record。
- 历史 `code → files["style.css"]` mapping 只保留在 v1→v2 migration 与 migration tests。

Workspace UI 或 Browser Runtime 出现问题时，使用 forward-fix 或受限 v2 experience，不破坏 storage compatibility boundary。

---

## 13. 当前明确不做的能力

Progress persistence 不承担 Course / Module / Lesson progress、cloud sync、authentication、backend database、cross-tab reactive synchronization、IndexedDB content cache、Studio persistence、undo history persistence 或 generic Workspace/VFS persistence。

---

## 14. 关键不变量与验证重点

维护 persistence 时必须保持：

1. `[exerciseId, revision]` 是 progress identity。
2. Progress 只保存 editable Draft files，不保存 locked files。
3. Hydration 必须经过 current Workspace reconciliation。
4. Storage failure / blocked upgrade 不阻塞核心学习流程。
5. Hydration 完成前 Checker 不运行。
6. Completion 保存 accepted Check 的 captured Draft。
7. Workspace 修改 / Reset 会使旧 Checker result 失效。
8. `saveDraft` 不得把 completed 降级为 started。
9. `completedAt` 保留首次完成时间，Reset 不清除完成状态。
10. DB v2 是 forward-only compatibility boundary。

修改 Progress persistence 后至少验证：

```bash
pnpm lint
pnpm build
git diff --check
```

并验证 fresh DB 直接以 v2 打开、v1 valid record 正确迁移、blocked upgrade 进入 session-local fallback、editable files 恢复、locked files 不从 storage 恢复，以及 captured Draft completion。
