# Task 05 — Execution Snapshot、Browser Runtime Boundary 与 Message Protocol

## 目标

让 Browser Runtime 从 CSS-specific props 中解耦，统一消费 Execution Snapshot；同时保持当前 CSS hot update 和 checker 行为。

## 开始前读取

```text
src/features/exercise/components/preview-frame.tsx
src/features/exercise/lib/preview-document.ts
src/features/exercise/lib/preview-messages.ts
src/features/exercise/lib/check-state.ts
src/features/learning/components/preview-panel.tsx
src/features/learning/components/learning-workspace.tsx
src/lib/workspace/execution-snapshot.ts
e2e/learner-runtime.spec.ts
```

## 1. 目录边界

现在已经存在 Browser Runtime 这一真实独立概念，可以移动：

```text
preview-frame.tsx
preview-document.ts
preview-messages.ts
```

到类似：

```text
src/features/exercise/runtime/browser/
  components/browser-runtime-frame.tsx
  lib/browser-document.ts
  lib/browser-messages.ts
```

具体层级可根据 import 简洁度微调。

不要创建：

```text
runtime/worker
runtime/typescript
RuntimeRegistry
RuntimeFactory
```

空目录也不要建。

## 2. Browser Runtime 输入

Browser Runtime component/API 不再接受：

```text
html
baseCss
css
```

应该接受：

```text
runtimeDefinition
executionSnapshot
checkRequest
onCheckResult
```

Browser Runtime 不得依赖：

- React draft setter
- ProgressStore
- StarterWorkspace
- editable flag
- solution
- node/fs paths

Runtime 看到的是 logical Workspace path + language + content。

## 3. Browser document construction

根据：

```text
runtime.entry
executionSnapshot.files
```

构建 srcDoc。

M6A 规则：

- entry 必须是 HTML。
- 使用 entry HTML content 作为 document body/source 基础。
- 所有 CSS file 按 Workspace declaration order 注入。
- 不根据 filename 猜 `base.css` / `style.css` 特殊角色。
- locked/editable 已在 snapshot 前合并，Runtime 不应知道。

### CSS injection

每个 CSS file 应有稳定 runtime-owned style element，建议通过 logical path 建立标识。

必须保留 CSS cascade 顺序。

不要把 CSS content直接未经 closing-tag escaping插进 `<style>`；保留现有 `</style` escape 防护。

## 4. HTML document语义

当前 fixture 是 body fragment，不是完整 HTML 文档。

M6A 初始内容迁移后可继续把 `starter/index.html` 定义为 HTML fragment，并由 Browser Runtime 外包完整 document shell。

不要在本阶段突然要求作者为所有 exercise 写完整 `<!doctype html><html>...`。

在代码/文档中明确 `runtime.entry` 的当前语义是 learner document body markup/source fragment，除非实现选择已完整支持 full document parsing。

保持实现简单、一致。

## 5. editable HTML 的 JS execution 安全边界

这是本任务的高风险部分。

iframe 仍需要 runtime checker bridge script，因此保留：

```html
sandbox="allow-scripts"
```

不得增加：

```text
allow-same-origin
```

但 learner-editable HTML 不能因此偷偷获得 JS execution。

必须加入 runtime-owned CSP/nonce 策略或等价强约束：

- Runtime bridge script 使用 runtime 生成 nonce。
- CSP `script-src` 只允许带该 nonce 的 runtime-owned script。
- learner HTML 中普通 `<script>` 不执行。
- inline event handler（例如 onclick）不执行。
- `javascript:` URL 不应成为 learner JS execution 绕过。

不要用脆弱 regex “删除 script 标签”作为唯一安全机制。

未来真正的 JavaScript Browser Lab 会由 Browser Runtime 显式注入 learner JS；不要在 M6A 偷偷提前支持。

## 6. Message source 命名

替换：

```text
css-lab-parent
css-lab-preview
```

为：

```text
lab-host
lab-runtime
```

平台 lifecycle message 推荐：

```text
runtime:ready
```

Checker：

```text
check:run
check:result
```

CSS：

```text
css:update
```

## 7. CSS update payload

为了多 CSS file：

```ts
{
  source: "lab-host",
  type: "css:update",
  path: "style.css",
  content: "..."
}
```

Runtime bridge 必须：

- validate source
- validate type
- validate path/content shape
- 只更新 runtime 已建立的 CSS style element
- 不因 arbitrary path 创建新 DOM node

## 8. CSS hot update

保持当前性能/UX：

- CSS content变化不重建 iframe。
- 只 postMessage 更新对应 style element。
- 多 CSS file 可分别更新。
- runtime ready 后 host 要同步最新 CSS snapshot，避免初始化 race。

## 9. HTML update

M6A 不增加 `html:update`。

当 entry HTML content变化：

1. 创建新 ExecutionSnapshot。
2. Browser Runtime 生成新的 srcDoc。
3. iframe reload。
4. runtime ready 后重新同步当前 CSS（如 srcDoc已包含全部 CSS，则避免重复造成顺序变化）。
5. 旧 check request/result 必须被正确失效。

这是有意的简单实现。

以后只有确认 HTML hot patch UX 真有问题再加 `html:update`。

## 10. Checker

当前 style/exists/count 继续在 Browser sandbox DOM 上执行。

不要重构成 universal Checker registry。

但 `CheckResult` 应从 Browser message protocol 中解耦为 exercise/checker-neutral结果类型；message payload 引用该类型。

Browser checker 当前仍只处理现有三类 Check。

## 11. Check snapshot race

当前代码捕获：

```text
requestId + code
```

M6A 必须升级成：

```text
requestId + captured ExerciseDraft / execution identity
```

点击 Check 时：

- 捕获当前 draft。
- 该 draft 生成当前 snapshot。
- 发送 check request。

之后任何 editable file change：

- active check 失效。
- 旧 result 到达不得 mark completed。

check 通过时 persistence 保存的是“实际被检查通过的 captured draft”，不是 result 到达时可能已变化的最新 state。

这是 correctness requirement，不只是 UI optimization。

## 12. event validation

继续保留：

- parent window 校验 `event.source`
- iframe side 校验 `event.source === window.parent`
- message object shape validation
- source field validation
- requestId matching

不要只信 `event.data.type`。

## 13. Preview naming

用户可见文案可继续叫 Preview。

代码中平台 runtime 类型应逐步用 BrowserRuntime，而不是继续把所有 Browser 执行概念叫 CSS Preview。

iframe title 可更新为更中性但仍可访问的，例如：

```text
Exercise preview
```

若修改 title，必须同步 E2E locator。

## 14. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

新增/更新 E2E 至少覆盖：

- CSS edit 实时更新且 iframe 不因每次 CSS key stroke reload。
- checker 仍通过。
- HTML edit 会更新 preview。
- learner HTML 的 script/inline handler 不获得执行能力。
- stale check result 不会完成已修改后的 draft。

## 15. Acceptance Criteria

- [ ] Browser Runtime 有独立目录边界。
- [ ] Runtime 只消费 runtime definition + execution snapshot。
- [ ] 不再接受 fixtureHtml/baseCss/css 三特殊 props。
- [ ] CSS 按 declaration order 注入。
- [ ] 多 CSS path 可定向 hot update。
- [ ] source 改为 lab-host/lab-runtime。
- [ ] CSS update 保留具体领域命名。
- [ ] HTML 修改通过 rebuild，不存在提前设计的 html:update。
- [ ] editable HTML 不开放 arbitrary learner JS。
- [ ] CheckResult 不再属于 Browser protocol domain。
- [ ] captured draft correctness 有自动化覆盖。
