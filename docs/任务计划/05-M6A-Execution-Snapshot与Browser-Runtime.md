# Task 05 — Execution Snapshot、Browser Runtime、Protocol 与 HTML Security

## 目标

完成真正的 Browser Runtime boundary：

```text
ExerciseWorkspace + Draft
→ ExecutionSnapshot
→ BrowserRuntimeDefinition + ExecutionSnapshot
→ sandboxed iframe
→ Browser DOM Checker
```

同时保证：

- CSS edit 不 reload iframe。
- HTML content change rebuild document。
- learner HTML 无 arbitrary JavaScript execution。
- Runtime 不知道 editable/Progress/solution/filesystem。

这是 M6A 技术风险最高的阶段，禁止自由发挥。

## 0. PreviewPanel UX 与 Runtime implementation 分层

MDX Learning Flow v1 已把 Preview 定义为正式产品 shell：

```text
Resizable Preview Panel
→ bounded canvas
→ Browser viewport
→ Check results / progressive hints
```

Task 05 可以彻底替换 `PreviewFrame / preview-document / preview-messages` 的底层 Runtime，但必须保留：

- PreviewPanel resize relationship。
- bounded canvas。
- `Auto / 390 / 768 / 1280` viewport presets 与缩放行为。
- Browser chrome/viewport 呈现能力。
- Check results 区域。
- progressive hints 区域及其独立于 Runtime 的 state。

目标是把新的 BrowserRuntimeFrame 嵌入现有 PreviewPanel 产品壳，而不是重做 Preview UX。

## 1. 开始前读取

```text
src/lib/workspace/*
src/features/exercise/components/preview-frame.tsx
src/features/exercise/lib/preview-document.ts
src/features/exercise/lib/preview-messages.ts
src/features/exercise/lib/check-state.ts
src/features/learning/components/preview-panel.tsx
src/features/learning/components/learning-workspace.tsx
e2e/learner-runtime.spec.ts
```

确认 Task 04 是否存在临时 CSS Preview adapter。

## 2. Runtime 目录边界

把 Browser-specific preview实现移动到明确目录，例如：

```text
src/features/exercise/runtime/browser/
  components/
    browser-runtime-frame.tsx
  lib/
    browser-document.ts
    browser-messages.ts
    browser-security.ts
```

可按 import简洁度微调，但 Browser-specific代码必须聚合。

不要创建空：

```text
runtime/worker
runtime/typescript
toolchain/typescript
```

不要创建 RuntimeRegistry / RuntimeFactory。

## 3. Browser Runtime public input

不再接受：

```text
html
baseCss
css
```

接受语义：

```ts
interface BrowserRuntimeFrameProps {
  runtime: BrowserRuntimeDefinition;
  snapshot: ExecutionSnapshot;
  checkRequest: CheckRequest | null;
  onCheckResult(result: CheckResultMessage): void;
}
```

Runtime不得依赖：

- ExerciseDraft
- StarterWorkspace
- editable
- ProgressStore
- solution
- Node fs path

Runtime只看 logical path/language/content。

## 4. Runtime fail-closed capability

M6A Browser Runtime只接受：

```text
html
css
```

snapshot若包含 `javascript/typescript`：

- 不注入。
- 不执行。
- 开发环境给明确 invariant error。
- 不悄悄 ignore 后继续产生误导 preview。

Studio会标记 authoring error；Runtime仍 defense-in-depth。

## 5. Browser document identity：必须写死

禁止：

```ts
useMemo(
  () => createBrowserDocument(snapshot),
  [snapshot],
)
```

因为 snapshot每次 CSS input都会变，导致 iframe每个 keystroke reload。

### srcDoc 只能依赖

```text
entry HTML content
ordered CSS logical paths
runtime bridge implementation/version
fresh document nonce
```

**CSS content不得成为 srcDoc dependency。**

RuntimeFrame从 snapshot派生：

```text
entryHtml
cssFiles = ordered [{ path, content }]
cssTopology = ordered [path]
```

document rebuild条件：

- entry HTML content改变。
- CSS path/order topology改变。
- runtime entry改变。
- component/revision remount。

CSS content变化只能 postMessage。

## 6. CSS slots

srcDoc head按 declaration order建立空 slots：

```html
<style data-workspace-path="base.css"></style>
<style data-workspace-path="style.css"></style>
```

不要根据 filename猜 base/user/starter/locked。

Runtime只认 path + order。

### runtime:ready 后同步全部 CSS

收到合法 `runtime:ready` 后，按当前 snapshot的 CSS顺序发送：

```ts
{
  source: "lab-host",
  type: "css:update",
  path,
  content,
}
```

style slots DOM order固定，所以更新 textContent不会改变 cascade order。

单个 CSS edit只发送对应 path。

iframe未 ready期间 CSS多次变化，不 replay历史；ready后发送最新 snapshot。

## 7. Message protocol

source：

```text
lab-host
lab-runtime
```

types：

```text
runtime:ready
css:update
check:run
check:result
```

### CssUpdate

```ts
interface CssUpdateMessage {
  source: "lab-host";
  type: "css:update";
  path: WorkspacePath;
  content: string;
}
```

iframe bridge：

- path必须对应已存在 CSS slot。
- unknown path不能创建新 slot。
- content必须 string。

### Ready

只有收到：

```ts
{
  source: "lab-runtime",
  type: "runtime:ready"
}
```

才标记 runtime ready。

**iframe onLoad 不能代表 runtime ready。**

onLoad只负责重置：

```text
isReady = false
sentCheckRequestId = null
```

随后等待 bridge message。

## 8. postMessage targetOrigin

iframe：

```html
sandbox="allow-scripts"
```

没有 `allow-same-origin`，因此 runtime document是 opaque origin。

M6A中：

```ts
postMessage(message, "*")
```

是有意设计，不要擅自换 host origin。

Host validation：

1. `event.source === iframe.contentWindow`
2. message object
3. `source === "lab-runtime"`
4. type/shape validator
5. requestId match

Iframe validation：

1. `event.source === window.parent`
2. `source === "lab-host"`
3. type/shape validator

不要只检查 type。

## 9. HTML entry语义

`runtime.entry` 当前定义为：

> HTML fragment mounted into runtime-owned document shell。

不要要求完整 `<!doctype html><html>...` content。

Runtime-owned shell负责：

- doctype/html/head/body
- CSP
- CSS slots
- learner root
- runtime bridge

## 10. learner HTML 不能 raw-concat 到 srcDoc body

旧模式：

```html
<body>
  ${html}
  <script>bridge</script>
</body>
```

HTML editable后禁止继续。

新模式：

```html
<!doctype html>
<html>
  <head>
    <!-- CSP + CSS slots -->
  </head>
  <body>
    <div id="learner-root"></div>
    <script nonce="...">
      // runtime-owned bridge
      // safely decode learnerHtml
      // parse into template
      // apply M6A DOM security policy
      // mount learner-root
      // post runtime:ready
    </script>
  </body>
</html>
```

learner HTML用安全 JS-string serialization嵌入 runtime-owned nonce script：

- 使用 `JSON.stringify` 或等价。
- 至少把 `<` escape为 `\u003c`。
- 处理 U+2028/U+2029。
- learner content不能闭合 runtime script tag。

禁止 raw template interpolation。

## 11. HTML security：sandbox + CSP + DOM policy

### 11.1 Sandbox

继续：

```html
sandbox="allow-scripts"
```

禁止加入：

```text
allow-same-origin
allow-forms
allow-popups
allow-top-navigation
```

bridge需要 script，因此保留 allow-scripts。

### 11.2 Per-document random nonce

每次 document rebuild生成新 nonce。

要求：

- 使用 Web Crypto `crypto.getRandomValues` 或等价 secure source。
- 至少 128-bit random material。
- 不用固定字符串。
- HTML每次修改触发 rebuild时必须新 nonce。
- 不跨 document generation复用。

Runtime-owned bridge script带 nonce。

### 11.3 CSP

在 runtime-owned head最前部加入 CSP meta。

策略至少等价：

```text
default-src 'none'
script-src 'nonce-<runtime-nonce>'
style-src 'unsafe-inline'
object-src 'none'
frame-src 'none'
base-uri 'none'
form-action 'none'
connect-src 'none'
```

若当前真实 content需要 data image，可最小增加 `img-src data:`。

禁止：

```text
script-src 'unsafe-inline'
script-src *
connect-src *
```

### 11.4 Runtime DOM policy

bridge：

```js
const template = document.createElement("template");
template.innerHTML = learnerHtml;
```

mount前至少处理：

#### 删除 executable/container elements

```text
script
iframe
object
embed
base
```

#### 删除 meta refresh

删除 `<meta http-equiv="refresh" ...>`，comparison大小写不敏感。

#### 删除 inline handlers

遍历 element attributes，移除名称以 `on` 开头的 attribute，大小写不敏感。

例如 onclick/onload/onerror。

#### 删除 javascript URLs

至少检查：

```text
href
src
xlink:href
formaction
```

对 value trim并移除 ASCII control/whitespace obfuscation后判断 scheme；`javascript:` -> 移除 attribute。

不要把单个 regex当全部安全机制。

#### 阻止 learner navigation

bridge在 capture phase：

- 阻止 learner-root 内 anchor navigation。
- 阻止 form submit。

结合：

- sandbox无 allow-forms。
- CSP form-action none。
- base-uri none。
- frame/object none。

防止 learner markup替换 runtime document为任意可执行页面。

这套 policy只属于当前 HTML/CSS Browser Runtime；未来 JS Browser Lab会显式采用不同策略，不抽成通用 sanitizer framework。

## 12. runtime:ready 时序

bridge顺序：

1. 建立 message listener。
2. decode learner HTML。
3. template parse + DOM security policy。
4. mount `#learner-root`。
5. 安装 navigation guards。
6. post `runtime:ready`。

Host收到 ready时：

- learner DOM已存在。
- checker可运行。
- CSS slots已存在。

## 13. HTML update

M6A不定义 `html:update`。

entry HTML变化：

```text
new ExecutionSnapshot
→ new entryHtml
→ new document generation
→ new nonce
→ new srcDoc
→ iframe reload
→ runtime:ready
→ sync latest CSS
```

任何旧 check：

- active request失效。
- iframe generation重置 sent request id。
- 旧 result不能完成 exercise。

## 14. CheckResult 与 structured diagnostics

M6A 要把公共 check outcome 与 Browser-specific diagnostics 分层，但**不能**退化 MDX v1 已验证的 learner feedback。

公共语义建议：

```ts
export type CheckOutcomeReason =
  | "matched"
  | "mismatch"
  | "target-not-found"
  | "checker-error";

export interface CheckResult {
  id: string;
  message: string;
  passed: boolean;
  reason: CheckOutcomeReason;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
}
```

Browser checker detail 可单独表达：

```ts
export interface BrowserCheckDiagnostic {
  selector: string | null;
  property: string | null;
}

export interface BrowserCheckResult extends CheckResult {
  diagnostic: BrowserCheckDiagnostic | null;
}
```

具体字段名可以调整，但以下语义是 hard requirement：

- learner mismatch 与 checker/runtime fault 必须可区分。
- selector/target not found 有独立语义，不能被显示成普通属性值 mismatch。
- learner UI 继续能显示 expected / actual。
- Browser style diagnostics 继续能显示 selector/property。
- 公共 result 不依赖 `Check["type"]`。
- Browser-specific detail 不强迫未来 Worker/TypeScript checker 采用 DOM 字段。

当前 `StyleCheck.alsoAccepts` 可以在 M6A 继续作为 transitional schema；Runtime checker 必须继续接受 canonical `equals` + 语义等价 alternatives。不要在本阶段引入 matcher registry/DSL 重构。

## 15. Check snapshot race

当前 `requestId + code` 升级为 `requestId + captured ExerciseDraft`。

流程：

1. Check点击时 capture当前 immutable draft。
2. captured draft生成 snapshot。
3. checkRequest发送当前 runtime generation。
4. 任意 editable file change -> active check失效。
5. result必须 requestId match。
6. passed时持久化 captured draft。

禁止“旧 snapshot通过，却保存已经变更的新 draft”。

## 16. Isolated Browser Runtime E2E

不新增产品测试 route。

Playwright test直接 import纯 builder/message helpers：

1. Node side生成 srcDoc。测试可传 fixed nonce；production必须随机。
2. `page.setContent` 建 parent page。
3. 动态建 sandbox iframe。
4. 设置 srcdoc。
5. 等待 runtime:ready。
6. 发送 css:update/check。
7. 使用 frame locator检查 DOM/computed style。

至少验证：

- learner HTML正常 mount。
- ordered CSS slots工作。
- CSS update不需要 iframe rebuild。
- `<script>` 不执行。
- onclick等 handler不执行。
- javascript URL不执行/不导航。
- meta refresh被 neutralize。
- iframe/object/embed无效。
- unknown CSS path不会生成 slot。
- forged source/message被忽略。

fixed nonce只允许 test。

## 17. Current learner E2E

继续真实 CSS Exercise：

- CSS typing实时更新。
- CSS typing过程中 iframe generation不变化。
- checker仍通过。
- reload恢复 Progress。
- completion正确。

验证“不 reload”应使用稳定 generation marker/iframe identity，而不仅看最终样式。

## 18. 删除 Task 04 temporary adapter

完成 Runtime切换后全局删除仅为旧 Preview存在的 `draft.files["style.css"]` adapter。

历史 v1 migration里的 `style.css` hardcode合法。

## 19. 验证

```bash
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

## 20. Acceptance Criteria

- [ ] Browser Runtime独立目录。
- [ ] public input只有 runtime definition + ExecutionSnapshot + checker contract。
- [ ] JS/TS snapshot fail closed。
- [ ] srcDoc dependency不含 CSS content。
- [ ] CSS slots按 declaration order。
- [ ] runtime:ready后同步最新全部 CSS。
- [ ] CSS edit不 reload iframe。
- [ ] HTML edit rebuild document。
- [ ] iframe onLoad不等于 ready。
- [ ] source为 lab-host/lab-runtime。
- [ ] postMessage("*") opaque-origin理由保留。
- [ ] learner HTML不 raw-concat。
- [ ] nonce每 document generation随机。
- [ ] CSP不开放 unsafe JS。
- [ ] script/event/javascript URL/navigation有 defense-in-depth。
- [ ] CheckResult与 Browser definition type解耦。
- [ ] structured diagnostics 无回归：mismatch / target-not-found / checker-error 可区分，expected/actual 与 Browser selector/property 仍可展示。
- [ ] style check 多个语义等价 accepted values 仍可通过。
- [ ] PreviewPanel bounded canvas / viewport presets / hints UX 未因 Runtime 重写退化。
- [ ] captured draft race正确。
- [ ] isolated runtime/security E2E通过。
- [ ] current CSS learner E2E无回归。
