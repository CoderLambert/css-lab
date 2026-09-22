# Task 04 — Workspace Editor 与 HTML/CSS Editing

## 目标

把当前单一 CssEditor 面板升级为 content-defined editable Workspace files，同时只抽取已经出现第二个真实 use case 的 CodeMirror 公共层。

## 开始前读取

```text
src/features/exercise/components/css-editor.tsx
src/features/exercise/lib/editor/*
src/features/learning/components/editor-panel.tsx
src/features/learning/components/learning-workspace.tsx
package.json
AGENTS.md
```

## 1. Dependency

当前 package 没有 HTML CodeMirror language support。

加入：

```text
@codemirror/lang-html
```

使用 pnpm，保持 lockfile 正确更新。

不要额外引入 Monaco、Ace 或其他 editor library。

## 2. 共享 CodeMirror shell

当前 CssEditor 中以下能力应抽为窄公共层：

- EditorView create/destroy
- controlled value sync
- external sync annotation
- basicSetup
- update listener
- focus handle
- Tab / Shift-Tab 基础行为
- editor shared visual theme
- format transaction的一次 undo 行为，如能在不复杂化 API 的情况下共享

CSS-specific 必须继续留在 CSS 层：

- `css()`
- CSS color swatches
- Prettier postcss parser
- CSS-specific format error wording

HTML-specific：

- `html()`
- Prettier html parser
- HTML-specific format error wording

不要创建：

```text
UniversalEditor
LanguagePlatform
PluginRegistry
LanguageRegistry
```

推荐只有类似：

```text
CodeMirrorEditor
CssEditor
HtmlEditor
```

的三层。

## 3. Shared theme 命名

当前 `cssLabTheme` 实际包含大量 editor-global tokens，同时有 `.cm-css-color-swatch`。

重构时：

- 通用 editor theme 可以改为 neutral naming。
- CSS swatch decoration CSS 可继续由 CSS extension theme 单独附加，避免 shared theme 反向知道 CSS feature。
- 保留现有视觉 token 和视觉表现，不做 redesign。

## 4. Formatter

CSS 继续使用：

```text
prettier/standalone
prettier/plugins/postcss
parser: css
```

HTML 使用 Prettier HTML parser/plugin。

不要引入新的 formatter dependency。

格式化必须：

- 异步 lazy load。
- 保持 stale result 防护：格式化期间用户又编辑，旧 format 结果不能覆盖新内容。
- 单次 format 是一个 undoable action。
- external controlled sync 不进入 undo history。

## 5. Workspace Editor Panel

当前 `EditorPanel` hardcode：

```text
style.css
CSS · 2 spaces · UTF-8
```

升级为 Workspace editor。

输入至少包含：

- WorkspaceDefinition
- ExerciseDraft
- onFileChange(path, content)

当前只展示 editable files。

默认 active file：

> WorkspaceDefinition declaration order 中第一个 editable file。

Active path 是纯 UI state：

- 不持久化到 Progress。
- 切换文件不修改 draft。
- reset 不改变 active path，除非 active path 已失效。

## 6. Tabs / file selection

有多个 editable file 时提供清晰 file tabs 或等价 selector。

要求：

- 显示 logical path，至少 filename 清晰；若未来有同名不同目录，应能区分完整 path。
- dirty indicator 可由 draft vs starter 派生。
- 不要建立 file explorer tree。
- learner 不能 create/delete/rename。

locked files 默认不显示在 editor tabs。

不要为了未来需求增加 visible/hidden/readOnlyVisible metadata。

## 7. HTML + CSS 当前支持场景

必须支持：

### CSS-only historical exercise

```text
index.html locked
base.css   locked
style.css  editable
```

UI 看起来应基本保持当前单 CSS editor。

### HTML + CSS exercise domain capability

```text
index.html editable
base.css   locked
style.css  editable
```

即使当前课程内容暂时仍全部 locked HTML，组件/domain 必须能正确处理这个组合。

为避免只写“理论支持”，建议新增一个测试 fixture 或专门的组件/逻辑测试路径；如果不希望新增 published content，可以在 E2E 后续阶段使用测试专用内容策略，但不要污染生产课程。

## 8. Reset

UI 当前只有 Reset all 按钮也可以保留，但 domain hook 必须已经支持：

- resetFile(path)
- resetAll()

如果本阶段没有明确 UI 需求，不必增加“单文件 reset”按钮。

Reset 后：

- draft 恢复 starter editable contents。
- dirty state 清除。
- persistence 保存新的 draft。
- active checker state 后续 integration 时失效。

## 9. LearningWorkspace integration

把当前：

```text
css
updateCss
resetCss
```

替换成：

```text
draft
updateFile
resetAll
```

此阶段 Preview 如果 Task 05 尚未完成，可以通过临时适配从 draft 取当前 `style.css` 保持编译，但不要新增新的长期 CSS-only domain type。

目标是每个 commit 可编译，不要求人为制造中间破坏状态。

## 10. Accessibility

- file tabs 使用合理 button/tab semantics。
- active file 可被键盘切换。
- format button aria-label 必须反映当前语言。
- 保留 CodeMirror Esc -> Tab 的可访问行为，不要破坏现有键盘体验。

## 11. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

至少回归：

- CSS color swatch
- format
- undo
- reload restore
- reset
- file switch 不丢内容

## 12. Acceptance Criteria

- [ ] 安装 @codemirror/lang-html。
- [ ] 有窄 CodeMirror shared shell。
- [ ] CssEditor 仍保留 CSS 专属能力。
- [ ] HtmlEditor 使用 HTML language support。
- [ ] 没有 UniversalEditor/LanguageRegistry。
- [ ] Workspace Editor 基于 editable files 渲染。
- [ ] active file 不进入 Progress。
- [ ] 多 editable files 切换不丢 draft。
- [ ] dirty 为 derived state。
- [ ] 当前 CSS editor UX 无明显回归。
