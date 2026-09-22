# Task 04 — Workspace Editor 与 HTML/CSS Editing Capability

## 目标

把当前单一 CssEditor 升级为 content-defined editable Workspace Editor。

当前 production content仍可只有一个 editable CSS file，但组件必须正确支持：

```text
index.html editable=true
style.css editable=true
```

不为测试修改当前课程内容，也不增加 test-only产品 route。

## 0. Learning Shell 是既有产品基线

Task 04 的重构边界是 **Editor domain**，不是重新设计整个 learner shell。

必须保留 MDX Learning Flow v1 已确认的布局/行为：

- 左侧 LessonPanel 渲染完整 MDX teaching flow。
- 当前 Exercise context 继续可见。
- progressive hints 仍由 Learning Shell 管理。
- Editor 是主要操作区。
- PreviewPanel 继续是 bounded experiment window，并保留 viewport presets。
- 底部 Action Bar 的 previous/reset/hint/check/next 关系不变。

`LearningWorkspace` 可以为了 Draft/WorkspaceEditor 数据流重构，但不得回退为旧式“三张等权大卡片”或删除 MDX Activity。

## 1. 开始前读取

```text
src/lib/workspace/*
src/features/exercise/components/css-editor.tsx
src/features/exercise/lib/editor/*
src/features/learning/components/editor-panel.tsx
src/features/learning/components/learning-workspace.tsx
src/features/learning/components/lesson-panel.tsx
src/features/learning/components/preview-panel.tsx
src/features/learning/components/mdx/*
src/features/learning/generated/lesson-content-registry.tsx
src/features/progress/hooks/use-exercise-progress.ts
package.json
pnpm-lock.yaml
AGENTS.md
```

## 2. Dependency

加入：

```text
@codemirror/lang-html
```

使用 pnpm并正确更新 lockfile。

不要引入 Monaco/Ace。

## 3. Narrow CodeMirror shared shell

HTML 是第二个真实 editor use case，因此现在可以抽公共 lifecycle，但只抽已出现的共性。

推荐结构：

```text
src/features/exercise/workspace/
  components/
    workspace-editor-panel.tsx
    css-editor.tsx
    html-editor.tsx
  editor/
    code-mirror-editor.tsx
    editor-theme.ts
    editor-keymap.ts
    external-sync.ts
    css/
      css-color-swatches.ts
      format-css.ts
    html/
      format-html.ts
```

目录可结合现状微调，但职责必须等价。

### Shared

可以共享：

- EditorView create/destroy
- basicSetup
- controlled external sync
- external sync annotation
- update listener
- focus handle
- Tab / Shift-Tab base keymap
- generic theme/highlight
- formatted full-document replacement dispatch

### CSS-specific

保留：

- `css()`
- cssColorSwatches
- CSS swatch theme
- PostCSS formatter
- CSS-specific wording

### HTML-specific

保留：

- `html()`
- HTML formatter
- HTML-specific wording

禁止：

```text
UniversalEditor
LanguagePlugin
LanguageRegistry
EditorPluginRegistry
```

WorkspaceEditor直接 `switch(language)` 足够。

## 4. Formatter

### CSS

继续：

```ts
import("prettier/standalone")
import("prettier/plugins/postcss")

parser: "css"
```

### HTML

明确：

```ts
import("prettier/standalone")
import("prettier/plugins/html")

parser: "html"
embeddedLanguageFormatting: "off"
tabWidth: 2
useTabs: false
```

M6A 不为了 HTML 中潜在 embedded JS/CSS 再加载 Babel/ESTree/PostCSS plugin集合。

Formatter lazy module promise失败时要 reset，保留当前 retry语义。

## 5. Formatting race / undo

### stale result

如果：

1. 用户触发 format。
2. Prettier async未完成。
3. 用户继续编辑。
4. 旧 format result返回。

旧结果不能覆盖新内容。

使用 source equality/document version/transaction annotation等可靠机制。

### undo

一次 format = 一次 CodeMirror undoable change。

controlled external sync不进入 normal undo history。

现有 CSS E2E继续验证。

## 6. Workspace Editor Panel contract

输入语义至少：

```ts
interface WorkspaceEditorPanelProps {
  workspace: ExerciseWorkspace;
  draft: ExerciseDraft;
  onFileChange(path: WorkspacePath, content: string): void;
}
```

只渲染 `editable === true` files。

locked files不进入 tabs。

## 7. Active file

默认：

> declaration order 中第一个 editable file。

activePath是纯 UI state：

- 不写 Progress。
- 不写 Draft。
- 不写 URL。
- 不影响 Snapshot。

workspace/revision切换后 activePath失效时，回退第一个 editable path。

### zero editable defensive behavior

虽然 published content health会阻止 zero editable，组件仍应：

- 不访问 undefined。
- 显示明确空状态。
- 不 crash。

## 8. File tabs

多个 editable file：

- 使用合理 tab/button semantics。
- 能唯一标识 logical path。
- 同名不同目录时显示完整 path。
- active state明确。
- dirty从 starter/draft派生。
- 键盘可访问。

不要建立 tree explorer。

禁止 create/delete/rename/drag/folder management。

## 9. Editor state persistence boundary

M6A **只要求 file content 跨 tab 保留**。

不要求：

- per-file cursor persistence
- per-file selection persistence
- per-file scroll persistence
- per-file undo history跨 tab保留

因此切换 active file允许 remount language-specific CodeMirror。

但同一 active file连续编辑期间正常 undo/redo必须工作。

不要为 IDE-grade history建立 `Map<WorkspacePath, EditorState>` 或 global editor state manager。

## 10. Workspace scenarios

当前 CSS Exercise：

```text
index.html locked
base.css   locked
style.css  editable
```

UI仍接近单 CSS editor。

平台能力：

```text
index.html editable
base.css   locked
style.css  editable
```

预期：

- 两个 tabs。
- 切换不丢 draft content。
- HTML -> HtmlEditor。
- CSS -> CssEditor。
- dirty按 file派生。

Task 04 不修改正式课程来证明这一点。

## 11. Reset

Domain/hook支持：

```text
resetFile(path)
resetAll()
```

当前 UI可只保留 Reset All。

Reset All：

- 所有 editable恢复 starter。
- dirty清除。
- persistence保存新 draft。
- activePath若仍合法则保持。
- checker state由 LearningWorkspace清空。

不强制新增 per-file reset button。

## 12. LearningWorkspace integration

把：

```text
css
updateCss
resetCss
```

替换：

```text
draft
updateFile
resetAll
```

Task 05 尚未重构 Runtime，因此本阶段允许一个**窄且临时的 CSS Preview adapter**，例如当前已知 CSS Exercise从 `draft.files["style.css"]` 取值。

要求：

- adapter局部。
- 注释说明 Task 05 删除。
- 不建立长期 CSS-only domain type。
- 不让多个 component都 hardcode `style.css`。

## 13. Testing strategy

### 必须自动化回归

现有 learner E2E继续：

- CSS format
- undo
- swatch
- persistence
- reset
- checker
- navigation

### Workspace pure behavior

用 Playwright runner直接 import Workspace helpers，覆盖 multi-editable draft。

### 不做

不新增：

- published fake HTML exercise
- `/__e2e__` route
- learner route test bypass
- mock server

完整 learner-route HTML tab E2E在首个真实 HTML-editable content加入时补。

Task 05 用 isolated sandbox iframe验证 HTML Runtime behavior/security。

## 14. Accessibility

- tabs有合理 role/aria/keyboard行为。
- format aria-label反映语言：`格式化 CSS` / `格式化 HTML`。
- 保留 CodeMirror Esc -> Tab 可访问行为。
- 切换 active file后可正常 focus。

## 15. 验证

```bash
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

## 16. Acceptance Criteria

- [ ] @codemirror/lang-html加入。
- [ ] narrow shared CodeMirror shell已抽。
- [ ] CSS swatch/formatter仍 CSS-specific。
- [ ] HTML formatter使用 prettier/plugins/html。
- [ ] embeddedLanguageFormatting关闭。
- [ ] WorkspaceEditor只展示 editable files。
- [ ] LessonPanel / MDX Activity / progressive hints / Action Bar 产品行为无回归。
- [ ] Preview viewport controls 在 Editor 重构后仍可用。
- [ ] activePath不持久化。
- [ ] multi-file draft切换不丢 content。
- [ ] 不要求跨 tab保留 per-file EditorState。
- [ ] zero editable不会 crash。
- [ ] 当前 CSS UX/format/undo/swatch无回归。
- [ ] 没有 UniversalEditor/LanguageRegistry。
- [ ] 没有为了测试污染 production content/route。
