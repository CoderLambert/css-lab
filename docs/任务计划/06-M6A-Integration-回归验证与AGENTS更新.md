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
- generated registry 不因 Exercise Workspace migration 产生无解释 diff。

对应质量门禁：

```bash
pnpm content:check
pnpm test:content
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

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
- HTML不同导致 document generation变化。
- script/event/javascript URL blocked。
- CSS slots/protocol/checker工作。

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

- v1 started迁移。
- v1 completed迁移。
- completedAt保留。
- unknown saved path ignored。
- locked saved path ignored。
- revision mismatch不恢复。
- completed edit仍 completed。

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

### DOM policy

- script removed。
- event handler attributes removed。
- javascript URLs neutralized。
- meta refresh removed。
- nested executable containers受限。
- anchor/form navigation prevented。

### readiness

- iframe load != runtime ready。
- 只有 typed runtime:ready进入 ready。

### messages

- event.source check。
- source discriminator。
- shape validators。
- requestId validation。

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

- author定义固定 file set。
- learner不能 create/delete/rename。
- locked file不是 secret。
- locked file不能藏 solution。
- solution永不进入 learner runtime。
- Progress只保存 learner-owned mutable state。
- Runtime不依赖 OS filesystem。
- Toolchain/Runtime分离。
- schema vocabulary不等于 runtime capability。

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

## 14. 最终验证

```bash
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

## 15. 最终搜索允许/禁止

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

## 16. Codex 完成报告

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
10. MDX Learning Flow v1 regression / generated registry idempotency
11. `pnpm content:check`
12. `pnpm test:content`
13. `pnpm lint`
14. `pnpm build`
15. `pnpm test:e2e`
16. remaining risks

不要自动开始 M6B / JavaScript Runtime / TypeScript Toolchain。

## 17. Acceptance Criteria

- [ ] Task 01-05 criteria全部满足。
- [ ] MDX Learning Flow v1 content contract、Activity、hints、Preview presets、structured diagnostics 与 canonical sequence 无回归。
- [ ] `content:check` / `test:content` / generated registry idempotency通过。
- [ ] current CSS learner E2E通过。
- [ ] Workspace multi-file domain测试通过。
- [ ] Browser isolated HTML/security E2E通过。
- [ ] v1 IndexedDB migration测试通过。
- [ ] solution boundary结构性成立。
- [ ] Studio当前 0 error / 0 warning。
- [ ] AGENTS与 Front-end Lab方向一致。
- [ ] README/current docs同步。
- [ ] 没有 JS/TS runtime提前实现。
- [ ] 没有 generic IDE/plugin abstraction。
- [ ] content:check/test:content/lint/build/e2e/generated-registry-idempotency/diff-check全部通过。
