# M6A v6 Final Contract Closure

- Date: 2026-09-23
- Branch: `docs/m6a-v6-final-hardening`
- Baseline: `7252b93505427582c6483edb910a5051bdd30fe3`
- Delivery scope: 修订 M6A 执行计划与仍属当前事实的 active docs；不实施 Workspace、ContentReader、Progress 或 Browser Runtime。

## Change objective

在 v5 合入后进行的最终只读复核确认：Task 01~06 的主迁移顺序已经闭合，但仍有四个会迫使实现者现场决定核心语义的 Major，以及两个文档/验证层面的 Minor。v6 将这些问题改写为可实施、可自动验收的明确 contract。

## Actual changes

| File or area | Module | What changed |
| --- | --- | --- |
| `docs/任务计划/00-M6A-执行总计划.md` | 总体 contract | Revision升级为v6；把最终文件安全、checker scope与负向测试纳入Definition of Done。 |
| `docs/任务计划/01-M6A-Workspace-Domain与Exercise-Schema-v2.md` | Workspace domain | 写死WorkspacePath、Browser entry与Draft/Snapshot invariant正负测试。 |
| `docs/任务计划/02-M6A-Content-Assets-Reader与Studio-Health.md` | Content/Studio | 闭合Reader hard-load与Inspector health语义；保护metadata/MDX最终文件；补Studio负向测试。 |
| `docs/任务计划/05-M6A-Execution-Snapshot与Browser-Runtime.md` | Browser Runtime | 定义DOM checker只查询learner fragment后代，并补runtime shell隔离测试。 |
| `docs/任务计划/06-M6A-Integration-回归验证与AGENTS更新.md` | Final integration | 汇总新增安全门禁、active docs同步清单与HTML/CSS双tab人工集成验证。 |
| `README.md`、MDX产品方案、authoring reference | Current contracts | 把`hidden`改写为visibility语义，明确status只有`draft | published`。 |
| `scripts/content/lesson-reference.test.mjs` | Content tests | 将误导性的“hidden lesson”测试名称改为真实的“draft lesson”。 |

## Key implementation

### Reader hard error 与 Studio health issue

Task 02 现在按真实调用顺序区分：

- metadata、共同祖先、declared starter 等 Reader 必需输入失败时，FileContentReader fail closed，Studio显示全局 `Content load failed`。
- Reader已成功 hydrate后，`solution/` 或 undeclared starter entry等 source-only inspection失败时，Studio生成 per-Exercise blocking health issue。

不再要求同一次 Studio调用既被 Reader中止，又继续产生 Inspector health row。

### Content最终文件安全

canonical `coursesRoot` 边界不再只覆盖目录祖先和 declared starter。计划明确要求 FileContentReader与Lesson/Exercise inspectors实际读取的 metadata、`lesson.mdx` 和 source assets最终文件必须 contained、non-symlink、regular，并增加 final-file symlink/non-regular/root-escape测试。

### Browser checker selector scope

Task 05 现在规定 `style / exists / count` 只查询 learner fragment后代。runtime-owned document shell、learner-root wrapper、CSS slots与bridge nodes不参与匹配或计数。新增 wrapper off-by-one、CSS slot false positive、invalid selector与target-not-found测试。

### 负向自动化

Task 01 明确增加 WorkspacePath、collision、language/extension、Browser entry与Draft/Snapshot invariant的正负测试。

Task 02/06 明确增加 Studio规则负向测试，包括 zero editable分级、Browser JS/TS、multiple HTML、undeclared starter、solution path equality与Inspector failure mapping。当前三个健康Exercise的happy-path E2E不再作为这些规则的唯一证据。

### HTML UI集成与active docs

Task 06 增加一次不入库的HTML/CSS双tab人工集成验证，并继续要求首个真实HTML-editable Exercise补正式learner-route E2E。

README、MDX产品方案和authoring reference中的 `hidden` 已改写为visibility语义，并明确真实status只有 `draft | published`。Task 06 同时列出M6A完成后必须同步的active docs，历史记录仍保留历史事实。

## Behavior and compatibility

本次修订只收紧未来实现合同，不改变当前运行时行为。完成修订与现有质量门禁后，M6A计划的目标状态为：

```text
Critical = 0
Major = 0
```

正式开发仍必须从最新main重新审计，并在同一feature branch按Task 01~06串行推进；只有Task 06全部通过后才作为一个release unit进入main。

## Validation

| Command or check | Result |
| --- | --- |
| `pnpm test:authoring-skill` | Passed；6 tests。 |
| `pnpm content:check` | Passed；1 lesson。 |
| `pnpm test:content` | Passed；22 tests。 |
| `pnpm lint` | Passed。 |
| `pnpm build` | Passed。 |
| `PORT=3112 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3112 CI=1 pnpm test:e2e` | Passed；Chromium 5 tests。 |
| `pnpm test:e2e` | Passed；默认`localhost:3000`释放后Chromium 5 tests。首次尝试命中占用该端口的Gitea，不属于仓库失败。 |
| `pnpm content:generate` + generated registry diff | Passed；registry already up to date。 |
| `git diff --check` | Passed。 |

## Risks, limitations, and follow-up

- 本次只修订执行合同，没有实现M6A运行时代码；新增负向测试与安全边界将在对应Task落地。
- HTML/CSS双tab完整learner-route E2E继续推迟到首个真实HTML-editable Exercise；Task 06新增不入库人工集成验证以降低此前的覆盖空档。
- 用户原工作区的未跟踪`docs/重构记录/`不属于本次交付，未修改或提交。
