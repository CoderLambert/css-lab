# CSS Lab 前端 IndexedDB Progress Persistence

## 1. 目标

CSS Lab 使用浏览器 IndexedDB 持久化 learner 的 exercise 进度，使用户刷新页面后可以恢复当前 CSS，并在通过 Checker 后保留完成状态。

这套持久化是核心学习流程的渐进增强：

```text
编辑 CSS
→ React 立即更新
→ Preview 立即更新
→ IndexedDB 异步持久化
```

IndexedDB 失败不能阻塞：

- CodeMirror 编辑
- Preview
- Checker
- Reset

当前只持久化 exercise progress，不承担 Course / Module / Lesson progress，也不提供云同步、多 Tab 实时同步或服务端存储。

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
    └── indexeddb-progress-store.ts

src/features/learning/components/
├── learning-workspace.tsx
└── workspace-footer.tsx
```

边界约束：

- React feature/component 不直接调用原生 `indexedDB`。
- UI 不依赖 `IndexedDbProgressStore` 具体实现。
- `ProgressStore` 保持异步接口。
- IndexedDB 访问集中在 progress adapter。
- 使用 `idb` 的 Promise API 和 typed `DBSchema`。
- 不维护自定义 `IDBRequest → Promise` wrapper。
- React state 是当前编辑 CSS 的 UI source of truth；IndexedDB 是 persistence layer，不直接驱动每次 render。

---

## 3. Progress 数据模型

Progress 使用 strict Zod discriminated union。

### 3.1 Started

```ts
{
  exerciseId: string;
  revision: number;
  code: string;
  status: "started";
  updatedAt: number;
}
```

### 3.2 Completed

```ts
{
  exerciseId: string;
  revision: number;
  code: string;
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
- 读取到非法记录时通过 Zod `safeParse` 视为无有效 progress，不让非法数据进入 UI。

---

## 4. IndexedDB Schema

当前数据库定义：

```text
Database: css-lab
Version: 1
Object Store: exercise-progress
Primary Key: [exerciseId, revision]
```

复合主键体现了一个重要兼容边界：

```text
exercise A / revision 1
≠
exercise A / revision 2
```

内容 revision 更新后，旧 revision 的 code / completed 状态不会自动恢复到新版本。

当前没有实际查询需求，因此不增加额外 index。

---

## 5. Database 生命周期

数据库连接按需创建，不在 module evaluation 阶段打开 IndexedDB。

目标行为：

```text
第一次 ProgressStore 操作
→ getDatabase()
→ openDB()
→ 缓存 connection / opening promise
```

当前生命周期规则：

- 成功打开后复用数据库 connection。
- open 失败后清理 opening promise，允许未来重试。
- connection `terminated` 后清理缓存。
- upgrade blocking 时关闭旧 connection，并清理缓存。
- schema migration 只放在 `upgrade` callback。
- 不把数据库 connection 状态暴露给产品 UI。

---

## 6. ProgressStore Contract

核心接口语义：

```ts
interface ProgressStore {
  getExercise(
    exerciseId: string,
    revision: number,
  ): Promise<ExerciseProgress | null>;

  saveCode(input: SaveExerciseCodeInput): Promise<void>;

  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
```

### 6.1 getExercise

按：

```text
[exerciseId, revision]
```

读取记录。

读取后必须经过 Zod validation。

非法记录返回 `null`，不向上抛出无效 domain data。

### 6.2 saveCode

普通编辑和 Reset 使用 `saveCode`。

如果当前记录尚未完成：

```text
status = started
code = latest code
updatedAt = latest time
```

如果当前记录已经完成：

```text
status = completed        保留
completedAt               保留首次完成时间
code                      更新
updatedAt                 更新
```

因此 learner 完成 exercise 后继续实验 CSS，不会把完成状态降级回 `started`。

### 6.3 markCompleted

Checker 通过时使用 `markCompleted`。

第一次完成：

```text
status = completed
completedAt = current time
updatedAt = current time
code = checked code
```

同 revision 后续再次通过：

```text
completedAt = original completedAt
updatedAt   = latest time
code        = latest checked code
```

`completedAt` 表示首次完成时间。

---

## 7. Transaction 模型

`saveCode` 和 `markCompleted` 都属于 read-modify-write，必须在单个 `readwrite` transaction 中完成：

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

不要拆成：

```text
db.get()
↓
transaction 结束
↓
db.put()
```

否则 read 和 write 之间失去原子性的业务判断窗口。

Transaction 内只做与当前 IndexedDB 操作直接相关的异步工作，不加入：

- network request
- timer
- React state update
- 其它无关 async workflow

### 7.1 当前 write ordering 结论

当前应用中，`saveCode` 和 `markCompleted` 都作用于同一个 object store，并使用 overlapping `readwrite` transaction。浏览器会串行执行这类事务；后创建的 transaction 在获得 store 访问权后会看到先前成功提交的数据。

结合当前 adapter 的 read-modify-write：

- `saveCode` 会重新读取当前记录。
- 如果已经 completed，会保留 `completed` 与 `completedAt`。
- `markCompleted` 会重新读取当前记录并保留首次 `completedAt`。

因此当前实现没有发现 completed 状态被旧普通保存降级覆盖的问题。

这个结论只针对**当前单页应用、当前 transaction 创建方式和同一 object store 的实现**。它不等于通用的“IndexedDB 自动保证业务 latest-write-wins”。

如果未来加入 debounce、异步写队列、跨 Tab 协调、后台 flush 或网络同步，需要重新设计业务 operation ordering。

---

## 8. React Hydration 模型

`useExerciseProgress` 初始使用：

```text
css = starterCss
```

IndexedDB hydration 在 Effect 中异步执行。

不要在：

- render
- `useState` initializer
- module scope

访问 IndexedDB。

当前 hook 暴露：

```ts
{
  css,
  isHydrated,
  updateCss,
  resetCss,
  markCompleted,
}
```

### 8.1 Hydration identity

当前 exercise identity：

```text
exerciseId:revision
```

`hydratedExerciseKey` 记录完成 hydration 的 identity，render 时与当前 exercise key 比较得到 `isHydrated`。

这样即使 exercise identity 改变，也不会错误复用上一个 exercise 的 ready 状态。

### 8.2 用户输入优先于晚到的 storage

Hydration 可能和用户输入并发：

```text
显示 starterCss
↓
IndexedDB 正在读取
↓
用户开始编辑 / Reset
↓
saved progress 晚到
```

一旦发生本地 mutation，晚到的 saved code 不得覆盖用户当前输入。

当前使用 `hasLocalMutationRef` 表达这个非 UI 协调状态。

### 8.3 Unmount / exercise change

Effect cleanup 使用 cancelled guard。

旧 exercise 的 IndexedDB Promise 即使随后 resolve，也不能再 hydrate 已卸载或已切换的 session。

### 8.4 Storage failure

读取失败后仍要结束 hydration：

```text
IndexedDB read failed
↓
development warning
↓
当前 CSS 保持可用
↓
isHydrated = true
```

否则 Checker 会永久停留在“准备中”。

---

## 9. Checker 与 Persistence 一致性

Checker 是唯一的 completion source。

不要通过：

```text
currentCss === solutionCss
```

判断完成。

完成条件是：

```text
accepted check:result
+
result.passed === true
```

### 9.1 Hydration 完成前禁止 Check

页面刚打开时，starter CSS 可能只是 hydration 前的暂态值。

因此：

```text
disabled =
  isChecking ||
  !isHydrated
```

Storage 成功或失败完成 hydration 后都恢复 Checker 可用。

### 9.2 Check 必须绑定 code snapshot

发起 Check 时保存：

```ts
{
  requestId,
  code,
}
```

异步 result 返回后，只有 requestId 仍然属于当前 active check 才接受结果。

通过时：

```text
markCompleted(checkedCode)
```

保存的是**真正参与该次 Checker 的代码快照**，而不是 result 返回瞬间 React 中可能已经变化的 CSS。

### 9.3 CSS 修改会使旧 Check 失效

用户编辑或 Reset 后：

```text
active check = null
checkState = idle
```

之前已经发出的旧 Checker result 即使晚到，也不能再写 completed。

---

## 10. Autosave

当前采用 immediate async persistence：

```text
CodeMirror change
↓
React state 立即更新
↓
Preview 立即更新
↓
saveCode() fire-and-forget
↓
IndexedDB
```

持久化失败只记录开发环境 warning，不回滚 React state，也不阻塞用户输入。

### 10.1 已知技术债：write amplification

当前每次编辑都可能产生一次：

```text
readwrite transaction
→ get
→ put
```

连续输入会产生较多 IndexedDB transaction。

目前保持该实现，因为：

- 逻辑简单。
- 数据语义明确。
- 没有 timer lifecycle。
- Reset / Checker completion ordering 容易推理。
- 当前 exercise CSS 数据量较小。

未来如果确有性能需求，可以设计 latest-write coalescing / debounce，但必须同时解决：

- pending write 与 `markCompleted` 的顺序
- Reset 的顺序语义
- stale async write
- navigation / unmount 时是否 flush
- page lifecycle
- persistence failure fallback

不要只增加一个简单 `setTimeout` debounce。

---

## 11. Reset 产品语义

当前定义：

> Reset 只重置当前可编辑 CSS，不清除已经取得的学习完成状态。

因此：

```text
completed exercise
↓
Reset
↓
code = starterCss
status = completed
completedAt = original completedAt
```

这是有意设计，不是 persistence bug。

如果未来产品增加“重新开始”或“清除进度”，应该增加明确的 `ProgressStore` domain operation，而不是改变 `saveCode` 语义。

---

## 12. Failure Strategy

Persistence 是 progressive enhancement。

以下情况都不能让 learner workflow 崩溃：

- IndexedDB unavailable
- `openDB` failure
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
保留当前 React CSS
↓
Editor / Preview / Checker / Reset 继续工作
```

不使用 localStorage 作为静默 fallback，以避免形成第二套 persistence semantics。

---

## 13. 当前明确不做的能力

当前 progress persistence 不承担：

- Course progress
- Module progress
- Lesson progress
- cloud sync
- authentication
- backend database
- cross-tab reactive synchronization
- BroadcastChannel
- IndexedDB content cache
- Studio persistence
- undo history persistence
- Service Worker persistence
- localStorage migration
- generic persistence framework

这些能力只有在真实产品需求出现后再扩展。

---

## 14. 关键不变量

维护 persistence 时必须保持：

1. `[exerciseId, revision]` 是 progress identity。
2. 不同 revision 的 progress 不互相恢复。
3. 用户本地 mutation 优先于晚到的 hydration 数据。
4. Storage failure 不阻塞核心学习流程。
5. Hydration 完成前 Checker 不运行。
6. Checker completion 保存被实际检查通过的 code snapshot。
7. CSS 修改 / Reset 会使旧 Checker result 失效。
8. 普通 `saveCode` 不得把 `completed` 降级成 `started`。
9. `completedAt` 保留首次完成时间。
10. Reset 不清除 `completed` / `completedAt`。
11. read-modify-write 保持在单个 `readwrite` transaction 内。
12. React state 是当前 UI source of truth；IndexedDB 是异步 persistence。

---

## 15. 变更后的验证重点

修改 progress persistence 后至少验证：

### 静态 / 构建

```bash
pnpm lint
pnpm build
```

### 浏览器行为

有 browser surface 时重点检查：

- 首次进入使用 starter CSS。
- 编辑后刷新恢复最后 CSS。
- Reset 后刷新仍是 starter CSS。
- Checker passed 后记录变为 completed。
- 完成后继续编辑，completed 状态与首次 completedAt 保留。
- 完成后 Reset，code 回 starter CSS，但 completed 状态保留。
- Hydration 前 Check 不可触发。
- Hydration 前用户已经编辑时，晚到 saved code 不覆盖用户输入。
- CSS 修改后，旧 Checker result 不得写 completed。
- revision 改变后不恢复旧 revision progress。
- invalid IndexedDB record 不导致页面崩溃。
- IndexedDB 不可用时 Editor / Preview / Checker / Reset 仍可使用。
