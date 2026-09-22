# Task 02 — Content Assets、Exercise v2 Atomic Cutover、ContentReader 与 Studio Health

## 目标

在一个阶段内原子完成：

```text
content assets v1 -> workspace layout
exercise.json v1 -> v2
runtime Exercise type -> Workspace
FileContentReader -> workspace hydration
Studio -> workspace/source health
```

Task 02 结束后不再存在 production v1 Exercise runtime contract。

注意：这不等于旧 learner UI/Progress/Preview 在本阶段已经全部重写。Task 02 必须提供一个**局部、显式、可删除的 compatibility bridge**，让现有 CSS learner flow 在 Exercise v2/Workspace 上继续运行，直到 Task 03~05 逐步替换。

## 1. 开始前读取

```text
docs/任务计划/01-M6A-Workspace-Domain与Exercise-Schema-v2.md
docs/功能文档/MDX-Learning-Flow-v1-产品方案.md
docs/任务计划/MDX-Learning-Flow-v1/07-M6A-衔接约束.md
AGENTS.md
.agents/skills/css-lesson-authoring/SKILL.md
.agents/skills/css-lesson-authoring/references/*
.agents/skills/css-lesson-authoring/assets/**
.agents/skills/css-lesson-authoring/scripts/scaffold.mjs
.agents/skills/css-lesson-authoring/scripts/authoring-skill.test.mjs
src/lib/workspace/*
src/lib/content/file/file-content-reader.ts
src/lib/content/file/file-utils.ts
src/lib/content/reader.ts
src/lib/content/types.ts
src/lib/content/schemas/exercise.ts
src/features/studio/lib/content-health.ts
src/app/studio/page.tsx
src/features/learning/lib/learner-content.ts
content/courses/**
e2e/studio-content-health.spec.ts
```

全局搜索：

```text
fixtureHtml
baseCss
starterCss
fixture.html
base.css
starter.css
solution.css
ExerciseRecordSchema
current v1 asset layout
introduce Exercise v2
.agents/skills/css-lesson-authoring
```

## 2. 原子 cutover 原则

这个阶段同一 commit 必须同时包含：

- metadata v2
- asset relocation
- Exercise runtime type
- production ExerciseRecordSchema -> v2
- FileContentReader v2 hydration
- Studio updates

不要提交“Reader 只认 v2，但磁盘还是 v1”的中间态。

不要长期保留 v1/v2 双读 fallback。

### Lesson Content Domain 明确不参与本次 cutover

以下正式 MDX v1 基线必须原样保留：

- `lesson.json` metadata contract。
- `lesson.mdx` teaching source。
- generated lesson registry。
- `LessonContentInspector`。
- `scripts/content/*` / MDX contract tooling。
- `content:generate` / `content:check` / `test:content`。

`lesson.mdx` **不是** Workspace asset；Exercise v1 → v2 只迁移 Exercise 自己的 metadata/assets。不要把 Lesson source 放进 `starter/`，也不要让 `FileContentReader` 重新读取 MDX body。

## 3. 现有 Exercise asset 迁移

每个当前 exercise：

```text
exercise.json
fixture.html
base.css
starter.css
solution.css
```

迁移：

```text
exercise.json

starter/
  index.html
  base.css
  style.css

solution/
  style.css
```

映射：

```text
fixture.html  -> starter/index.html
base.css      -> starter/base.css
starter.css   -> starter/style.css
solution.css  -> solution/style.css
```

不创建 `support/`。

当前 3 个 Exercise 的 id/slug/order/revision/URL 不变；仅 asset representation 改变不 bump revision。

其中 `exercise.order` 已是 MDX v1 的 canonical learner sequence。迁移后 `content:check` 必须继续证明 learner-visible Lesson 对三个 published Exercise 的引用完整、唯一且同序；不得因 v2 metadata 改写 sequence 语义。

### CSS Lesson Authoring Skill 同步迁移

最新 main 已把 `.agents/skills/css-lesson-authoring/` 作为正式 curriculum authoring tool，并在 CI 运行 `pnpm test:authoring-skill`。

因此 Exercise v2 cutover 必须同一 Task 原子更新 Skill，不能留下：

```text
runtime/content reader = v2
official scaffolder    = v1
```

至少同步：

#### Skill contract / references

更新：

```text
.agents/skills/css-lesson-authoring/SKILL.md
.agents/skills/css-lesson-authoring/references/content-contract.md
以及其他仍描述旧 root asset layout 的 active references
```

要求：

- Course/Module/Lesson 仍明确 schemaVersion 1。
- Exercise 明确 schemaVersion 2。
- Exercise source layout 改为 `starter/` + `solution/`。
- 删除“scaffolder creates current v1 asset layout”。
- 删除“Skill must not introduce Exercise v2”这种已经失效的边界；替换为“不自行重新设计既有 Exercise v2/Workspace/Runtime contract”。
- 删除“Skill must not implement M6A”这种一次性 milestone 边界；替换为长期规则：“curriculum authoring Skill 不负责重构 learner UI、Workspace domain、Runtime protocol 或平台架构；遇到能力缺口应报告，而不是在 authoring workflow 中扩展平台”。
- Skill frontmatter/description 中的 “M6A architecture work” 等 milestone-specific措辞也同步改成长期平台边界，避免 M6A 完成后说明过期。
- status 只使用当前真实 `draft | published` vocabulary，不引入不存在的 `hidden` status。

#### Templates

`exercise.json.template` 必须生成 v2 metadata：

```json
{
  "schemaVersion": 2,
  "workspace": {
    "files": [
      { "path": "index.html", "language": "html", "editable": false },
      { "path": "base.css", "language": "css", "editable": false },
      { "path": "style.css", "language": "css", "editable": true }
    ]
  },
  "runtime": {
    "type": "browser",
    "entry": "index.html"
  }
}
```

将 active asset templates 的命名/目录也同步到 v2 语义，推荐：

```text
assets/starter/index.html.template
assets/starter/base.css.template
assets/starter/style.css.template
assets/solution/style.css.template
```

不要继续保留 fixture/starter.css/solution.css root-layout template 作为第二套 scaffold source of truth。

#### Scaffolder

`scaffold.mjs exercise` 必须创建：

```text
exercise.json
starter/index.html
starter/base.css
starter/style.css
solution/style.css
```

并继续保持：

- draft status。
- caller supplied stable id。
- revision/order semantics。
- duplicate id/order/path overwrite protection。
- deterministic structure。

Lesson scaffolding与 source-pack tooling不因 M6A 改写。

#### Skill tests

`authoring-skill.test.mjs` 至少断言：

- scaffolded Exercise schemaVersion === 2。
- workspace/runtime metadata与输出 files一致。
- old root `fixture.html/base.css/starter.css/solution.css` 不再生成。
- nested `starter/` / `solution/` files存在。
- draft/revision/order/id invariants仍成立。

#### AGENTS minimum sync at Task 02

Task 02 就要更新 AGENTS 中已经因 cutover 变成错误事实的：

- Exercise Assets layout。
- CSS Lesson Authoring Skill scaffold contract。
- Lesson/Exercise status 描述中任何不存在的 `hidden` vocabulary，统一到真实 `draft | published` schema。

不要等 Task 06 才修这些 factual contracts；Task 06 再负责 Front-end Lab Platform 的完整产品/架构措辞升级。

## 4. exercise.json v2

当前 CSS exercises：

```json
"workspace": {
  "files": [
    { "path": "index.html", "language": "html", "editable": false },
    { "path": "base.css", "language": "css", "editable": false },
    { "path": "style.css", "language": "css", "editable": true }
  ]
},
"runtime": {
  "type": "browser",
  "entry": "index.html"
}
```

顺序固定：

```text
index.html
base.css
style.css
```

CSS cascade 后续依赖 declaration order。

## 5. Production Exercise type cutover

Task 02 完成后 `Exercise`：

- `schemaVersion: 2`。
- 保留 metadata/checks/parent ids。
- 增加 `workspace: ExerciseWorkspace`。
- 增加 `runtime: BrowserRuntimeDefinition`。
- 删除 `fixtureHtml/baseCss/starterCss`。

不要保留 optional legacy fields、legacyAssets 或 v1/v2 UI union。

Task 01 transitional alias如已无用，本阶段删除/收敛。

### Task 02 compatibility bridge

当前真实代码中 `LearningWorkspace`、旧 Progress hook、旧 Preview 仍消费 CSS-only字段。Task 02 删除 Exercise legacy fields 后，必须在 learner integration 边界提供临时 bridge，而不是把旧字段重新加回 Exercise。

bridge 只服务当前 3 个 CSS Exercise 的已知 topology：

```text
index.html locked
base.css   locked
style.css  editable
runtime.entry = index.html
```

它可以局部派生：

- entry HTML content。
- 当前 locked CSS content。
- 当前唯一 editable CSS path 与 starter content。
- 旧 Preview 所需的 CSS-only input。

要求：

- 来源只能是 `exercise.workspace` + `exercise.runtime`。
- 不建立新的长期 public domain type。
- 不让 `FileContentReader` 再产出 `fixtureHtml/baseCss/starterCss`。
- 对不符合当前 compatibility topology 的 Exercise 必须显式失败，不能假装通用支持。
- hardcode `style.css` 若不可避免，只能集中在这个临时 bridge，并带 Task 03/04/05 删除说明。
- Task 03 后 Progress 不再依赖该 bridge 的 starterCss/code contract。
- Task 04 后 Editor 不再依赖该 bridge 的 CSS-only state。
- Task 05 删除最后的旧 Preview adapter 与 compatibility bridge。

这个 bridge 的存在是为了保持阶段事务完整，不是新的平台架构。

## 6. FileContentReader hydration

`readExercise()`：

1. 读取 `exercise.json`。
2. 使用 production ExerciseRecordSchema(v2) validate。
3. 遍历 `record.workspace.files`。
4. 读取 `starter/<logical-path>`。
5. hydrate `StarterWorkspace.files`。
6. 返回 solution-free Exercise。

只有通过 WorkspacePath schema 的 logical path 可以进入 OS `join()`。

### Content filesystem containment

WorkspacePath grammar 只能防止字符串层面的 `../` / separator escape，**不能阻止 filesystem symlink escape**。

FileContentReader 必须先把构造时配置的 `coursesRoot` 解析为 canonical trust anchor。允许部署者把配置入口本身指向 symlink，但 canonical root一旦建立，所有 content descendants 都必须位于该 root 内，且不能通过后代 symlink重新定向。

从 canonical `coursesRoot` 到当前 Exercise 的路径链必须逐段验证：

```text
<course>/
modules/<module>/
lessons/<lesson>/
exercises/<exercise>/
starter/
```

要求：

- 上述每一个已存在的后代 directory segment 都必须是 non-symlink directory。
- `getCourseBySlug/getModuleBySlug/getLessonBySlug/getExerciseBySlug` 的 direct slug lookup 与 list flow 使用同一安全解析规则；不能让 list忽略 symlink、但 direct route通过 `stat()` follow symlink。
- canonical Exercise/starter path 必须仍 contained by canonical `coursesRoot`。
- 不能只对最终 `starter/` 调用 `lstat`；若 `exercise/` 或更早祖先是 symlink，`starter/` 自身仍可能表现为普通目录。

在 validated starter root 内读取每个 declared starter file 时继续 fail closed：

- Exercise `starter/` root 本身必须是 non-symlink directory。
- 从该已验证 root 开始解析。
- `starter/` 下参与 logical path 的中间目录不得是 symlink。
- 最终 declared file 不得是 symlink，且必须是 regular file。
- 可使用 `lstat` + segment walk，或等价的 `realpath` containment + no-symlink policy；不能只做 `join().startsWith(...)` 字符串判断。
- missing / symlink / non-regular / root escape 都属于 hard loading error。
- Reader、LessonContentInspector 与 ExerciseSourceInspector 应共享窄的安全 content-root/path/file helper，避免多套 filesystem规则漂移；不要因此抽 generic VFS/filesystem framework。

### Metadata、Lesson source 与最终文件

目录祖先安全不等于最终文件安全。当前实现中的 `readJsonFile()`、`readTextFile()` 与 `FileLessonContentInspector` 都会直接调用 `readFile()`；如果不先验证最终文件，它们仍会 follow symlink，或尝试读取 FIFO/socket/device。

因此，同一窄 helper 必须覆盖 File-backed production/Studio 实际读取的最终文件：

```text
course.json
module.json
lesson.json
exercise.json
lesson.mdx
starter/<declared-workspace-path>
```

要求：

- 读取前验证完整祖先链仍 contained by canonical `coursesRoot`。
- 除 `FileLessonContentInspector` 明确定义的 missing `lesson.mdx` 检测外，必需最终文件必须存在；任何实际存在并将被读取的最终文件都不得是 symlink，且必须是 regular file。
- `realpath` containment 不能替代 no-symlink policy；两者都要满足。
- `FileContentReader` 的四类 metadata JSON 与 declared starter file 使用该边界。
- `FileLessonContentInspector` 保留“missing lesson.mdx -> exists:false”的既有语义，但 symlink、non-regular、root escape 必须 fail closed，不能按 missing/empty 处理。
- `FileExerciseSourceInspector` 扫描到的每个 starter/solution file 使用同一 final-file规则。
- 不把绝对 OS path或文件内容泄露到 learner/client错误对象。

该约束必须由 FileContentReader 自己执行，不能只依赖 Studio Health，因为 learner route 不以“先访问 Studio”为安全前提。

Runtime 永远看不到 OS path。

## 7. Studio source dependencies

MDX v1 已让 Studio 依赖 `LessonContentInspector`。Task 02 新增 Exercise asset/source inspection 时，不得覆盖或绕开该依赖。

推荐把多个 source dependency 收敛为显式 options object，而不是继续增加 positional 参数，例如：

```ts
readStudioContentHealth(contentReader, {
  lessonContentInspector,
  exerciseSourceInspector,
});
```

名称可按实际代码调整。要求是：

- Lesson source facts 与 Exercise source facts 仍是两个窄职责。
- 两个 inspector 都保持 server-only。
- learner route/client graph 不 import source inspector。
- 不设计 generic `ContentInspectorRegistry`。

## 8. Hard loading errors 与 Content Health 分工

### Hard loading/schema error

以下继续让 FileContentReader throw，Studio 显示已有 `Content load failed`：

- JSON parse 失败。
- ExerciseRecordV2Schema 不合法。
- Workspace path 不合法。
- duplicate/case-collision path。
- language/extension mismatch。
- Browser entry 不存在或不是 HTML。
- 声明的 starter file 缺失/不可读。
- Course/Module/Lesson/Exercise metadata final file为 symlink、non-regular或逃离 canonical root。
- declared starter或其共同祖先为 symlink、non-regular或逃离 canonical root。

不要为把这些变成 Health row 而重写整个 loading pipeline。

### Content Health issue

Reader 成功 hydrate 后才做：

- zero editable
- unsupported Browser language
- multiple HTML
- undeclared starter
- solution completeness
- 原有 stable-id/order/published/check rules

这样 schema/read error 与 authoring quality 不冲突。

## 9. Server-only ExerciseSourceInspector

Solution 不进入 Exercise，因此 Studio 使用窄 source inspection。

推荐：

```text
src/lib/content/file/file-exercise-source-inspector.ts
```

必须 `import "server-only"`。

建议 contract：

```ts
interface ExerciseSourceRef {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  exerciseSlug: string;
}

interface ExerciseAssetInspection {
  starterPaths: readonly WorkspacePath[];
  solutionPaths: readonly WorkspacePath[];
}

interface ExerciseSourceInspector {
  inspectExercise(
    source: ExerciseSourceRef,
  ): Promise<ExerciseAssetInspection>;
}
```

File implementation与 FileContentReader使用同一 courses root convention。

错误语义写死：

- `ExerciseSourceInspector` 只在完整、安全、确定地扫描成功时返回 `ExerciseAssetInspection`。
- root/ancestor/final symlink、root escape、socket/device及其他 non-regular entry 一律 throw narrow source inspection error；不要返回部分 path set。
- 只有在 `FileContentReader` 已成功 hydrate 当前 Exercise 后，`readStudioContentHealth` 才调用 inspector。此时 inspector-only 的错误（例如 `solution/` 或 undeclared starter entry中的 symlink/non-regular file）生成 blocking `error` health issue，例如 `exercise-source-inspection-failed`。
- 如果错误位于 Reader必须先读取的 metadata、共同祖先或 declared starter，Reader会先 fail closed，Studio保持全局 `Content load failed`。不要要求同一次真实 Studio调用既由 Reader hard fail，又继续生成 per-Exercise health row。
- `FileContentReader` 的 hard loading error 与 Inspector health issue是按“Reader能否成功 hydrate”划分的互斥结果；Inspector不能替代 Reader安全边界。

### Scanner rules

递归扫描 `starter/` / `solution/`，返回：

- 相对对应 root 的 logical path。
- separator 永远 `/`。
- sorted，报告 deterministic。
- 只包含 regular files。

遇到 symlink/socket/device/其他非 regular file：

- 不 follow。
- 按上述 contract throw source inspection error；若 Reader已成功 hydrate且该错误只存在于 source-only扫描面，由 Studio 转为 blocking health error，否则遵循 Reader hard-load语义。
- 与 FileContentReader 使用同一 no-symlink / regular-file / containment规则；Inspector 不是 Reader 安全性的替代品。

不得暴露绝对 OS path 到 Studio domain。

不要把 ExerciseRecordV2 的完整 Zod schema 复制到 `scripts/content`。现有 content tooling 继续只负责 repository/authoring integrity；完整 runtime/schema validation 仍由正式 content schema + FileContentReader/build 承担。

## 10. Studio Workspace Health

保留现有：

- duplicate stable id
- sibling duplicate order
- published-child-hidden
- empty lesson body
- published empty lesson/module/course
- exercise without checks
- duplicate check id

删除 `empty-fixture`。

### zero editable

```text
visible published exercise -> error
draft exercise             -> warning
```

### Browser current capability

`runtime.type === "browser"` 且 workspace 含 `javascript/typescript` -> error。

这是 authoring capability error，不改变 Workspace schema vocabulary。

### Multiple HTML

M6A Browser exercise 中 HTML files 必须正好 1。

0 HTML 已由 entry structural validation挡住；>1 -> Health error。

不定义 multi-page semantics。

### Undeclared starter

```text
actual starter paths - declared workspace paths
```

非空 -> error。

声明但缺 starter 已属于 Reader hard error，不重复诊断。

## 11. Solution completeness

```text
editablePaths = declared files where editable=true
solutionPaths = ExerciseSourceInspector.solutionPaths

set(solutionPaths) === set(editablePaths)
```

因此：

- editable path 缺 solution -> error
- locked path 出现在 solution -> error
- undeclared solution path -> error
- extra solution file -> error

当前 CSS Exercise 只能有 `solution/style.css`，不要复制 locked `index.html/base.css`。

## 12. Solution boundary

禁止：

```ts
interface Exercise {
  solution: ...
  solutionFiles: ...
}
```

也禁止“先读进 Exercise 再 omit”。

正确边界：

```text
FileContentReader
  -> learner-safe hydrated Exercise

FileExerciseSourceInspector
  -> server-only authoring source facts
```

Studio可依赖两者；learner只能依赖前者。

## 13. JS/TS interim rule

Task 02-04 期间不得向 content 添加 JS/TS workspace file。

schema vocabulary允许，但 Browser fail-closed 到 Task 05 才完成。

## 14. Compatibility / filesystem tests

除 Studio E2E 外，必须增加可自动化的临时目录测试，至少覆盖：

- declared starter normal regular file 可读。
- declared starter missing -> hard error。
- final-file symlink -> hard error。
- intermediate-directory symlink -> hard error。
- symlink 指向 starter root 外 -> hard error。
- course/module/lesson/exercise 任一后代祖先 directory symlink -> hard error。
- direct `get*BySlug` lookup不能通过祖先 symlink读取 canonical `coursesRoot` 外内容。
- `course.json/module.json/lesson.json/exercise.json` final-file symlink与non-regular file -> hard error。
- `FileLessonContentInspector` 对 `lesson.mdx` final-file symlink/non-regular/root escape fail closed，同时保留 missing -> `exists:false`。
- ExerciseSourceInspector 对 source-only 的 `solution/` 或 undeclared starter entry中的 symlink/non-regular file fail closed；在 Reader可成功 hydrate该 Exercise的 fixture中，Studio收到 blocking health issue而不是部分扫描结果。
- declared starter或共同祖先错误由 Reader hard fail，测试不得同时期待同一次 Studio调用产生 inspector health row。
- non-regular entry 不被当作 starter file。
- Task 02 compatibility bridge 对当前 3 个 CSS Exercise 正常。
- compatibility bridge 遇到第二个 editable CSS / editable HTML / 非预期 topology 明确失败，而不是静默取第一个文件。

测试应直接针对 server-side helper/Reader，不依赖 Studio 页面才发现问题。

### Studio Workspace/source health negative tests

当前三个 Exercise 都是健康 happy path，不能证明新增规则真实执行。使用现有 Playwright runner直接 import Studio health纯/server helper，并用最小 fake reader/inspector或临时目录 fixture覆盖：

- visible published zero editable -> error。
- draft zero editable -> warning。
- Browser workspace含 javascript/typescript -> error。
- 第二个 HTML file -> error。
- undeclared starter path -> error。
- editable path缺 solution -> error。
- locked path、undeclared path或extra file出现在 solution -> error。
- solution path set与 editable path set完全相等 -> 无对应 issue。
- Reader已成功 hydrate时，source-only inspector failure -> `exercise-source-inspection-failed` blocking issue。
- existing duplicate stable id/order/check id与 published visibility规则无回归。

断言稳定 issue code/severity/location；不要只断言总数量。

## 15. E2E

更新 `e2e/studio-content-health.spec.ts`：

- Studio 正常打开。
- exercise count 3。
- published exercise count 3。
- 0 errors。
- 0 warnings。
- learner links 3。
- learner href不变。

不要依赖样式 class。

## 16. 验证

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

并确认 Lesson registry 因 Exercise asset migration 保持幂等：

```bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

人工确认旧 root assets不与新结构双存。注意 `starter/base.css` 是合法新路径。

## 17. Acceptance Criteria

- [ ] 当前 3 个 exercise 已迁移 starter/solution。
- [ ] CSS Lesson Authoring Skill 同步迁移到 Exercise v2 + starter/solution layout。
- [ ] scaffolder/template/reference/test 不再把 v1 root assets当 current contract。
- [ ] AGENTS 中 Exercise Assets / authoring scaffold factual contract 在 Task 02 即同步 v2。
- [ ] Exercise production schema/type 原子切 v2。
- [ ] 不存在 v1/v2 UI union。
- [ ] fixtureHtml/baseCss/starterCss 从 runtime Exercise 删除。
- [ ] Task 02 compatibility bridge 只从 Workspace/runtime 派生现有 CSS flow，不把 legacy fields 放回 Exercise。
- [ ] compatibility bridge 对超出当前 CSS topology 的输入 fail closed，并有后续 Task 删除路径。
- [ ] Reader metadata-driven hydrate declared starter files。
- [ ] declared starter missing 明确为 hard load error。
- [ ] canonical coursesRoot trust anchor已建立；从该根到 Exercise/starter 的所有后代祖先 segment 与 declared starter final file 都执行 no-symlink/containment/regular-file校验。
- [ ] `course.json/module.json/lesson.json/exercise.json/lesson.mdx` 最终文件同样执行 no-symlink/containment/regular-file校验。
- [ ] list flow 与 direct `get*BySlug` lookup使用同一安全路径规则，祖先 symlink不能绕过 Reader边界。
- [ ] declared starter 的 final/intermediate/ancestor symlink、non-regular file、root escape 明确为 hard load error。
- [ ] Reader filesystem containment 不依赖 Studio 先运行。
- [ ] ExerciseSourceInspector server-only。
- [ ] Inspector 只返回 normalized logical paths。
- [ ] Inspector扫描失败不返回部分结果；Reader成功 hydrate后的 source-only inspection error由 Studio转成 blocking health issue。
- [ ] Reader必需 metadata/declared starter/共同祖先错误保持 hard loading error，不与 inspector health row形成不可满足的双重要求。
- [ ] solution 不进入 Exercise。
- [ ] zero editable 按状态 audit。
- [ ] JS/TS Browser capability 报 error。
- [ ] multiple HTML 报 error。
- [ ] solution path set 等于 editable path set。
- [ ] zero editable、Browser JS/TS、multiple HTML、undeclared starter、solution equality与 inspector failure均有负向自动化覆盖。
- [ ] Studio 当前 0 error / 0 warning。
- [ ] URL/id/revision不变。
- [ ] `lesson.mdx` / generated registry / LessonContentInspector 未被 Workspace migration 污染。
- [ ] canonical `exercise.order` 与 MDX Exercise references 仍通过 `content:check`。
- [ ] test:authoring-skill/content:check/test:content/lint/build/e2e通过。
