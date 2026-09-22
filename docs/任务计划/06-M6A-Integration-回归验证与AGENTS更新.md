# Task 06 — Integration、Regression、Security 与 AGENTS 更新

## 目标

完成 M6A 最终集成，消除 CSS-only platform assumptions，补齐回归测试和项目规则。此阶段不再增加新的架构能力。

## 开始前读取

必须重新审计最新代码，而不是假设 Task 01-05 都完全按文档实现。

至少全局搜索：

```text
fixtureHtml
fixture.html
baseCss
starterCss
starter.css
solution.css
code:
saveCode
updateCss
resetCss
css-lab-parent
css-lab-preview
CSS exercise preview
do not support HTML editing
do not support learner JavaScript
```

区分合法历史文档/迁移代码与仍存在的 runtime coupling。

## 1. LearningWorkspace final integration

最终 session 应围绕：

```text
Exercise
→ hydrated ExerciseDraft
→ createExecutionSnapshot()
→ BrowserRuntime
```

职责：

- hydrate draft
- update/reset draft
- derive execution snapshot
- manage check lifecycle
- invalidate check on any editable file mutation
- persist captured passing draft
- refresh aggregate progress

不要让 LearningWorkspace：

- 自己读 IndexedDB
- 自己拼 browser srcDoc
- 自己解析 workspace path
- 自己读取 solution

## 2. Current CSS exercise regression

现有三个 CSS exercise 必须继续：

- starter content 正确
- CSS edit 正确
- Preview 正确
- style / exists / count checker 正确
- completion 正确
- reload restore 正确
- previous/next sequence 正确
- course progress percentage 正确
- format 正确
- color swatches 正确
- format 可一次 undo

不要因为 Workspace tabs 重构让单 CSS exercise UX 明显退化。

## 3. HTML editing regression

至少提供自动化覆盖：

```text
HTML editable + CSS editable
```

如果不希望修改正式课程，可采用 test-only fixture/content setup，但必须遵循现有项目测试方式，不能加入复杂 mock server。

验证：

- active HTML tab可编辑。
- HTML变化反映到 Browser Runtime。
- 切换 CSS 后内容仍在。
- reload 后两个 editable file 都从 Progress 恢复。
- reset all 同时恢复两个 starter file。

如果为了测试增加正式 draft exercise，不能让它进入 published learner sequence。

## 4. Solution leakage regression

增加结构性检查，而不是只靠人工 review。

至少确认：

- learner route props中的 Exercise type没有 solution。
- ContentReader返回对象没有 solution字段。
- client bundle路径不 import server-only source inspector。
- solution 文件内容不会通过 page HTML/RSC props直接序列化给 learner。

可以通过 server/client boundary + 类型结构保证；如果写 E2E，可以搜索页面响应/DOM，但不要把脆弱字符串扫描当成唯一保证。

## 5. Progress migration regression

Task 03 migration test 必须保留并稳定。

再确认：

- DB 名仍为 `css-lab`
- version = 2
- old completed record仍计入 aggregate progress
- revision 不匹配的旧 record不会恢复为当前 draft

## 6. Studio final regression

Studio：

- 3 个当前 published exercise。
- 0 blocking issues。
- 0 warnings。
- learner links 正确。
- Workspace/solution rules 已实际运行，而不是只定义未调用的 helper。

## 7. AGENTS.md 更新

把产品定位从：

```text
CSS Lab only
```

调整为：

```text
Front-end Lab Platform
```

但明确当前实现范围。

### Long-term direction

写清：

```text
CSS Lab
JavaScript Lab
TypeScript Lab
```

Track 内容互相独立，共享合理基础设施。

核心架构：

```text
Content
→ Workspace
→ optional Toolchain
→ optional Runtime
→ Checker
→ Progress / Learning Shell
```

说明：

```text
CSS / JavaScript / TypeScript = language / curriculum domain
Browser / Worker             = runtime
TypeScript compiler          = toolchain
```

### Current implemented scope

M6A 后只能声称：

- HTML + CSS Workspace
- Browser Runtime
- Browser DOM checks
- IndexedDB learner draft/progress

不能声称 JS/TS execution 已支持。

### Planned, not implemented

明确：

- JavaScript Worker Runtime
- JavaScript Browser Runtime
- TypeScript Toolchain

### 继续排除

必须保留/明确：

- npm execution
- WebContainer
- terminal
- arbitrary package installation
- framework runtime
- cloud IDE
- generic filesystem
- authentication
- cloud sync

### 新增 Workspace rules

AGENTS 应明确：

- Workspace file set 由 content author 定义。
- learner 当前不能 create/delete/rename。
- locked file 不是 secret，不能包含答案。
- solution 永远不能进入 learner runtime domain。
- ContentReader 负责 read/hydration，不负责 learner visibility policy。
- Progress 只保存 learner-owned mutable state。
- Runtime 不依赖 OS filesystem path。
- Toolchain 与 Runtime 分离。
- 不为未来能力提前创建 plugin registry。

### JavaScript wording

旧的：

```text
do not support learner JavaScript
```

改成语义明确的：

```text
Do not enable learner JavaScript execution until the dedicated JavaScript runtime milestone.
```

避免和长期产品方向冲突。

## 8. README / docs 同步

如果 README 仍描述：

```text
fixture.html
base.css
starter.css
solution.css
```

同步为新 asset layout。

历史变更记录可以保留历史事实，不要为了全局 grep 清零而篡改历史文档。

## 9. 删除 dead code

在确认所有消费者已迁移后删除：

- 旧 CSS-only preview helpers
- 旧 message constants
- 旧 Progress input types
- 旧 content asset special-field adapter

不要保留双 API “以防以后需要”。

## 10. 最终禁止出现的抽象

最终 review 若看到以下新增，应重新评估并通常删除：

```text
UniversalEditor
LanguagePlugin/LanguageRegistry
RuntimeRegistry/RuntimeFactory
ToolchainRegistry
CheckerRegistry
WorkspacePlugin
VirtualFileSystem
FileExplorer create/delete/rename
global workspace store
event bus
generic execution pipeline
```

## 11. 最终验证命令

必须全部执行：

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

若失败：

- 修复本次引入的问题。
- 不跳过 test。
- 不删除 test。
- 不更改 build script 规避问题。
- 不移除 `--webpack` 作为所谓 cleanup。

## 12. 最终人工审计

执行：

```bash
git diff --check
git status --short
```

并全局搜索 CSS-only coupling。

允许存在：

- v1 migration 中 `style.css` hardcode
- 历史 docs 中旧结构描述
- CSS editor自身的 CSS-specific代码

不允许存在：

- runtime Exercise.fixtureHtml/baseCss/starterCss
- Progress.code/saveCode
- platform source css-lab-parent/css-lab-preview
- learner-facing solution字段

## 13. 完成报告

Codex 完成本阶段后报告必须包含：

1. changed architecture/files
2. IndexedDB migration结果
3. current CSS behavior regression结果
4. HTML editing验证结果
5. solution boundary说明
6. `pnpm lint`结果
7. `pnpm build`结果
8. `pnpm test:e2e`结果
9. 任何剩余风险

不要自动开始 M6B / JS Runtime / TS Toolchain。

## 14. Acceptance Criteria

- [ ] Task 01-05 所有 acceptance criteria 满足。
- [ ] 全部当前 E2E通过。
- [ ] 新 HTML workspace E2E通过。
- [ ] v1 progress migration E2E通过。
- [ ] solution boundary没有回退。
- [ ] AGENTS与新方向一致。
- [ ] README当前架构说明已同步。
- [ ] 没有 JS/TS runtime提前实现。
- [ ] 没有 generic IDE/plugin抽象。
- [ ] lint/build/e2e 全绿。
