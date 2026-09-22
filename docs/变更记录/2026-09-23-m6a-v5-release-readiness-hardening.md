# M6A v5 Release-readiness 加固

- Date: 2026-09-23
- Branch: `docs/m6a-v5-hardening`（目标 `main`）
- Delivery scope: 修订 M6A 00/02/03/05/06 执行计划，闭合最终只读审计发现的 filesystem ancestor symlink、IndexedDB blocked migration 与相关安全测试边界。

## 改动目标

将 M6A v4 最终 release-readiness 审计中确认的两个 Major 和两个 Minor 固化为可实施、可自动验收的工程 contract，使 Task 01~06 后续执行不需要由实现者临时决定安全、迁移或 Studio 错误语义。

本次只修订 M6A 任务计划，不实施 Workspace、ContentReader、Progress v2 或 Browser Runtime，也不修改当前 learner、Studio、content schema、IndexedDB 或 authoring tooling 的运行时代码。

## 实际改动

| 文件或区域 | 模块 | 实际变更 |
| --- | --- | --- |
| `docs/任务计划/00-M6A-执行总计划.md` | M6A 总体 contract | Revision 升级到 v5；把 canonical content-root containment 与 IndexedDB blocked fallback 纳入最终 Definition of Done。 |
| `docs/任务计划/02-M6A-Content-Assets-Reader与Studio-Health.md` | Content filesystem security | 以 canonical `coursesRoot` 为信任锚点，要求验证 Course/Module/Lesson/Exercise/starter 全祖先链；统一 list/direct lookup；写死 ExerciseSourceInspector 失败与 Studio blocking health issue 边界。 |
| `docs/任务计划/03-M6A-Progress-v2与IndexedDB迁移.md` | Progress migration | 定义 `openDB` blocked 时的 session-local in-memory fallback、迟到 connection/data 丢弃规则，以及双页面 non-cooperative legacy connection E2E。 |
| `docs/任务计划/05-M6A-Execution-Snapshot与Browser-Runtime.md` | Browser security | 要求用 request interception 验证 learner HTML remote resource 与 CSS `url()`/`@import` 不能产生 HTTP(S) network egress。 |
| `docs/任务计划/06-M6A-Integration-回归验证与AGENTS更新.md` | Final integration | 将新增 filesystem、blocked migration、Inspector error 和 CSP egress 场景同步到最终回归与 Acceptance Criteria。 |

## 关键实现

### Canonical content-root security boundary

v5 不再只检查 `starter/` 自身及其内部。计划要求先建立 canonical `coursesRoot` trust anchor，再逐段验证到当前 Exercise/starter 的全部后代目录。list flow 与 `get*BySlug` direct lookup 必须共用同一安全解析规则，防止祖先 symlink在最终 `starter/` 上表现为普通目录而绕过检查。

ExerciseSourceInspector 只在完整扫描成功时返回 path set。symlink、root escape 或 non-regular entry 必须产生 narrow source inspection error，由 Studio 转成 blocking health issue；learner-facing Reader 仍独立承担 hard loading security boundary。

### IndexedDB blocked fallback

v5 明确区分 Promise rejection 与 IndexedDB `blocked` event。若 non-cooperative legacy connection让 v2 open长期 pending，当前 learner session必须有界完成 hydration并使用 in-memory Draft。后续迟到成功的 open/data通过 attempt identity关闭或丢弃，不能恢复旧数据、覆盖 local mutation或污染共享 database cache。

自动化场景使用同一 Playwright context中的 blocker page与 learner page，确保 raw v1 connection在 learner触发 v2 open时仍真实存活。

### Browser network egress verification

Browser Runtime既有 CSP contract继续保持，新增 request-level测试要求，避免只通过 DOM结果间接推断 remote resource、CSS `url()` 或 `@import` 是否被阻断。

## 行为与兼容性

No runtime behavior change。

本次文档修订不改变当前 Exercise v1、Progress DB v1、learner Preview、Studio或 CSS Lesson Authoring Skill。它只收紧未来 M6A 实现及最终 release gate。M6A 仍是 Task 01~06 完成后一次性进入 main 的 release unit，forward-only rollback边界不变。

## 验证

| 命令或检查 | 结果 |
| --- | --- |
| `pnpm test:authoring-skill` | Passed；6 tests。 |
| `pnpm content:check` | Passed；1 lesson。 |
| `pnpm test:content` | Passed；22 tests。 |
| `pnpm lint` | Passed。 |
| `pnpm build` | Passed。 |
| `PORT=3108 PLAYWRIGHT_BASE_URL=http://localhost:3108 CI=1 pnpm test:e2e` | Passed；Chromium 5 tests。 |
| `pnpm content:generate` + generated registry diff check | Passed；registry already up to date。 |
| `git diff --check` | Passed。 |

## 风险、限制与后续

- 本次没有实现 M6A；新增测试场景将在对应 Task 02、03、05 实施时落地。
- build仍输出既有 Next MDX loader cache dependency warning，但编译、TypeScript和静态生成全部成功。
- 用户已有未跟踪文件 `docs/重构记录/ M6A.md` 与本次交付无关，未读取、修改或纳入提交。
- 本记录不包含最终 commit SHA；SHA由提交后的交付报告记录。
