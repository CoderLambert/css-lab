# Front-end Lab 前端 IndexedDB Progress Persistence

## 1. 目标

Front-end Lab 使用浏览器 IndexedDB 持久化 learner 的 Exercise Draft 与完成状态，使用户刷新页面后可以恢复当前 Workspace 中的可编辑文件，并在 Checker 通过后保留完成状态。

当前持久化是核心学习流程的渐进增强：

```text
编辑任意 editable Workspace file
→ React Draft 立即更新
→ Preview / Runtime 立即更新
→ IndexedDB 异步持久化
```

IndexedDB 失败不能阻塞：

- Workspace Editor
- Preview / Browser Runtime
- Checker
- Reset file / Reset All

当前只持久化 Exercise progress，不承担 Course / Module / Lesson progress，也不提供云同步、多 Tab 实时同步或服务端存储。

---

## 2. 架构

当前调用链：

```text
LearningWorkspace
      ↓
useExerciseProgress
      ↓
ProgressStore
      ↓
IndexedDbProgressStore
      ↓
idb
      ↓
IndexedDB
```

对应文件：

```text
src/features/progress/
├── hooks/
│   └── use-exercise-progress.ts
└── lib/
    ├── progress-schema.ts
    ├── progress-store.ts
    ├── reconcile-draft.ts
    └── indexeddb-progress-store.ts

src/lib/workspace/
├── draft.ts
├── execution-snapshot.ts
└── types.ts

src/features/learning/components/
├── learning-workspace.tsx
└── workspace-footer.tsx
```

边界约束：

- React feature/component 不直接依赖原生 IndexedDB persistence contract。
- UI 不依赖 `IndexedDbProgressStore` 的具体实现。
- `ProgressStore` 保持异步接口。
- IndexedDB 访问集中在 progress adapter。
- 使用 `idb` Promise API 与 typed `DBSchema`。
- React Draft 是当前编辑状态的 UI source of truth；IndexedDB 只是 persistence layer。
- Persistence 不定义 Runtime topology，也不直接读取 `BrowserRuntimeDefinition`。

---

## 3. Draft 与 Progress 数据模型

M6A Progress 不再保存单一 CSS 字符串。

当前 Draft：

```ts
interface ExerciseDraft {
  files: Record<WorkspacePath, string>;
}
```

Draft 只包含当前 Workspace 中 `editable: true` 的文件。locked files 由 Workspace starter/content 提供，不写入 learner progress。

Progress 使用 strict Zod discriminated union。

### 3.1 Started

```ts
{
  exerciseId: string;
  revision: number;
  files: Record<string, string>;
  status: "started";
  updatedAt: number;
}
```

### 3.2 Completed

```ts
{
  exerciseId: string;
  revision: number;
  files: Record<string, string>;
  status: "completed";
  completedAt: number;
  updatedAt: number;
}
```

约束：

- `exerciseId`：非空字符串。
- `revision`：正整数。
- `updatedAt`：非负整数。
- `completedAt`：非负整数。
- 时间使用 `Date.now()` 得到的 number。
- 不向 IndexedDB 写入 `Date` object。
- 读取记录时必须经过 `ExerciseProgressSchema.safeParse`。
- 非法记录视为无有效 progress，不让 malformed domain data 进入 UI。

---

## 4. IndexedDB Schema

当前数据库定义：

```text
Database: css-lab
Version: 2
Object Store: exercise-progress
Primary Key: [exerciseId, revision]
```

复合主键体现版本边界：

```text
exercise A / revision 1
≠
exercise A / revision 2
```

内容 revision 更新后，旧 revision 的 Draft / completed 状态不会自动恢复到新版本。

当前没有额外查询需求，因此不增加 secondary index。

---

## 5. v1 → v2 Migration

M6A 是 forward migration。

历史 DB v1 记录：

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

只在 IndexedDB versionchange transaction 内迁移到：

```ts
{
  exerciseId,
  revision,
  files: {
    "style.css": code,
  },
  status,
  updatedAt,
  completedAt?
}
```

规则：

- v1 `code` 只用于 historical migration。
- Production Progress contract 不再暴露 `code`。
- Migration 使用 `openDB(..., { upgrade(db, oldVersion, newVersion, transaction) })` 提供的 versionchange transaction，不额外打开第二个 migration transaction。
- 只有能够通过严格 legacy v1 schema 的记录才迁移。
- malformed legacy record 不应导致整个 upgrade 崩溃；它保持原值，后续读取时因不符合 v2 schema 而被视为无有效 progress。
- 已经是 DB v2 的数据库不会重新执行 v1 mapping。

---

## 6. Database 生命周期与 blocked upgrade

数据库连接按需创建，不在 module evaluation 阶段打开 IndexedDB。

目标行为：

```text
第一次 ProgressStore 操作
→ getDatabase()
→ openDB("css-lab", 2)
→ 缓存 connection / opening promise
```

当前生命周期规则：

- 成功打开后复用 database connection。
- open 失败后清理 opening promise。
- connection `terminated` 后清理缓存。
- 当前 connection 收到 `blocking` 时关闭连接并清理缓存。
- schema migration 只发生在 `upgrade` callback。
- 不把数据库 connection 状态暴露给产品 UI。

### 6.1 legacy connection 阻塞 v2 upgrade

如果 legacy / non-cooperative v1 connection 阻塞 DB v2 upgrade：

```text
open v2
→ blocked
→ 当前 session persistence 标记 unavailable
→ hydration 有界结束
→ learner 继续使用 in-memory Draft
```

要求：

- Editor / Preview / Checker / Reset 继续工作。
- 不调用 production `deleteDatabase` 试图强拆旧 connection。
- 被阻塞后晚到的 stale open attempt 必须被丢弃并关闭。
- 晚到 DB data 不得覆盖当前 session 已发生的本地 Draft mutation。

该 fallback 是 session-local degradation，不是第二套 persistence backend。

---

## 7. ProgressStore Contract

当前接口：

```ts
interface ProgressStore {
  getExercise(
    exerciseId: string,
    revision: number,
  ): Promise<ExerciseProgress | null>;

  getExercises(
    keys: readonly ExerciseProgressKey[],
  ): Promise<ExerciseProgress[]>;

  saveDraft(input: SaveExerciseDraftInput): Promise<void>;

  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
```

### 7.1 getExercise / getExercises

读取后必须经过 v2 Zod validation。

非法记录：

```text
stored value exists
→ v2 schema parse fails
→ treated as no valid progress
```

不得把 legacy/malformed value 直接暴露给 React UI。

### 7.2 saveDraft

普通编辑、Reset file 与 Reset All 最终都通过 `saveDraft` 持久化完整 editable Draft。

如果当前记录尚未完成：

```text
status = started
files = latest captured Draft files
updatedAt = latest time
```

如果当前记录已经完成：

```text
status = completed        保留
completedAt               保留首次完成时间
files                     更新
updatedAt                 更新
```

因此 learner 完成 Exercise 后继续实验 HTML/CSS，不会把完成状态降级回 `started`。

### 7.3 markCompleted

只有 accepted successful Check 才调用 `markCompleted`。

第一次完成：

```text
status = completed
completedAt = current time
updatedAt = current time
files = Draft captured when Check was started
```

同 revision 后续再次通过：

```text
completedAt = original completedAt
updatedAt   = latest time
files       = latest accepted captured Draft
```

`completedAt` 表示首次完成时间。

---

## 8. Transaction 模型

`saveDraft` 和 `markCompleted` 都属于 read-modify-write，必须在单个 `readwrite` transaction 内完成：

```text
begin readwrite transaction
        ↓
get current progress
        ↓
domain decision
        ↓
put next progress
        ↓
await transaction.done
```

不要拆成独立 `db.get()` 与 `db.put()`，否则会丢失 read-modify-write 的原子业务窗口。

Transaction 内不加入：

- network request
- timer
- React state update
- 其它无关 async workflow

当前应用中，同一 object store 上的 overlapping `readwrite` transactions 由 IndexedDB 顺序调度；adapter 每次重新读取当前记录，因此 completed state 与首次 `completedAt` 可以被保留。

如果未来加入 debounce、异步写队列、跨 Tab 协调、后台 flush 或网络同步，需要重新设计 operation ordering，不能直接沿用当前结论。

---

## 9. React Hydration 模型

`useExerciseProgress` 初始 Draft 来自：

```text
createInitialDraft(workspace)
```

它只包含当前 Workspace 的 editable starter files。

IndexedDB hydration 在 Effect 中异步执行。

不要在：

- render
- `useState` initializer 中访问 IndexedDB
- module scope

打开 IndexedDB。

当前 hook 暴露：

```ts
{
  draft,
  isHydrated,
  updateFile,
  resetFile,
  resetAll,
  markCompleted,
}
```

### 9.1 reconcileDraft

Storage 中保存的是过去 revision/session 的 editable files map。

Hydration 必须通过 `reconcileDraft(workspace, savedFiles)`：

- 只恢复当前 Workspace 仍存在且 editable 的 path。
- locked file 永远从 current starter/content 读取。
- 已删除或未知 path 不恢复。
- 当前新增 editable file 若无 saved value，则使用 current starter content。

这样 Progress storage 不会变成隐式 VFS。

### 9.2 Hydration identity

当前 Exercise identity：

```text
exerciseId:revision
```

`hydratedExerciseKey` 记录完成 hydration 的 identity；render 时与当前 Exercise key 比较得到 `isHydrated`。

Exercise identity 改变时不会复用上一个 Exercise 的 ready 状态。

### 9.3 本地输入优先于晚到 storage

Hydration 可能和用户输入并发：

```text
显示 starter Draft
↓
IndexedDB 正在读取
↓
用户编辑 / Reset
↓
saved progress 晚到
```

一旦发生本地 mutation，晚到的 storage data 不得覆盖当前 Draft。

当前通过 `hasLocalMutationRef` 协调该非 UI 状态。

### 9.4 Unmount / Exercise change

Effect cleanup 使用 cancelled guard。

旧 Exercise 的 IndexedDB Promise 即使随后 resolve，也不能 hydrate 已卸载或已切换的 session。

### 9.5 Storage failure

读取失败后仍必须结束 hydration：

```text
IndexedDB read failed / session persistence unavailable
↓
development warning
↓
保留当前 in-memory Draft
↓
isHydrated = true
```

否则 Checker 会永久停留在“准备中”。

---

## 10. Checker 与 Persistence 一致性

Checker 是 completion 的唯一 source。

不得通过 source/solution 字符串比较判断完成。

发起 Check 时，`LearningWorkspace` 捕获：

```ts
const capturedDraft = {
  files: { ...draft.files },
};

const request = {
  requestId,
  checks,
  snapshot: createExecutionSnapshot(
    exercise.workspace,
    capturedDraft,
  ),
};
```

因此一个 Check 同时绑定：

- immutable captured Draft
- immutable ExecutionSnapshot
- requestId

Browser Runtime 在执行 `check:run` 前会显式同步 captured snapshot 中的全部 CSS，而不是依赖 React effect 的 eventual ordering。

### 10.1 Hydration 完成前禁止 Check

```text
disabled =
  isChecking ||
  !isHydrated
```

Storage 成功或失败完成 hydration 后都恢复 Checker 可用。

### 10.2 accepted result 才能完成

只有同时满足：

```text
result generation is current
requestId is current
active check still exists
result.passed === true
```

才会调用：

```text
markCompleted(capturedDraft)
```

保存的是该次 Checker 实际绑定的 Draft，而不是 result 返回时可能已经变化的 UI Draft。

### 10.3 用户修改会使旧 Check 失效

用户编辑任意 Workspace file 或 Reset 后：

```text
active check = null
checkState = idle
```

旧 Checker result 即使晚到，也不能写 completed。

---

## 11. Autosave

当前采用 immediate async persistence：

```text
Workspace edit
↓
React Draft 立即更新
↓
Preview / Runtime 立即更新
↓
saveDraft() fire-and-forget
↓
IndexedDB
```

持久化失败只记录 development warning，不回滚 React Draft，也不阻塞用户输入。

### 11.1 write amplification

当前每次编辑都可能产生一次：

```text
readwrite transaction
→ get
→ put
```

目前保留该实现，因为：

- 语义直接。
- Reset / completion ordering 容易推理。
- 当前 Workspace 数据量很小。
- 不需要额外 timer lifecycle。

未来若引入 coalescing/debounce，必须同时解决：

- pending Draft write 与 `markCompleted` 顺序
- Reset ordering
- stale async write
- navigation/unmount flush
- page lifecycle
- persistence failure fallback

不能只增加一个简单 `setTimeout`。

---

## 12. Reset 产品语义

当前定义：

> Reset 改变 learner Draft，但不清除已经取得的完成状态。

`resetFile(path)` 恢复一个 editable file 的 starter content。

`resetAll()` 恢复全部 editable files 的 starter content。

如果 Exercise 已 completed：

```text
completed exercise
↓
Reset file / Reset All
↓
files = current starter-derived Draft
status = completed
completedAt = original completedAt
```

这是有意设计，不是 persistence bug。

未来如果增加“重新开始”或“清除进度”，应增加明确的 ProgressStore domain operation，而不是改变 `saveDraft` 语义。

---

## 13. Failure Strategy

Persistence 是 progressive enhancement。

以下情况不能让 learner workflow 崩溃：

- IndexedDB unavailable
- open failure
- blocked v2 upgrade
- transaction failure
- quota/storage error
- invalid stored record

处理原则：

```text
Persistence failure
↓
development: console.warn
production: 不展示技术异常
↓
保留 current in-memory Draft
↓
Editor / Preview / Checker / Reset 继续工作
```

不使用 localStorage 作为静默 fallback，避免形成第二套 persistence semantics。

---

## 14. Release / Rollback Boundary

M6A 的 Exercise v2 与 IndexedDB v2 是同一个 forward compatibility unit。

一旦 production client 已打开 DB v2：

- 不得把 `DATABASE_VERSION` 降回 1。
- 不得使用 `deleteDatabase` 作为 rollback。
- 不得恢复 production v1/v2 dual-read 或 dual-write。
- hotfix / rollback 必须继续理解 DB v2 的 `files` record。
- 历史 `code -> files["style.css"]` mapping 只保留在 v1→v2 migration 与 migration tests。

如果 Workspace UI / Browser Runtime 出现问题，应通过 forward-fix 或受限 v2 experience 处理，而不是破坏 storage compatibility boundary。

---

## 15. 当前明确不做的能力

当前 Progress persistence 不承担：

- Course progress
- Module progress
- Lesson progress
- cloud sync
- authentication
- backend database
- cross-tab reactive synchronization
- BroadcastChannel coordination
- IndexedDB content cache
- Studio persistence
- undo history persistence
- Service Worker persistence
- localStorage migration
- generic persistence framework
- generic Workspace/VFS persistence

这些能力只有在真实产品需求出现后再扩展。

---

## 16. 关键不变量

维护 persistence 时必须保持：

1. `[exerciseId, revision]` 是 progress identity。
2. 不同 revision 的 progress 不互相恢复。
3. Progress 只保存 editable Draft files，不保存 locked files。
4. Storage hydration 必须经过 current Workspace reconciliation。
5. 用户本地 mutation 优先于晚到 storage data。
6. Storage failure / blocked upgrade 不阻塞核心学习流程。
7. Hydration 完成前 Checker 不运行。
8. Completion 保存该次 accepted Check 的 captured Draft。
9. Workspace 修改 / Reset 会使旧 Checker result 失效。
10. 普通 `saveDraft` 不得把 `completed` 降级成 `started`。
11. `completedAt` 保留首次完成时间。
12. Reset 不清除 `completed` / `completedAt`。
13. read-modify-write 保持在单个 `readwrite` transaction 内。
14. React Draft 是当前 UI source of truth；IndexedDB 是异步 persistence。
15. blocked legacy upgrade 不使用 production `deleteDatabase`。
16. DB v2 是 forward-only compatibility boundary。

---

## 17. 验证重点

修改 Progress persistence 后至少验证：

### 快速验证

```bash
pnpm lint
pnpm build
git diff --check
```

### Progress / browser regression

重点验证：

- fresh session 从 Workspace starter Draft 开始。
- 编辑后刷新恢复最后的 editable files。
- locked files 不从 Progress storage 恢复。
- Reset file / Reset All 后刷新保持 starter-derived Draft。
- Checker passed 后记录变为 completed。
- 完成后继续编辑，completed 与首次 completedAt 保留。
- 完成后 Reset，Draft 回 starter，但 completed 状态保留。
- Hydration 前 Check 不可触发。
- Hydration 前用户已经编辑时，晚到 storage data 不覆盖用户输入。
- Workspace 修改后旧 Checker result 不得写 completed。
- revision 改变后不恢复旧 revision progress。
- malformed IndexedDB record 不导致页面崩溃。
- v1 valid record 正确迁移到 `files["style.css"]`。
- existing DB v2 不重新执行 legacy mapping。
- blocked legacy connection 进入 session-local in-memory fallback。
- blocked fallback 不调用 production `deleteDatabase`。
- late DB open/data 不覆盖当前 session Draft。
- completion persistence 使用 accepted Check 的 captured Draft。
