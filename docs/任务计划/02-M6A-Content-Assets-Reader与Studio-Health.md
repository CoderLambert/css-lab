# Task 02 — Content Assets、ContentReader 与 Studio Content Health

## 目标

把现有 CSS-only asset convention 迁移为 Workspace asset convention，并保证 learner domain 永远拿不到 solution。

## 开始前读取

```text
src/lib/content/file/file-content-reader.ts
src/lib/content/file/file-utils.ts
src/lib/content/reader.ts
src/lib/content/types.ts
src/features/studio/lib/content-health.ts
src/app/studio/page.tsx
content/courses/**
e2e/studio-content-health.spec.ts
```

## 1. 当前 Exercise asset 迁移

每个现有 exercise：

```text
exercise.json
fixture.html
base.css
starter.css
solution.css
```

迁移成：

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

不要创建 `support/`。

现有三个 Exercise stable id、slug、order、revision 保持不变；这只是表示层迁移，不应仅因目录布局变化 bump revision。

## 2. exercise.json 升级

所有当前 exercise 改为 schemaVersion 2。

Workspace 对当前 CSS exercise 统一声明：

```json
"workspace": {
  "files": [
    {
      "path": "index.html",
      "language": "html",
      "editable": false
    },
    {
      "path": "base.css",
      "language": "css",
      "editable": false
    },
    {
      "path": "style.css",
      "language": "css",
      "editable": true
    }
  ]
},
"runtime": {
  "type": "browser",
  "entry": "index.html"
}
```

必须保持顺序：

```text
index.html
base.css
style.css
```

其中 CSS injection 的 declaration order 后续会影响 cascade。

## 3. FileContentReader hydration

`readExercise()` 不再固定读取三个文件名。

正确逻辑：

1. 读取并 validate `exercise.json`。
2. 遍历 `record.workspace.files`。
3. 对每个 path 读取 `starter/<path>`。
4. hydrate 成：
   - WorkspaceDefinition
   - StarterWorkspace.files
5. 返回 solution-free Exercise。

概念结果：

```ts
exercise.workspace = {
  definition: {
    files: record.workspace.files
  },
  starter: {
    files: {
      "index.html": "...",
      "base.css": "...",
      "style.css": "..."
    }
  }
}
```

ContentReader 只做读取 + hydration，不做 learner published visibility policy。

## 4. 防目录穿越

因为 path 来自 content metadata，文件读取前仍必须通过 WorkspacePath schema。

禁止直接：

```ts
join(starterRoot, uncheckedPath)
```

只有经过 path validation 的 logical path 可以进入 join。

保持 OS path 与 Workspace logical path 两个概念分离。

## 5. Solution 必须采用独立 server-only inspection

不要把 solution 添加到 `Exercise`。

不要实现：

```ts
interface Exercise {
  solutionFiles: ...
}
```

也不要在 learner route 上再 omit。

推荐新建窄的 source inspection，例如：

```text
src/lib/content/file/file-content-source-inspector.ts
```

或命名等价、边界明确的 server-only 文件。

它只为 Studio 提供 authoring/source facts，例如：

```ts
interface ExerciseAssetInspection {
  starterPaths: readonly string[];
  solutionPaths: readonly string[];
}
```

不要把它扩展成第二个完整 ContentReader。

## 6. Studio Health 新规则

保留现有：

- stable ID
- duplicate order
- published chain
- empty lesson body
- empty checks
- duplicate check id

移除旧的 `empty-fixture` 概念。

新增 Workspace rules：

- duplicate workspace path -> error
- invalid workspace path -> error
- declared starter file missing -> error
- undeclared starter file -> error
- language/path mismatch -> error
- zero editable files -> published error / draft warning
- browser entry missing -> error
- browser entry not HTML -> error
- current Browser exercise contains JS/TS executable file -> error
- 当前 M6A Browser exercise 多个 HTML 文件 -> error

### 为什么多个 HTML 当前阻止

M6A 只有一个 Browser document entry，尚未定义 multi-page navigation/resource semantics。不要默默支持无法正确执行的额外 HTML。

## 7. Solution completeness

定义：

```text
editablePaths = WorkspaceDefinition 中 editable=true 的 path 集合
solutionPaths = solution/ 下所有受支持文本文件 path 集合
```

要求：

```text
solutionPaths === editablePaths
```

因此：

- editable file 缺 solution -> error
- solution 存在 locked file 对应 path -> error
- undeclared solution path -> error

当前 CSS exercise 的 solution 只应有：

```text
solution/style.css
```

不要复制 `index.html` / `base.css`。

## 8. Undeclared starter file

需要检查 `starter/` 实际文件集合。

若作者放入：

```text
starter/debug.css
```

但 exercise.json 未声明，应报 error，而不是让 reader/runtime无声忽略。

递归扫描应只用于 content authoring inspection，不要由 learner runtime 自己扫描文件系统。

## 9. Studio loading failure

当前 Studio 已能在 ContentReader throw 时显示 Content load failed。保留这一行为。

如果某类 health issue 可以在不让 Reader 崩溃的情况下报告，应优先 health issue；但 schema JSON 无法解析、声明文件缺失等 reader hard error 是否转为 inspector issue，需要保持实现简单，不能为此重写完整 content loading pipeline。

至少保证正常迁移后的 content health 为 0 blocking / 0 warnings。

## 10. E2E 更新

更新 `e2e/studio-content-health.spec.ts`，保留原有意图：

- Studio 正常打开。
- 3 个 exercise。
- 0 blocking issues。
- 0 warnings。
- learner link 数量仍为 3。
- 第一个 learner href 不变。

若 UI 展示 Workspace metadata，可增加稳定、非脆弱的断言；不要依赖纯样式 class。

## 11. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

同时人工检查 Git diff，确认旧文件：

```text
fixture.html
base.css
starter.css
solution.css
```

已被正确迁移而非同时保留两份 source of truth。

## 12. Acceptance Criteria

- [ ] 当前三个 exercise 已迁移到 starter/solution。
- [ ] fixture 概念从 content runtime domain 消失。
- [ ] base.css 是 locked workspace file，不是 support asset。
- [ ] solution 只覆盖 editable paths。
- [ ] FileContentReader 基于 metadata hydrate starter workspace。
- [ ] learner-facing Exercise 无 solution。
- [ ] Studio 能验证 starter/solution file set。
- [ ] Studio 当前为 0 blocking / 0 warning。
- [ ] learner URL/stable ID/revision 未因 asset relocation 改变。
