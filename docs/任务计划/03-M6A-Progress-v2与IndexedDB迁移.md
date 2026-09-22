# Task 03 — Progress v2 与 IndexedDB Migration

## 目标

把 learner persistence 从：

```ts
code: string
```

升级为：

```ts
files: Record<WorkspacePath, string>
```

并真实迁移已有 IndexedDB v1 数据。

Progress 只存 learner-owned mutable state。

## 0. MDX Learning Flow v1 state boundary

Progress v2 只迁移 **Exercise learner-owned mutable state**。以下 MDX/Learning Shell state 在 v1 明确不持久化，本任务不得顺手加入 Progress schema：

- `Predict` 选择/解释状态。
- `Concept / Compare` 阅读状态。
- progressive hints 的 `revealedHintCount`。
- Lesson scroll、active Activity、Preview viewport preset。
- generated registry / MDX source state。

completion 仍以 Exercise 为核心；Activity mastery/analytics 属于未来独立产品设计。

## 1. 开始前读取

```text
src/lib/workspace/*
src/features/progress/lib/progress-schema.ts
src/features/progress/lib/progress-store.ts
src/features/progress/lib/indexeddb-progress-store.ts
src/features/progress/hooks/use-exercise-progress.ts
src/features/progress/hooks/use-learning-progress.ts
src/features/progress/lib/progress-aggregation.ts
src/features/learning/components/learning-workspace.tsx
e2e/learner-runtime.spec.ts
docs/功能文档/前端indexdb封装方案.md
```

## 2. Progress v2 schema

runtime contract：

```ts
interface ExerciseProgressBase {
  exerciseId: string;
  revision: number;
  files: Record<string, string>;
  updatedAt: number;
}

interface StartedExerciseProgress extends ExerciseProgressBase {
  status: "started";
}

interface CompletedExerciseProgress extends ExerciseProgressBase {
  status: "completed";
  completedAt: number;
}
```

要求：

- 保持 strict object semantics。
- `files` value 必须 string。
- Progress schema 不依赖 WorkspaceDefinition。
- Progress schema 不验证 editable path set。
- 不保存 locked files。
- 不保存 active file。
- 不保存 dirty state。

## 3. ProgressStore API

删除：

```text
SaveExerciseCodeInput
saveCode()
```

替换：

```ts
interface SaveExerciseDraftInput extends ExerciseProgressKey {
  files: Record<string, string>;
  updatedAt: number;
}

interface MarkExerciseCompletedInput extends SaveExerciseDraftInput {
  completedAt: number;
}

interface ProgressStore {
  ...
  saveDraft(input: SaveExerciseDraftInput): Promise<void>;
  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
```

Storage abstraction 不接受 WorkspaceDefinition。

## 4. IndexedDB version

保持：

```text
DATABASE_NAME       = "css-lab"
PROGRESS_STORE_NAME = "exercise-progress"
keyPath             = ["exerciseId", "revision"]
```

升级：

```text
DATABASE_VERSION = 2
```

禁止：

- 换 DB name。
- 换 store name。
- 建第二个长期 store。
- 双写 v1/v2。
- deleteDatabase fallback。

## 5. 明确 Legacy v1 schema

migration implementation 内建立只服务历史数据的 schema/type，例如：

```ts
const LegacyExerciseProgressV1Schema = z.discriminatedUnion("status", [
  z.strictObject({
    exerciseId: ...,
    revision: ...,
    code: z.string(),
    status: z.literal("started"),
    updatedAt: ...,
  }),
  z.strictObject({
    exerciseId: ...,
    revision: ...,
    code: z.string(),
    status: z.literal("completed"),
    updatedAt: ...,
    completedAt: ...,
  }),
]);
```

不要用 v2 schema 猜 v1。

不要把 Legacy schema export 成产品 domain API。

## 6. v1 -> v2 upgrade

idb `upgrade` callback 必须按 `oldVersion` 处理。

概念：

```ts
upgrade(db, oldVersion, _newVersion, transaction) {
  if (oldVersion < 1) {
    // create current object store
  }

  if (oldVersion === 1) {
    // migrate existing records in the upgrade transaction
  }
}
```

实际实现要结合 store existence，避免重复 create store。

### Versionchange transaction 约束

`idb.openDB(..., { upgrade })` 已把当前 upgrade 的 `versionchange` transaction 传入 callback。migration 必须围绕这个 transaction 设计：

- 不在 upgrade 中再调用 `db.transaction(...)` 创建第二个普通 transaction。
- 不把 migration 数据读取/写入放到 transaction 之外。
- upgrade callback 本身不要依赖网络、timer、React state 或其他无关异步工作。
- 需要 cursor / get / put/update 时，只使用 supplied versionchange transaction 对应 store 发起 IndexedDB request。
- migration helper 可以做纯同步数据转换；真正的持久化请求必须属于 supplied transaction。
- 不依赖“upgrade callback 返回 Promise 后 idb 会等待该 Promise”这种假设；migration correctness 以 IndexedDB versionchange transaction 的 request 生命周期为准。
- transaction abort / open reject 时按本任务 persistence failure策略处理，不自动 delete DB。

由于 v1 stored record 与 v2 `DBSchema` value 类型不同，允许**仅在 migration implementation 内**使用窄的 Legacy store type / `unknown` boundary，然后先经 `LegacyExerciseProgressV1Schema.safeParse` 再转换。不要为了 TypeScript 方便把 v1 字段重新加入 v2 product schema。

### Blocked open / legacy connection

`openDB(name, 2)` 可能因为旧 tab、旧 build、DevTools或其他不响应 `versionchange` 的 connection进入 `blocked`。这是一个 event，不是 Promise rejection；底层 open Promise 可以无限 pending。

因此必须实现显式、可结束的 blocked policy：

- 注册 `blocked(currentVersion, blockedVersion)` callback。
- 一旦当前 open attempt收到 `blocked`，ProgressStore 对该 attempt进入 session-local unavailable状态，使正在等待的 get operation有界结束为“无可用 progress”，不能继续无限 await底层 open Promise。
- learner使用 starter/reconciled in-memory Draft继续；Editor、Preview、Checker、Reset不能因 blocked而禁用。
- 后续 save/complete在本 session可 reject/no-op并走既有 progressive-enhancement warning，但不能排队无限等待。
- 不自动 `deleteDatabase`，不强制 reload，不尝试把 DB降回 version 1。
- 底层 blocked open request可能在旧连接稍后关闭后迟到成功。实现必须使用 attempt/session identity处理：如果当前 session已经 fallback，迟到 connection要立即 close/discard，不得写入共享 `database` cache，也不得把迟到读取结果恢复进当前 Draft。
- 可以在下一次显式 reload/new session重新尝试正常 DB open；M6A不要求当前 session自动热恢复 persistence。

当前 v1代码已有 `blocking()` 主动 close是有利条件，但新代码不能假设所有历史 connection都来自当前 v1 build。

### Record conversion

v1：

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

v2：

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

`"style.css"` hardcode 只允许出现在 v1 migration/test 中。

这是历史 schema 固定映射，不是 Workspace 默认规则。

## 7. malformed legacy record

原则：

> 一条坏记录不能让 learner app 永久不可用。

upgrade cursor 遍历：

- Legacy schema parse 成功 -> 转换并 update。
- parse 失败 -> 不伪造；保留原 record 或跳过转换。
- 不因单条 malformed data 主动 abort whole upgrade。

v2 read path继续用 `ExerciseProgressSchema.safeParse`。

无法解析 -> 视为该 key 无有效 progress。

learner 后续 `saveDraft` 可以覆盖同 key。

如果 upgrade transaction 本身失败：

- openDB reject。
- hook 捕获。
- learner session 使用 in-memory draft 继续。
- 不自动清 DB。
- 不尝试降回 DATABASE_VERSION = 1。

### Forward-only compatibility

DB version 2 一旦被真实浏览器打开并完成 upgrade，就把它视为已经发生的 forward migration。

因此：

- 后续 hotfix/rollback 代码仍必须能打开 version 2。
- 不能通过恢复旧 `DATABASE_VERSION = 1` 实现生产回滚。
- 不能依赖 deleteDatabase 让用户“回到 v1”。
- M6A 发布回滚必须保持 v2 storage compatibility，与总计划的 release policy 一致。

## 8. completed achievement semantics

当前 record 已 completed 时：

`saveDraft()`：

- status 保持 completed。
- completedAt 保持首次值。
- files 更新。
- updatedAt 更新。

`markCompleted()` 再次调用：

- status completed。
- completedAt 保持首次值。
- files 更新为实际通过 checker 的 captured draft。
- updatedAt 更新。

不要加入 `currentlyPassing` / `isValidNow`。

Completion 是 achievement。

## 9. useExerciseProgress -> Workspace Draft

可以保留 hook 名 `useExerciseProgress`。

输入：

```ts
{
  exerciseId,
  revision,
  workspace: ExerciseWorkspace,
}
```

返回语义至少：

```ts
{
  draft,
  isHydrated,
  updateFile(path, content),
  resetFile(path),
  resetAll(),
  markCompleted(draft),
}
```

删除 CSS-only：

```text
css
updateCss
resetCss
starterCss
```

## 10. hydration reconciliation

DB value 与当前 workspace reconcile：

```text
saved known editable path -> saved content
missing editable path     -> starter content
saved unknown path        -> ignore
saved locked path         -> ignore
```

结果只能包含当前 editable paths。

建议纯 helper：

```ts
reconcileDraft(
  workspace: ExerciseWorkspace,
  savedFiles: Readonly<Record<string, string>>,
): ExerciseDraft
```

### Revision rule

reconciliation 只是 defensive behavior。

作者改变：

- editable path set
- starter contract
- exercise semantics

仍应 bump `revision`。

## 11. hydration race

保留 local mutation guard：

1. hook 开始 async IndexedDB read。
2. learner 立即编辑。
3. DB read 返回旧内容。

旧内容绝不能覆盖 session 新编辑。

exerciseId/revision 变化时重置 guard。

Persistence boundary继续是：

```text
exerciseId + revision
```

## 12. persistence failure

保持 progressive enhancement：

- get/save/complete 失败只开发环境 warning。
- Editor/Preview/Checker/Reset 继续。
- checker 已通过时，即使 markCompleted fail，checker UI仍成功。
- aggregate progress可能暂时不持久化，但不阻塞 exercise。
- open upgrade进入 `blocked` 也属于该 progressive-enhancement边界；它必须触发有界 fallback，不能因为 Promise保持 pending而让 `isHydrated` 永远为 false。

日志文案建议改为 neutral：

```text
Lab progress persistence failed
```

## 13. E2E：真实 v1 migration

现有 stored progress assertion 改：

```ts
storedProgress.files["style.css"]
```

并新增 migration scenario。

### 不用 addInitScript 抢 race

IndexedDB seed需要稳定 same-origin document。

推荐：

1. `page.goto("/studio")`。
2. 在 `page.evaluate`：
   - 删除测试 context 内已有 `css-lab`。
   - 创建 version 1 DB。
   - 建 `exercise-progress`。
   - 写 legacy records。
   - close v1 DB。
3. 再 `page.goto(FIRST_EXERCISE_URL)`。
4. app 首次打开 DB，触发 v2 migration。
5. wait hydration。
6. 读取 DB验证。

`/studio` 当前不使用 learner ProgressStore，适合作为同源 seed page。

### Upgrade transaction coverage

除数据语义外，测试还要证明：

- fresh database 从 oldVersion 0 正确创建 v2 store。
- version 1 existing store 使用 supplied versionchange transaction完成转换。
- malformed v1 record 不阻断其他合法 record迁移。
- migration 完成后没有长期 v1/v2 双写。
- 打开已经是 version 2 的 DB 不重复执行 v1 migration。

### Blocked upgrade coverage

新增独立 browser context scenario：

1. 在同一个 Playwright browser context建立两个 page。
2. blocker page先访问 same-origin `/studio`，创建/打开 version 1 DB，并保持一个故意不在 `versionchange` 时 close 的 raw legacy connection；测试完成前不要导航或关闭该 page。
3. learner page导航 learner route，让应用尝试打开 version 2。
4. 验证 blocked fallback在有界时间内完成 hydration：starter draft可编辑、Reset与Check可用，页面不永久等待。
5. 验证没有调用 `deleteDatabase`。
6. 在 fallback后产生 local edit，再关闭 legacy blocker；若底层 open迟到成功，确认它不会覆盖 local draft、不会把迟到 connection注册为当前 session database。

这个测试故意模拟 non-cooperative legacy client；不能只依赖当前 v1 `blocking()` 会主动 close的 happy path。

### 必须覆盖两种 record

至少：

- 一个 started v1。
- 一个 completed v1。

验证：

- DB.version === 2。
- `code` 映射到 `files["style.css"]`。
- started status 保留。
- completed status 保留。
- completedAt 精确保留。
- editor恢复正确 draft。
- aggregate progress识别 completed。
- completed record编辑后仍保持 completed/completedAt。

每个 Playwright browser context拥有独立 storage，不跨 test共享 DB。

## 14. Pure reconciliation test

使用现有 Playwright runner直接 import纯 helper，测试：

```text
saved editable -> restore
missing editable -> starter
unknown saved -> ignore
locked saved -> ignore
```

不引入 Vitest/Jest。

## 15. 验证

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

## 16. Acceptance Criteria

- [ ] DB name/store/key 不变。
- [ ] DB version = 2。
- [ ] Progress runtime contract 无 `code`。
- [ ] saveCode 删除，使用 saveDraft。
- [ ] Legacy v1 schema 明确且仅 migration 使用。
- [ ] upgrade 只使用 supplied versionchange transaction，不在其中开启第二个 db.transaction。
- [ ] migration 不依赖 upgrade callback Promise 生命周期或外部异步工作。
- [ ] `blocked` open有显式 session-local fallback；等待中的 read有界结束，save/complete不无限排队。
- [ ] fallback后的迟到 open/data通过 attempt identity丢弃，不能覆盖 local mutation或重新注册 DB cache。
- [ ] Legacy/v2 typing boundary 只存在于 migration implementation。
- [ ] started v1 自动迁移。
- [ ] completed v1 自动迁移。
- [ ] code -> files["style.css"] 精确。
- [ ] completedAt 保留。
- [ ] completed 后继续 edit 仍 completed。
- [ ] Predict / progressive hints / Lesson UI state 未进入 Progress v2。
- [ ] reconciliation只产生当前 editable paths。
- [ ] hydration不覆盖 local mutation。
- [ ] malformed record不导致 app永久不可用。
- [ ] storage failure不破坏 learner runtime。
- [ ] non-cooperative v1 connection blocked scenario有自动化覆盖，Editor/Preview/Checker/Reset继续工作且不删除 DB。
- [ ] 已升级到 DB v2 后的 rollback/hotfix 仍保持 v2 compatibility，不以 DATABASE_VERSION=1 或 deleteDatabase 回退。
- [ ] migration + reconciliation 自动化覆盖通过。
