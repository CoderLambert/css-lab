# M5 Learner Navigation 与 Progress Aggregation

- Date: 2026-09-22
- Branch: `main`
- Delivery scope: 完成 URL 驱动的学习导航、published 内容序列与课程进度聚合，并修复 iframe reload 后 pending check 丢失边界。

## 改动目标

将 `/learn` 从写死的单题入口扩展为可追踪、可刷新、可前后切换的 canonical exercise URL，同时基于现有 IndexedDB `ProgressStore` 聚合课程、模块和课时完成进度。

本次保持 M0–M4 已确定的架构，不修改 IndexedDB schema，不引入全局状态、API route、Dexie、Auth、Cloud Sync、Studio 或 MDX。

## 实际改动

| 文件或区域 | 模块 | 实际变更 |
| --- | --- | --- |
| `src/app/learn/page.tsx` | Learner 入口 | 服务端查找第一个完整 published chain 的 exercise，并重定向到 canonical URL。 |
| `src/app/learn/[courseSlug]/[moduleSlug]/[lessonSlug]/[exerciseSlug]/page.tsx` | 动态路由 | 按 Next.js 16 Promise params 读取路径，校验 slug、完整 published parent chain 和当前题在导航序列中的成员关系。 |
| `src/features/learning/lib/learner-content.ts` | Server content assembly | 使用 `ContentReader` 构造按 module、lesson、exercise `order` 排序的 published exercise sequence。 |
| `src/features/learning/lib/learner-navigation.ts` | Navigation domain | 集中生成 canonical href、当前位置、总题数、Previous/Next 和最小 progress metadata。 |
| `src/features/learning/components/learning-workspace.tsx` | Learner runtime | 接入课程/模块/导航数据、聚合进度 hydration，以及完成持久化后的显式 refresh token。 |
| `src/features/learning/components/workspace-header.tsx` | Header | 使用真实课程、模块、当前位置、总题数和 course completion percent 替换硬编码数据。 |
| `src/features/learning/components/workspace-footer.tsx` | Footer navigation | 通过 Next.js `Link` 与 Base UI Button `render` composition 增加真实可禁用的上一题/下一题。 |
| `src/features/progress/lib/progress-store.ts` | Progress contract | 新增面向已知 compound keys 的批量读取 primitive：`getExercises(keys)`。 |
| `src/features/progress/lib/indexeddb-progress-store.ts` | IndexedDB adapter | 在单个 readonly transaction 中批量 get，逐条 Zod 校验并忽略 invalid record，最后等待 `transaction.done`。 |
| `src/features/progress/lib/progress-aggregation.ts` | Progress domain | 按当前 exercise revision 派生 Course、Module、Lesson 的 completed/total/percent。 |
| `src/features/progress/hooks/use-learning-progress.ts` | Progress hydration | Client 端批量 hydration；storage failure 降级为空进度；用 request key 和 cleanup 防止 stale response 覆盖。 |
| `src/features/progress/hooks/use-exercise-progress.ts` | Current exercise persistence | `markCompleted(code)` 返回 Promise，使 durable write 成功后可刷新聚合进度，同时保留失败 warning。 |
| `src/features/exercise/components/preview-frame.tsx` | Preview runtime | `srcDoc` 变化时同时清空 ready 与 sent request refs，使新 iframe 可重发 pending check。 |

## 关键实现

### Published navigation sequence

Server 端只将 `Course → Module → Lesson → Exercise` 全部为 `published` 且 parent stable ID 一致的节点加入序列。顺序由现有 reader 返回的 `order` 顺序保持，不依赖目录名。动态页面再次验证当前 exercise 确实属于该序列，draft 或非法路径返回 `notFound()`。

`createLearnExerciseHref()` 是 canonical URL 的唯一构造点，Previous/Next 不循环，也不要求当前题先完成。

### Progress batch read 与聚合

聚合 metadata 仅传递 `exerciseId`、`revision`、`moduleId`、`lessonId`。`IndexedDbProgressStore.getExercises()` 在一个 readonly transaction 内发出全部 compound-key 查询，不增加 index，也不暴露通用 repository API。

只有同时匹配当前 `exerciseId + revision` 且状态为 `completed` 的记录计入完成数。旧 revision 不计入。Course、当前 Module 和当前 Lesson 的进度均为派生数据，不维护重复 React state。

### Completion refresh

Checker 接受 passed result 后立即更新检查 UI，并异步执行 `markCompleted(checkedCode)`。durable write 成功后递增本地 refresh token，触发一次 batch reread；写入失败只影响 persistence，不会把 checker 结果改回 failed。

### Preview reload

同一个 iframe 生命周期仍通过 `sentCheckRequestIdRef` 避免重复发送。`srcDoc` reload 时清空该 ref，使尚未完成的 active request 能在新 iframe ready 后重新发送。

## 行为与兼容性

- `/learn` 现在重定向到 `/learn/<course>/<module>/<lesson>/<exercise>`。
- Header 的题目位置与完成进度分离：当前位置不等于已完成数量。
- 当前题历史 completed 只影响 Header；Checker 初始状态仍为 idle。
- IndexedDB 不可用时 Editor、Preview、Checker 和导航仍可使用，聚合进度显示为空或 0。
- IndexedDB 数据库名、版本、object store、compound key 和现有 completed sticky semantics 均未改变。
- 未新增依赖、全局状态或数据库 migration。

## 验证

| 命令或检查 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed；lockfile 无变化。 |
| `pnpm lint` | Passed。 |
| `pnpm build` | Passed；动态 learner route 完成 TypeScript 和生产构建。 |
| `git diff --check` | Passed。 |
| HTTP `/learn` | Passed；返回 307 并指向 canonical exercise URL。 |
| HTTP canonical exercise URL | Passed；返回 200。 |
| HTTP 非法 slug | Passed；返回 404。 |

## 风险、限制与后续

- 当前环境没有可用 browser surface，未执行真实 CodeMirror、IndexedDB、iframe reload 和 Link 点击的 GUI 验收。
- 当前内容只有一个 published exercise，因此 Previous/Next 的跨题跳转未能用真实内容手动验证；首尾 disabled 状态由 sequence 边界派生。
- 仓库没有 progress persistence 测试 runner，本次未为 M5 单独引入测试框架。
- 提交时本地 `main` 比 `origin/main` 落后 2 个提交；本次仅创建本地 commit，不自动 pull、rebase 或 push。
- 未跟踪的 `docs/功能文档/编辑器重构方案.md` 与本次 M5 无关，明确排除在提交之外。
