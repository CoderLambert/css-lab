先阅读并严格遵守仓库根目录 AGENTS.md。

任务：收口 CSS Lab M4 —— IndexedDB Progress Persistence。

当前 main 已经存在 M4 初步实现：

- idb@8.0.3
- async ProgressStore
- IndexedDbProgressStore
- typed DBSchema
- ExerciseProgress Zod schema
- useExerciseProgress
- LearningWorkspace 已接入 persistence
- Checker passed 后会 markCompleted
- IndexedDB primary key 为 [exerciseId, revision]

不要重新设计架构，不要换成 Dexie，不要退回 localStorage。

本任务主要是审查、修正并完成当前实现。

==================================================
1. 先审查现状
==================================================

重点检查：

src/features/progress/lib/progress-schema.ts
src/features/progress/lib/progress-store.ts
src/features/progress/lib/indexeddb-progress-store.ts
src/features/progress/hooks/use-exercise-progress.ts
src/features/learning/components/learning-workspace.tsx
src/features/learning/components/workspace-footer.tsx

以及：

package.json
pnpm-lock.yaml
AGENTS.md

确认：

- idb 是 direct dependency
- lockfile 与 package.json 一致
- 不存在 localStorage Progress 实现
- UI / feature component 不直接访问 indexedDB
- 没有自己实现 IDBRequest Promise wrapper
- 没有引入第二套 persistence abstraction

==================================================
2. 保留当前架构
==================================================

保持：

React
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

ProgressStore 必须保持 async。

不要让 React component import idb。

不要让 IndexedDbProgressStore 泄漏到 LearningWorkspace。

不要使用：

Dexie
localForage
raw IDBRequest helper
localStorage fallback
Zustand
Redux

==================================================
3. Progress 数据结构
==================================================

继续使用当前 discriminated union。

started：

{
  exerciseId: string;
  revision: number;
  code: string;
  status: "started";
  updatedAt: number;
}

completed：

{
  exerciseId: string;
  revision: number;
  code: string;
  status: "completed";
  completedAt: number;
  updatedAt: number;
}

Zod schema 继续 strict。

要求：

exerciseId:
non-empty string

revision:
positive integer

updatedAt:
non-negative integer

completedAt:
non-negative integer

不要把 Date object 写进 IndexedDB。

时间继续使用 Date.now()。

==================================================
4. IndexedDB Schema
==================================================

保持：

DATABASE_NAME = "css-lab"
DATABASE_VERSION = 1
STORE = "exercise-progress"

继续使用 idb：

openDB
DBSchema
IDBPDatabase

Primary key：

[exerciseId, revision]

继续使用 compound key。

不要改成随机 ID。

不要增加无实际查询需求的 index。

==================================================
5. Database Lifecycle
==================================================

检查 getDatabase() 实现。

要求：

- 不在 module evaluation 时打开 IndexedDB
- 第一次真正调用 store 时才 openDB
- database connection 可以复用
- open 失败后允许未来再次尝试
- terminated 后清理缓存 connection
- blocking/versionchange 时关闭旧 connection
- upgrade 内只做 schema migration
- 不自己包装 IDBRequest

如果认为有必要，可以增加轻量 blocked development warning，
但不要增加复杂数据库状态 UI。

==================================================
6. Transaction 规则
==================================================

saveCode 和 markCompleted 都属于 read-modify-write。

必须使用一个：

readwrite transaction

完成：

get
→ domain decision
→ put

最后：

await transaction.done

不要：

先 db.get()
再单独 db.put()

因为这会把 read / write 拆成两个 transaction。

不要在 IndexedDB transaction 内：

fetch
setTimeout
网络请求
React state 更新
其他无关 async 工作

==================================================
7. saveCode 语义
==================================================

saveCode：

如果当前记录：

status === "completed"

则用户继续编辑 CSS 后：

必须保留：

status = completed
completedAt = 原值

只更新：

code
updatedAt

如果当前没有 completed：

保存为：

status = started

Exercise 完成后继续实验 CSS，
不能把学习完成记录降级成 started。

==================================================
8. markCompleted 语义
==================================================

markCompleted：

第一次通过：

status = completed
completedAt = 当前时间

同 revision 后续再次通过：

保留第一次 completedAt。

updatedAt 可以更新。

必须保存本次真正被 Checker 验证通过的 CSS。

不要通过：

currentCss === solutionCss

判断完成。

唯一完成来源仍然是：

accepted check:result.passed === true

==================================================
9. 修复 Hydration / Check Race
==================================================

当前 useExerciseProgress：

初始 css = starterCss

随后 effect 从 IndexedDB hydrate。

保留这个 SSR / hydration 安全设计：

禁止在：

render
useState initializer
module scope

读取 IndexedDB。

但是需要增加明确的 hydration 状态。

建议：

type ProgressHydrationState =
  | "hydrating"
  | "ready";

或等价清晰设计。

useExerciseProgress 返回：

{
  css,
  isHydrated,
  updateCss,
  resetCss,
  markCompleted
}

要求：

初始：

isHydrated = false

IndexedDB：

读取成功
或
读取失败

最终都必须：

isHydrated = true

Persistence failure 不能导致永久 loading。

==================================================
10. Hydration Race 行为
==================================================

需要保持现有：

hasLocalMutationRef

或等价机制。

场景：

IndexedDB 读取尚未完成
↓
用户开始编辑
↓
IndexedDB saved progress 晚到

不能覆盖用户的新输入。

如果发生过本地 edit / reset：

忽略晚到的 saved code。

如果用户没有发生本地 mutation：

正常恢复 saved code。

effect cleanup 后不得继续 hydrate 已卸载的 Exercise Session。

==================================================
11. Hydration 期间 Checker
==================================================

当前存在一个 correctness race：

starterCss 已显示
↓
用户立即点击 Check
↓
IndexedDB saved code 恢复
↓
旧检查结果可能对应不同 CSS

修复：

在 progress hydration 完成前，
“检查答案”按钮暂时 disabled。

Storage 读取成功或失败后均恢复可检查。

不要因为 IndexedDB 不可用永久禁用 Checker。

WorkspaceFooter 可以增加类似：

isCheckReady

或等价 prop。

按钮规则：

disabled =
  isChecking ||
  !isHydrated

可以在 hydration 时显示：

准备中…

hydration 完成：

检查答案

不要增加 Spinner dependency。

==================================================
12. Check 时捕获 CSS Snapshot
==================================================

不要让异步 check result 最终依赖 React render closure 中的 css。

发起 check 时捕获：

{
  requestId,
  code
}

建议：

const activeCheckRef = useRef<{
  requestId: string;
  code: string;
} | null>(null);

handleCheck：

const requestId = ...

activeCheckRef.current = {
  requestId,
  code: css,
};

然后进入 checking state。

==================================================
13. Check Result
==================================================

收到 result：

首先验证：

activeCheckRef.current !== null

以及：

activeCheckRef.current.requestId === result.requestId

否则直接忽略。

接受结果后：

const checkedCode =
  activeCheckRef.current.code;

activeCheckRef.current = null;

更新 CheckState。

如果：

result.passed === true

调用：

markCompleted(checkedCode)

修改 useExerciseProgress API：

markCompleted(code: string)

不要让 markCompleted 隐式读取一个可能已经变化的 css closure。

==================================================
14. CSS 修改后的 stale check
==================================================

用户修改 CSS：

activeCheckRef.current = null
updateCss(nextCss)
checkState = idle

Reset：

activeCheckRef.current = null
resetCss()
checkState = idle

这样之前发出的异步 Check Result 即使晚到：

也不能写 completed。

==================================================
15. Autosave
==================================================

编辑继续：

updateCss(nextCss)

行为：

1. React state 立即更新
2. IndexedDB async save

不要 await persistence 后再更新 UI。

不要因为 persistence error 阻塞 CodeMirror。

当前阶段保持 immediate async save。

不要自行加入：

setTimeout debounce
手写 debounce helper
lodash
use-debounce

如果未来需要优化 write frequency，
应该另做明确的 write-coalescing + flush 设计。

==================================================
16. Persistence Failure
==================================================

必须保证：

IndexedDB unavailable
openDB error
transaction error
quota/storage error
invalid stored record

都不能破坏：

CodeMirror
Preview
Checker
Reset

invalid stored value：

Zod safeParse
→ 视为没有有效 progress

不要 throw 到用户页面。

development 可以 console.warn。

production 不显示技术异常。

==================================================
17. Footer
==================================================

IndexedDB autosave 已经真实存在。

保留：

自动保存到本地 · 舒适专注模式

但 hydration 期间 Check 按钮必须正确反映不可检查状态。

不要新增：

保存成功 toast
保存 spinner
数据库状态面板

==================================================
18. Revision
==================================================

revision 继续作为 progress identity 的组成部分：

[exerciseId, revision]

因此：

revision 1 progress

不能自动恢复到：

revision 2

不要在 React 层再人为比较旧 revision。

不要把 revision 从 IndexedDB key 中移除。

==================================================
19. React Best Practices
==================================================

保持现有 keyed Exercise Session：

key={`${exercise.id}:${exercise.revision}`}

遵循：

- React state 是当前编辑 CSS 的 UI source of truth
- IndexedDB 是 persistence，不直接驱动每次 render
- effect 只负责 external storage hydration
- 输入 / Reset / Check 等用户行为放 event handler
- 不使用 effect 响应普通用户事件
- 不用 effect 做 props → state 同步
- 不保存 derived state
- async checker 使用 request snapshot 防 stale closure
- ref 只用于不驱动 UI 的异步协调状态
- 不新增 Context
- 不新增 global store

==================================================
20. 不要扩大范围
==================================================

本任务不要实现：

Course progress
Module progress
Lesson progress
Next Exercise
Previous Exercise
课程导航
跨 tab reactive query
BroadcastChannel
云同步
Auth
数据库后端
IndexedDB content cache
Studio persistence
undo history persistence
Dexie
localStorage migration
Service Worker

只完成 M4 persistence hardening。

==================================================
21. 安装与验证
==================================================

首先运行：

pnpm install --frozen-lockfile

确保当前：

package.json
pnpm-lock.yaml

完全一致。

然后：

pnpm lint
pnpm build

必须全部通过。

如果 lockfile 有问题：

使用 pnpm 正常重新生成 lockfile。

不要手工伪造 lockfile dependency graph。

==================================================
22. 手动验收
==================================================

如果有浏览器环境，验证：

1.
首次进入 center-box：

显示 starter CSS。

2.
输入：

.container {
  display: flex;
}

刷新：

恢复相同 CSS。

3.
Reset：

恢复 starterCss。

刷新：

仍然是 starterCss。

4.
输入完整正确答案并 Check：

全部通过。

IndexedDB：

status = completed
completedAt 存在
revision 正确。

5.
完成后继续修改：

刷新恢复最后代码，
status 仍为 completed，
completedAt 不改变。

6.
完成后 Reset：

刷新后为 starterCss，
status 仍为 completed。

7.
快速修改 CSS 后，
旧 Checker result 不能写 completed。

8.
页面刚打开、IndexedDB 尚未 hydrate 时：

Check 不可触发。

hydrate 完成后：

Check 恢复正常。

9.
如果 hydration 前用户已经开始编辑：

IndexedDB 晚到的数据不能覆盖用户新代码。

10.
模拟 revision +1：

不恢复 revision 1 的 code / completed。

11.
模拟 invalid IndexedDB record：

页面不崩溃，
使用 starterCss。

12.
模拟 IndexedDB 不可用：

Editor / Preview / Checker / Reset 仍可使用。

如果没有浏览器 surface：

明确列出无法执行的 GUI / IndexedDB 项目，
不要声称已完成手动验证。

==================================================
23. 完成后汇报
==================================================

只汇报：

1. 修改文件
2. ProgressStore 最终接口
3. IndexedDB schema / key
4. transaction 实现
5. hydration race 修复
6. check CSS snapshot 实现
7. completed sticky semantics
8. persistence failure 策略
9. pnpm install --frozen-lockfile
10. lint
11. build
12. 无法手动验证的项目

完成后停止。

不要继续实现 Course Progress 或课程导航。

==================================================
24. 后续 persistence 技术债与产品不变量
==================================================

### Autosave transaction write amplification

Problem:

每次编辑都会触发一次 IndexedDB readwrite transaction。连续输入 CSS 时，
可能产生大量 get → put 操作，形成写放大。

Current decision:

当前保持 immediate persistence，因为实现简单，且读写顺序与正确性清晰。
本阶段不直接加入 debounce。

Future direction:

如果未来需要优化写入频率，实现 latest-write coalescing / debounce。

Future implementation must consider:

- 在导航或卸载时适当 flush
- Reset 语义
- markCompleted 的写入顺序
- pending save 与 completed write 的顺序
- 过期异步写入
- persistence failure fallback

### Reset 与 completion 不变量

Reset 只重置可编辑 CSS，不清除学习完成状态。

Reset 不得清除：

- completed status
- completedAt

如果未来产品需要“重新开始”或“清除进度”，应新增明确的
ProgressStore 操作，不应改变 saveCode 的语义。

当前没有实现 debounce、clearProgress 或相关 UI。
