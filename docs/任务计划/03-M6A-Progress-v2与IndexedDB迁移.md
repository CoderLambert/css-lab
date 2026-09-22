# Task 03 — Progress v2 与 IndexedDB Migration

## 目标

把 learner persistence 从单一 `code: string` 升级为 editable workspace draft，同时无损迁移已有 v1 CSS progress。

## 开始前读取

```text
src/features/progress/lib/progress-schema.ts
src/features/progress/lib/progress-store.ts
src/features/progress/lib/indexeddb-progress-store.ts
src/features/progress/hooks/use-exercise-progress.ts
src/features/progress/hooks/use-learning-progress.ts
src/features/progress/lib/progress-aggregation.ts
src/lib/workspace/*
e2e/learner-runtime.spec.ts
docs/功能文档/前端indexdb封装方案.md
```

## 1. Progress v2 数据结构

删除 runtime contract 中的：

```ts
code: string
```

替换为：

```ts
files: Record<string, string>
```

started：

```ts
{
  exerciseId,
  revision,
  files,
  status: "started",
  updatedAt
}
```

completed：

```ts
{
  exerciseId,
  revision,
  files,
  status: "completed",
  updatedAt,
  completedAt
}
```

Progress schema 只校验数据结构；它不知道某个 Exercise 当前有哪些 editable paths。

## 2. ProgressStore API

重命名：

```text
saveCode -> saveDraft
```

推荐 input：

```ts
interface SaveExerciseDraftInput extends ExerciseProgressKey {
  files: Record<string, string>;
  updatedAt: number;
}

interface MarkExerciseCompletedInput extends SaveExerciseDraftInput {
  completedAt: number;
}
```

不要在 ProgressStore 引入 WorkspaceDefinition；storage abstraction 只保存 learner-owned state。

## 3. IndexedDB version

必须保持：

```ts
DATABASE_NAME = "css-lab"
PROGRESS_STORE_NAME = "exercise-progress"
```

升级：

```ts
DATABASE_VERSION = 2
```

保持 compound key：

```text
[exerciseId, revision]
```

不要创建新数据库名。

## 4. v1 -> v2 migration

历史 v1 record：

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

必须迁移成：

```ts
{
  exerciseId,
  revision,
  files: {
    "style.css": code
  },
  status,
  updatedAt,
  completedAt?
}
```

`style.css` hardcode 只允许存在于 v1 migration 中，因为它描述历史 single-CSS schema。

不要建立 migration registry。

### 迁移实现要求

在 `openDB(..., { upgrade })` 的 version 1 -> 2 upgrade transaction 内迁移已有 object store records。

注意：

- IndexedDB upgrade transaction 不要包含 network 或无关 async。
- 使用 idb 提供的 transaction/store API。
- 保持 transaction 原子性。
- 不要调用 deleteDatabase。
- 不要创建第二个 store 再长期双写。

### malformed legacy record

单条旧 record 不应让应用 runtime 崩溃。

推荐策略：

- 对能识别的 v1 record 做转换。
- 无法安全识别的 record 不伪造数据。
- v2 read path 使用 safe parse；无法解析时视为无当前 progress。
- 后续 learner 编辑会正常覆盖该 exercise/revision key。

如果实际 idb upgrade cursor API 要求的实现与上述细节不同，以 idb 官方 API 为准，但不得改变用户数据保留目标。

## 5. completed 后继续编辑

必须保留当前正确语义。

当当前 record 已：

```text
status = completed
```

之后 `saveDraft`：

- 保持 `status: completed`
- 保持原 `completedAt`
- 更新 `files`
- 更新 `updatedAt`

不要因为 learner 继续实验就退回 started。

Completion 表示学习成就，不表示“当前 draft 此刻仍然通过”。

## 6. Hook 重构

当前 `useExerciseProgress` 的 CSS-only API：

```text
css
updateCss()
resetCss()
starterCss
```

改成 Workspace Draft API。

建议命名可保留 `useExerciseProgress`，避免为了目录漂亮做无意义 rename；返回至少：

```ts
{
  draft,
  isHydrated,
  updateFile(path, content),
  resetFile(path),
  resetAll(),
  markCompleted(draft)
}
```

或等价接口。

输入应包含：

- exerciseId
- revision
- hydrated ExerciseWorkspace

## 7. hydration reconciliation

从 DB 读出的 `files` 必须和当前 WorkspaceDefinition reconcile：

规则：

```text
known + editable saved path -> restore saved content
missing editable path       -> starter content
unknown saved path          -> ignore
locked saved path           -> ignore
```

原因：Progress schema 无法单独知道 Workspace Definition。

正常兼容边界仍是 revision：作者如果改变 editable file set / starter contract，应 bump revision。

不要把 reconciliation 当成“不需要 bump revision”的替代机制。

## 8. race protection

保留当前 `hasLocalMutationRef` 的语义：

- async IndexedDB hydration 返回时，不得覆盖用户已经在当前 session 产生的本地修改。
- 切换 exercise/revision 时重置 hydration mutation guard。

## 9. persistence failure

保持 progressive enhancement：

- get/save/complete 失败只记录开发环境 warning。
- Editor/Preview/Checker/Reset 继续工作。
- check 已通过时，即使 markCompleted persistence 失败，UI checker result 仍保持成功。
- 不因 storage failure 禁用 learner runtime。

## 10. E2E migration test

除了更新现有 stored progress assertion：

```ts
storedProgress.files["style.css"]
```

还必须新增真正的 v1 migration 测试。

建议 Playwright 流程：

1. 在打开应用前/测试页初始化阶段创建 `css-lab` version 1 DB。
2. 创建 `exercise-progress` store，keyPath 与旧实现一致。
3. 写入至少一条 completed v1 record，含 `code` 和 `completedAt`。
4. 打开当前 learner 页面，触发 app 打开 DB v2。
5. 等待 hydration。
6. 验证 editor 恢复旧 CSS。
7. 读取 DB，验证：
   - version = 2
   - 没有依赖 `code`
   - `files["style.css"]` 等于旧 code
   - status = completed
   - completedAt 保留
8. 验证 progress percentage 仍识别完成状态。

如果测试并行会共享 browser profile，确保每个 Playwright context 自带独立 IndexedDB；不要让 migration test 污染其他测试。

## 11. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

## 12. Acceptance Criteria

- [ ] DB 名仍是 css-lab。
- [ ] DB version = 2。
- [ ] store/key 不变。
- [ ] runtime Progress contract 无 code。
- [ ] saveCode 已替换为 saveDraft。
- [ ] v1 code 精确迁移到 style.css。
- [ ] completedAt/status 保留。
- [ ] completed 后 edit 仍 completed。
- [ ] hydration 不覆盖 session 本地修改。
- [ ] saved unknown/locked path 不进入 draft。
- [ ] storage failure 不破坏 learner runtime。
- [ ] 有自动化 v1 -> v2 migration 覆盖。
