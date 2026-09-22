# Task 06 — Integration、Regression、Security Review 与 AGENTS 更新

## 目标

完成 M6A 最终收口：

- 清理过渡代码。
- 验证架构边界。
- 验证当前 CSS产品行为。
- 验证 Workspace/Browser security。
- 更新 AGENTS/README。
- 不开始 M6B。

## 1. 开始前重新审计

不要假设 Task 01-05 完美执行。

全局搜索至少：

```text
fixtureHtml
fixture.html
baseCss
starterCss
starter.css
solution.css
SaveExerciseCodeInput
saveCode
updateCss
resetCss
css-lab-parent
css-lab-preview
bodyMdxSource
lesson-content-registry.tsx
LessonMarkdown
react-markdown
href="/learn
CSS exercise preview
CSS Lab progress persistence failed
draft.files["style.css"]
do not support HTML editing
do not support learner JavaScript
solutionFiles
runtime/typescript
RuntimeRegistry
LanguageRegistry
CheckerRegistry
current v1 asset layout
fixture.html.template
starter.css.template
solution.css.template
.agents/skills/css-lesson-authoring
```

区分：

- 合法历史 docs。
- Legacy IndexedDB migration。
- CSS-specific editor代码。
- 不应继续存在的平台 coupling。

## 2. LearningWorkspace final responsibility

最终：

```text
Exercise
→ useExerciseProgress(workspace)
→ ExerciseDraft
→ createExecutionSnapshot()
→ BrowserRuntime
```

LearningWorkspace负责：

- hydrate draft。
- update/reset draft。
- derive snapshot。
- file mutation时 invalidate check。
- check lifecycle。
- capture checked draft。
- successful check持久化 captured draft。
- aggregate progress refresh。

不负责：

- 直接打开 IndexedDB。
- 拼 srcDoc。
- runtime message parser。
- filesystem读取。
- solution读取。
- Workspace path validation。

## 3. MDX Learning Flow v1 regression

M6A 是底层 Workspace/Runtime 重构，不得让已合入 main 的教学产品能力退化。

最终必须验证：

- `lesson.json` 仍只承载 metadata，Lesson runtime 无 MDX source/body/path。
- `lesson.mdx` 仍通过 generated static registry 渲染。
- MDX contract 仍拒绝 import/export、arbitrary expression、unknown JSX、H1。
- `Concept / Predict / Compare / Exercise` 四个 Activity 行为可用。
- learner-visible Lesson 的 Exercise Activity references 仍满足 canonical `exercise.order` 完整/唯一/同序约束。
- progressive hints 初始隐藏、逐层 reveal、按钮 N/M 状态无回归。
- Preview bounded canvas 与 `Auto / 390 / 768 / 1280` presets 无回归。
- checker mismatch 与 checker/runtime fault 仍有 structured diagnostics；语义等价 accepted value 场景仍通过。
- `target-not-found` 不被 Runtime一律判成 fault：editable HTML 场景可作为 learner-actionable DOM mismatch；HTML locked 场景仍可提示可能的 content/check configuration issue。
- generated registry 不因 Exercise Workspace migration 产生无解释 diff。

对应质量门禁：

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

### CSS Lesson Authoring Skill regression

最终必须确认 repo-level authoring Skill 已与 Exercise v2 同步：

- `scaffold.mjs exercise` 生成 `schemaVersion: 2`。
- scaffold 输出 `starter/index.html`、`starter/base.css`、`starter/style.css`、`solution/style.css`。
- active `exercise.json.template` 包含 Workspace + Browser runtime metadata。
- old root `fixture.html/base.css/starter.css/solution.css` 不再作为 current scaffold output。
- Skill active references 不再描述“current v1 asset layout”或禁止 Exercise v2。
- Course/Module/Lesson v1 与 Exercise v2 的版本边界描述清楚。
- status vocabulary 与真实 schema 一致，仅 `draft | published`。
- source-pack inspection / Lesson scaffolding 原有能力无回归。

```bash
pnpm test:authoring-skill
```

Task 06 全局搜索时要把 `.agents/skills/css-lesson-authoring/**` 纳入 current-contract audit；历史变更记录除外。

## 4. Current 3 CSS Exercise regression

必须验证：

- learner sequence不变。
- previous/next不变。
- starter CSS正确。
- CSS edit正确。
- preview computed style正确。
- CSS edit不 reload iframe。
- style/exists/count能力可执行。
- completion正确。
- aggregate progress正确。
- reload restore正确。
- reset正确。
- formatter正确。
- format一次 undo。
- color swatch editor-local。
- Studio learner links不变。

不要把单 CSS Exercise变成复杂 file explorer。

## 5. HTML capability verification

production content当前可以没有 editable HTML。

### Automated domain

Workspace tests用：

```text
index.html editable
style.css editable
base.css locked
```

确认：

- draft只有 editable HTML/CSS。
- locked不进入 draft。
- update/reset正确。
- snapshot含完整 locked+editable。
- declaration order正确。

### Automated isolated Browser

覆盖：

- HTML fragment mount。
- HTML不同导致 document generation / generationId变化。
- CSS-only edit不改变 generationId。
- stale generation ready/result被拒绝。
- wrong-generation host message被 iframe拒绝。
- CSS最后一次编辑后立即 Check，checker读取 captured snapshot 的最新 CSS。
- 第二个 HTML / JS / TS topology fail closed。
- learner DOM clobbering不能覆盖 runtime-owned root/CSS slot。
- script/event/javascript URL blocked。
- learner HTML remote resource与 CSS `url()` / `@import` 的 HTTP(S) network egress被 CSP阻断，并由 request-level test证明。
- CSS slots/protocol/checker工作。
- target-not-found presentation 在 editable HTML 与 locked HTML 两种 Workspace metadata 下语义正确；checker-error 始终是 runtime/checker fault。

### Code-level WorkspaceEditor review

确认：

- HtmlEditor真实接入 WorkspaceEditor switch。
- `editable: true + language: html` 必然进入 HtmlEditor。
- multi-file tabs使用 Draft Record，不存在 CSS-only state。

### 不做 fake learner content

不新增 test-only published exercise。

首个真实 HTML-editable Exercise进入课程时，对应 content PR必须补 learner-route E2E：

- HTML tab edit。
- CSS tab edit。
- reload恢复两文件。
- reset all。
- check。

AGENTS应记录这一测试要求。

## 6. Solution leakage review

结构性保证：

- Exercise type无 solution。
- ContentReader不读取 solution。
- learner route不 import ExerciseSourceInspector。
- client graph不 import server-only inspector。
- solution只在 Studio/server authoring inspection出现。

不要靠 `delete exercise.solution`。

可额外用 solution-only marker做 E2E字符串回归，但不能作为主要安全边界。

## 7. Progress final regression

确认：

```text
DB      = css-lab
version = 2
store   = exercise-progress
key     = [exerciseId, revision]
```

测试：

- fresh DB oldVersion 0 -> v2 store。
- v1 started迁移。
- v1 completed迁移。
- supplied versionchange transaction完成转换，不创建第二个 upgrade transaction。
- non-cooperative legacy v1 connection导致 v2 open blocked时，session hydration有界 fallback，Editor/Preview/Checker/Reset继续，且不删除 DB。
- blocked fallback后的迟到 open/data被 attempt identity丢弃，不覆盖 local draft、不污染当前 DB cache。
- malformed v1 record不阻断其他合法 record。
- completedAt保留。
- unknown saved path ignored。
- locked saved path ignored。
- revision mismatch不恢复。
- completed edit仍 completed。
- 已经 version 2 的 DB 不重复跑 v1 migration。

`"style.css"` hardcode只允许：

- v1 migration。
- migration test。
- 当前内容实际 logical path。

不能成为新的 global Workspace default。

## 8. Studio final regression

当前 repository content：

- 3 exercises。
- 3 published exercises。
- 0 errors。
- 0 warnings。
- 3 learner links。

确认新规则实际调用：

- source inspector。
- solution path equality。
- zero editable。
- current Browser JS/TS rule。
- multiple HTML rule。
- undeclared starter rule。
- FileContentReader 以 canonical coursesRoot为 trust anchor，对 Course/Module/Lesson/Exercise/starter 全部后代祖先 segment及 declared final file执行 no-symlink / regular-file / root-containment hard validation。

必须有 server-side/temp-directory 自动化证明：

- final-file symlink拒绝。
- intermediate-directory symlink拒绝。
- course/module/lesson/exercise ancestor directory symlink拒绝，包含 direct `get*BySlug` lookup。
- symlink root escape拒绝。
- regular declared starter正常读取。
- ExerciseSourceInspector扫描异常不返回部分 path set；Studio把 narrow source inspection error转成 blocking health issue。

不能只在 Studio inspector里发现 symlink；learner Reader本身必须 fail closed。

不能只定义未调用 helper。

## 9. Browser security review

### sandbox

只保留必要 `allow-scripts`。

没有：

```text
allow-same-origin
allow-forms
allow-popups
allow-top-navigation
```

### runtime-owned shell

learner HTML不是 raw concat。

### CSP

- nonce随机。
- 每次 HTML rebuild刷新。
- script-src无 unsafe-inline/wildcard。
- object/frame/base/form/connect受限。
- learner HTML/CSS不能通过 remote resource、`url()` 或 `@import` 发起 HTTP(S) network request；isolated E2E使用 request interception验证。

### DOM policy

- script removed。
- event handler attributes removed。
- javascript URLs neutralized。
- meta refresh removed。
- nested executable containers受限。
- anchor/form navigation prevented。

### readiness / generation

- iframe load != runtime ready。
- readiness reset 只由 document generation change驱动；onLoad 不得清掉已经收到的 current-generation ready。
- 只有 typed runtime:ready + current generationId进入 ready。
- document rebuild 必须产生新 generationId。
- CSS-only edit不得改变 generationId。
- stale generation ready不能让 Host向旧 document发送新 check。

### messages

- event.source check。
- source discriminator。
- shape validators。
- generationId 双向 validation。
- requestId validation。
- stale generation result即使 requestId碰巧匹配也必须拒绝。

### check input synchronization

- Check 点击 capture immutable Draft + ExecutionSnapshot。
- checkRequest携带 captured snapshot。
- check:run 前按 captured snapshot显式同步 CSS。
- 不依赖独立 React effect 已经把 live CSS送达 iframe。
- “最后一次输入后立即 Check”有真实自动化覆盖。

### DOM clobbering

- runtime-owned learner root / CSS slots 在 mount learner HTML 前保存直接 reference。
- learner duplicate id/name/data attribute 不影响 Runtime-owned nodes。
- Runtime 不通过 learner 可碰撞的 global named property重新寻找 control nodes。

## 10. AGENTS.md 更新

产品定位：

```text
Front-end Lab Platform
```

不要声称已经支持 JS/TS runtime。

### Long-term tracks

```text
CSS Lab
JavaScript Lab
TypeScript Lab
```

内容独立，基础设施按真实共性共享。

### Architecture

```text
Content
→ Workspace
→ optional Toolchain
→ optional Runtime
→ Checker
→ Progress / Learning Shell
```

术语：

```text
CSS / JavaScript / TypeScript = curriculum/language domain
Browser / Worker              = runtime
TypeScript compiler           = toolchain
```

### Current scope

M6A完成后：

- content-defined HTML/CSS Workspace。
- Workspace Draft。
- Browser Runtime。
- Browser DOM checks。
- IndexedDB draft/progress。
- Studio workspace/source health。

HTML是否 editable由 content metadata决定。

### Planned, not implemented

- JavaScript Worker Runtime。
- JavaScript Browser Runtime。
- TypeScript Toolchain。
- TS no-runtime/type-check workflow。

### Workspace rules

明确：

- Browser Runtime 的 `runtime.entry` 在当前 M6A 是 **HTML fragment**，不是完整 `<!doctype html><html><head><body>` document；document shell/CSP/CSS slots由 Runtime拥有。
- author定义固定 file set。
- learner不能 create/delete/rename。
- locked file不是 secret。
- locked file不能藏 solution。
- solution永不进入 learner runtime。
- Progress只保存 learner-owned mutable state。
- Runtime不依赖 OS filesystem。
- Toolchain/Runtime分离。
- schema vocabulary不等于 runtime capability。

### Preserve CSS Lesson Authoring Skill contract

AGENTS 最终状态必须明确：

- curriculum authoring Skill 是正式 repo workflow。
- Exercise scaffolder 生成当前 Exercise v2 + starter/solution layout。
- deterministic scaffold/inspect scripts继续优先于手写结构。
- Skill 不能自行重新设计 Workspace/Runtime contract。
- `pnpm test:authoring-skill` 是正式质量门禁。

不要在 Task 06 的平台化文案更新中删掉这个刚迁移完成的 authoring workflow。

### Preserve MDX authoring contract

M6A 更新 AGENTS 时必须继续保留并同步以下已经正式生效的规则：

- `lesson.json = metadata`，`lesson.mdx = teaching content`。
- Lesson runtime 不携带 MDX source/body/path。
- generated registry 不手改；新增/移动 Lesson 后显式运行 `pnpm content:generate`。
- `Concept / Predict / Compare / Exercise` 是 v1 唯一允许的 MDX custom components。
- MDX 禁 import/export、arbitrary JS expression、raw HTML/custom JSX、H1。
- Exercise Activity 使用 lesson-local slug，不硬编码 learner absolute route。
- `exercise.order` 继续是 canonical learner sequence。
- `content:check` / `test:content` 继续是正式质量门禁。

不要因为项目定位升级为 Front-end Lab Platform 而把这些 Lesson Content Domain 规则删除或弱化。

### JavaScript wording

旧：

```text
do not support learner JavaScript
```

改成：

```text
Do not enable learner JavaScript execution until the dedicated JavaScript runtime milestone.
```

### 禁止过度抽象

继续禁止：

- npm/WebContainer/terminal。
- arbitrary package runtime。
- framework lab。
- generic VFS。
- cloud IDE/sync/auth。
- LanguagePlugin/RuntimeRegistry/ToolchainRegistry/CheckerRegistry。

## 11. README / docs current-state sync

如果 README/current architecture仍写旧 asset：

```text
fixture.html
base.css
starter.css
solution.css
```

更新到 starter/solution/workspace metadata。

历史变更记录保留历史事实，不为 grep清零篡改。

## 12. Dead code cleanup

删除无消费者的：

- old preview paths。
- old CSS-only Preview props。
- old Progress input。
- saveCode/updateCss/resetCss。
- old Exercise asset adapter。
- Task 02 Workspace→legacy CSS flow compatibility bridge。
- Task 04 temporary style.css preview adapter。
- 无必要 transitional ExerciseV2 aliases。

不要保留双 API。

## 13. 禁止最终出现的过度抽象

默认删除：

```text
UniversalEditor
LanguagePlugin
LanguageRegistry
RuntimeRegistry
RuntimeFactory
ToolchainRegistry
CompilerRegistry
CheckerRegistry
WorkspacePlugin
VirtualFileSystem
generic FileExplorer
global workspace store
event bus
generic execution graph/pipeline engine
package resolver
module CDN adapter
```

除非仓库中已存在第二个真实实现需求；M6A没有。

## 14. Release compatibility / rollback review

M6A 只作为一个最终 release unit进入 main。最终 merge 前必须确认：

- Task 01~06 都已在同一 feature branch完成，阶段 commit 只用于 review/bisect，没有中途把 v2 content/storage contract发布到 main。
- repository content 已全部是 Exercise schema v2，不存在 production v1/v2双读。
- Progress DB runtime contract 已是 version 2，不存在长期双写。
- 发布后 rollback 文档明确：不能直接恢复 M6A 前 `ExerciseRecordSchema v1 / DATABASE_VERSION = 1` 代码。
- 若 production 出现问题，rollback/hotfix 必须继续理解 Exercise v2 + DB v2；可以关闭新 Runtime/UI路径，但不能回退 storage/content compatibility。
- 禁止把 `deleteDatabase` 作为 rollback手段。

最终完成报告必须单独列出：

```text
Release compatibility:
- content schema:
- IndexedDB version:
- safe rollback boundary:
- known forward-fix strategy:
```

## 15. 最终验证

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
git diff --check
git status --short
```

若失败：

- 修实现。
- 不 skip/delete test。
- 不降低安全策略。
- 不 deleteDatabase。
- 不改 build script规避。

## 16. 最终搜索允许/禁止

### 允许

`style.css` 可以存在于：

- current content metadata/path。
- CSS editor UI。
- v1 migration/test。

CSS-specific名称可存在于 CssEditor内部。

历史 docs可出现旧词。

### 禁止 production coupling

```text
Exercise.fixtureHtml
Exercise.baseCss
Exercise.starterCss
Progress.code
saveCode
updateCss
resetCss
css-lab-parent
css-lab-preview
learner-facing solution
BrowserRuntime reading editable
BrowserRuntime reading ProgressStore
```

## 17. Codex 完成报告

必须报告：

1. Workspace/domain changes
2. content migration
3. Progress v1->v2 migration
4. Browser Runtime boundary
5. HTML security measures
6. current CSS regression
7. Workspace/HTML capability automated checks
8. solution leakage boundary
9. Studio health result
10. CSS Lesson Authoring Skill v2 scaffold regression
11. MDX Learning Flow v1 regression / generated registry idempotency
12. `pnpm test:authoring-skill`
13. `pnpm content:check`
14. `pnpm test:content`
15. `pnpm lint`
16. `pnpm build`
17. `pnpm test:e2e`
18. release/rollback compatibility
19. remaining risks

不要自动开始 M6B / JavaScript Runtime / TypeScript Toolchain。

## 18. Acceptance Criteria

- [ ] Task 01-05 criteria全部满足。
- [ ] MDX Learning Flow v1 content contract、Activity、hints、Preview presets、structured diagnostics 与 canonical sequence 无回归。
- [ ] CSS Lesson Authoring Skill 已迁移到 Exercise v2 + starter/solution scaffold contract，`test:authoring-skill`通过。
- [ ] `content:check` / `test:content` / generated registry idempotency通过。
- [ ] current CSS learner E2E通过。
- [ ] Workspace multi-file domain测试通过。
- [ ] Browser isolated HTML/security E2E通过。
- [ ] stale generation ready/result、ready-vs-load race、wrong-generation message、immediate-edit→check、DOM clobbering均有自动化覆盖。
- [ ] v1 IndexedDB migration测试通过。
- [ ] migration 使用 supplied versionchange transaction，fresh v2 / malformed legacy / already-v2 cases均覆盖。
- [ ] blocked v2 open对 non-cooperative legacy connection有有界 in-memory fallback测试，且迟到 open/data不会覆盖 session draft。
- [ ] solution boundary结构性成立。
- [ ] canonical coursesRoot到 Exercise/starter的祖先 symlink、declared starter symlink/non-regular/root-escape 均在 FileContentReader 层 fail closed并有 list/direct lookup测试。
- [ ] ExerciseSourceInspector error contract确定：失败不返回部分结果，Studio生成 blocking health issue。
- [ ] learner HTML/CSS HTTP(S) network egress被 CSP阻断并有 request-level测试。
- [ ] Studio当前 0 error / 0 warning。
- [ ] AGENTS与 Front-end Lab方向一致。
- [ ] README/current docs同步，包含 Browser entry = HTML fragment authoring contract。
- [ ] final release unit / forward-compatible rollback边界已记录。
- [ ] 没有 JS/TS runtime提前实现。
- [ ] 没有 generic IDE/plugin abstraction。
- [ ] test:authoring-skill/content:check/test:content/lint/build/e2e/generated-registry-idempotency/diff-check全部通过。
