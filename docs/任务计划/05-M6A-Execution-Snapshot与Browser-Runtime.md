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
interface BrowserCheckRequest {
  requestId: string;
  checks: readonly Check[];
  snapshot: ExecutionSnapshot; // click 时 captured snapshot
}

interface BrowserRuntimeFrameProps {
  runtime: BrowserRuntimeDefinition;
  snapshot: ExecutionSnapshot; // live preview snapshot
  checkRequest: BrowserCheckRequest | null;
  onCheckResult(result: CheckResultMessage): void;
}
```

`checkRequest.snapshot` 与 live `snapshot` 分开是有意设计：checker 必须验证点击 Check 那一刻的 immutable input，不能依赖之后 React render/effect 的当前值。

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
exactly one HTML file
+
zero or more CSS files
```

并且：

- `runtime.entry` 必须存在。
- entry 必须是唯一 HTML file。
- 任何非 entry 的 HTML file -> fail closed。
- snapshot若包含 `javascript/typescript` -> fail closed。
- unknown language / duplicate path / topology invariant violation -> 不注入、不执行、不继续产生看似正常的 preview。
- 开发环境给明确 invariant error；production 至少进入不可执行/不可检查的安全失败状态。

Studio会提前标记 authoring error；Runtime仍承担 defense-in-depth，不能把“Studio 会报错”当执行前置条件。

## 5. Browser document identity：必须写死

禁止：

```ts
useMemo(
  () => createBrowserDocument(snapshot),
  [snapshot],
)
```

因为 snapshot每次 CSS input都会变，导致 iframe每个 keystroke reload。

### srcDoc / document descriptor 只能依赖

```text
entry HTML content
ordered CSS logical paths
runtime entry
runtime bridge implementation/version
fresh document generationId
fresh document nonce
```

**CSS content不得成为 srcDoc dependency。**

`generationId` 与 CSP nonce 是两个不同概念：

- `generationId`：Runtime protocol identity，用于拒绝 stale document messages；不是 security secret。
- `nonce`：CSP script authorization token，必须 cryptographically random。
- 每次 document rebuild 两者都更新。
- CSS-only edit 两者都不能变化。

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
- runtime bridge version改变。
- component/revision remount。

每次 rebuild 建立新的 immutable document descriptor：

```ts
{
  generationId,
  nonce,
  srcDoc,
  entryHtml,
  cssTopology,
}
```

具体 React 实现可调整，但不能在普通 CSS render 中无条件重新生成 generation/nonce。

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

收到**当前 generation** 的合法 `runtime:ready` 后，按当前 live snapshot 的 CSS顺序发送：

```ts
{
  source: "lab-host",
  type: "css:update",
  generationId,
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
  generationId: string;
  path: WorkspacePath;
  content: string;
}
```

iframe bridge：

- path必须对应已存在 CSS slot。
- unknown path不能创建新 slot。
- content必须 string。

### Generation identity

四类 runtime messages 都必须携带 `generationId`：

```text
runtime:ready
css:update
check:run
check:result
```

document bridge 内嵌它所属的 generationId，并只接受相同 generationId 的 host message。

Host 只接受等于当前 document descriptor generationId 的 iframe message。

不能只依赖：

```text
event.source === iframe.contentWindow
```

因为 iframe document navigation/rebuild 前后的消息仍可能经过同一个 WindowProxy。generationId 用来区分 old/new document generation。

### Ready

只有收到：

```ts
{
  source: "lab-runtime",
  type: "runtime:ready",
  generationId
}
```

且 `generationId === currentGenerationId` 才标记 runtime ready。

**iframe onLoad 不能代表 runtime ready，也不能在 load 时无条件把已经收到的 current-generation ready 清掉。**

readiness reset 必须绑定 **document descriptor / generationId change**：

```text
new document generation
→ reset readyGenerationId
→ reset sentCheckRequestId
→ install/render new srcDoc
→ wait current-generation runtime:ready
```

`onLoad` 可以不处理，或只用于 diagnostics。不要依赖 `onLoad -> reset -> ready message` 的事件顺序，因为 child `postMessage(runtime:ready)` 与 iframe load 的调度顺序不应成为 correctness 前提。

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
5. `generationId === currentGenerationId`
6. 对 check result 再验证 requestId match

Iframe validation：

1. `event.source === window.parent`
2. `source === "lab-host"`
3. type/shape validator
4. `generationId === embeddedGenerationId`

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

#### Runtime-owned DOM references / clobbering

在 mount learner HTML **之前**，runtime bridge 必须直接保存：

- learner root element reference。
- ordered CSS style element references / path -> element Map。
- 其他 runtime-owned control references。

mount 后更新 CSS/DOM 时使用这些已捕获 reference，不通过 `window.<id>`、named property、`document.getElementById` 或 learner 可碰撞 selector 重新获取 runtime-owned nodes。

learner HTML 即使声明：

```html
<div id="learner-root"></div>
<style data-workspace-path="style.css"></style>
<input name="...">
```

也不能覆盖/劫持 runtime-owned root、CSS slot 或 bridge state。

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

### 11.5 Browser checker selector scope

M6A 必须明确区分：

```text
runtime-owned document shell
!=
learner-authored fragment
```

当前 Browser DOM check 的 selector 只允许解析 learner fragment 的后代节点。以下 runtime-owned nodes 永远不能成为 `style / exists / count` 的匹配结果，也不能影响 count：

- `html / head / body` shell。
- `#learner-root` wrapper本身。
- runtime-owned CSS `<style data-workspace-path>` slots。
- bridge/control nodes。

实现必须基于 mount 前捕获的 learner-root reference查询，并显式排除 root本身；不能继续直接使用 `document.querySelector()` / `document.querySelectorAll()` 运行 content checks。

因此 M6A checker contract中：

- authoring selector应指向 learner fragment内的元素。
- 仅命中 runtime shell的 `html/body/:root/style/#learner-root/[data-workspace-path]` 不构成 learner match。
- 无 learner match -> `target-not-found`。
- invalid selector语法 -> `checker-error`。
- CSS仍可按正常 cascade影响 runtime-owned `html/body` shell，但现有 DOM checker不把 shell暴露为验收 target；未来如果真实课程需要验证 document shell，应新增显式 checker capability，而不是放宽默认查询范围。

这条边界同时防止 runtime wrapper/CSS slots让 `exists` 意外通过或让 `count` 产生 off-by-one。

## 12. runtime:ready 时序

bridge顺序：

1. 建立 message listener。
2. decode learner HTML。
3. template parse + DOM security policy。
4. mount `#learner-root`。
5. 安装 navigation guards。
6. post 带当前 `generationId` 的 `runtime:ready`。

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
- stale generation 的 ready/result 全部忽略。
- 旧 document 即使迟到发送 message，也不能让 Host 对它发送新 check。
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
- `target-not-found` 有独立语义，不能退化成普通属性值 mismatch，但也不能在 Runtime 中一律判成 checker fault。
- Runtime 不知道 Workspace editability；它只报告 `target-not-found` + Browser diagnostics。
- Learning Shell 结合 Workspace metadata解释：有 editable HTML 时，target missing 可能是 learner DOM mismatch；HTML 全 locked 时，当前 M6A 中更可能是 content/check configuration issue。
- `checker-error` 始终作为明确 checker/runtime fault。
- learner UI 继续能显示 expected / actual。
- Browser style diagnostics 继续能显示 selector/property。
- 公共 result 不依赖 `Check["type"]`。
- Browser-specific detail 不强迫未来 Worker/TypeScript checker 采用 DOM 字段。

当前 `StyleCheck.alsoAccepts` 可以在 M6A 继续作为 transitional schema；Runtime checker 必须继续接受 canonical `equals` + 语义等价 alternatives。不要在本阶段引入 matcher registry/DSL 重构。

## 15. Check snapshot race

当前 `requestId + code` 升级为：

```text
requestId
+
captured ExerciseDraft
+
captured ExecutionSnapshot
+
current document generationId
```

流程：

1. Check点击时 capture当前 immutable draft。
2. 立即由 captured draft生成 captured snapshot，并放入 BrowserCheckRequest；不要在 Runtime effect 中重新从“当前 draft”生成。
3. 若 captured snapshot 的 entry HTML / CSS topology 与当前 document generation 不一致，不能在旧 generation 上执行；先等待/触发正确 document rebuild，或使 request失效。
4. 当前 generation ready 后，**先按 captured snapshot 顺序同步该 snapshot 的全部 CSS**。
5. 在同一 host→iframe message sequence 中，CSS updates 全部发送完成后再发送 `check:run`。
6. 不依赖“live CSS effect 应该已经先执行”这种 React effect 时序假设。
7. iframe 对同一 source/window 的消息按发送顺序处理，因此 checker看到的是 captured snapshot 的 CSS。
8. 任意 editable file change -> active check失效。
9. result必须同时满足 current `generationId` + active `requestId`。
10. passed时持久化 captured draft。

禁止：

- “旧 snapshot通过，却保存已经变更的新 draft”。
- “刚输入最后一个字符立即点击 Check，但 checker 读到上一帧 CSS”。
- stale document ready 后收到新的 check request。

## 16. Isolated Browser Runtime E2E

不新增产品测试 route。

Playwright test直接 import纯 builder/message helpers：

1. Node side生成 srcDoc。测试可传 fixed nonce + fixed generationId；production nonce必须随机，generationId必须每 document generation 唯一。
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
- exactly-one-HTML topology；第二个 HTML / JS / TS snapshot fail closed。
- stale generation `runtime:ready` 被忽略。
- current-generation ready 不会被随后发生的 iframe `load` handler错误清空。
- stale generation `check:result` 即使 requestId看似合法也被忽略。
- wrong-generation host message 被 iframe忽略。
- CSS edit 后立即 Check，checker读取到 captured snapshot 的最新 CSS。
- learner DOM clobbering（重复 id/name/data-workspace-path）不能替换 runtime-owned root/CSS slot。
- `exists("style")` 不能因 runtime CSS slots意外通过。
- `count("div")` 不包含 learner-root wrapper，只计算 learner fragment后代。
- `style/exists/count` selector不能命中 runtime-owned `html/head/body/#learner-root/data-workspace-path` nodes。
- invalid selector返回 `checker-error`，learner subtree中找不到目标返回 `target-not-found`。
- `<script>` 不执行。
- onclick等 handler不执行。
- javascript URL不执行/不导航。
- meta refresh被 neutralize。
- iframe/object/embed无效。
- learner HTML remote resource与 learner CSS `url()` / `@import` 不产生 HTTP(S) network request；测试应使用 request interception/计数证明 CSP egress boundary，而不只检查最终 DOM。
- unknown CSS path不会生成 slot。
- forged source/message被忽略。

fixed nonce只允许 test。

## 17. Current learner E2E

继续真实 CSS Exercise：

- CSS typing实时更新。
- CSS typing过程中 iframe generation不变化。
- HTML/document rebuild 后 generationId变化。
- CSS最后一次编辑后立即点击 Check，结果对应最后一次输入。
- checker仍通过。
- reload恢复 Progress。
- completion正确。

验证“不 reload”应使用稳定 generation marker/iframe identity，而不仅看最终样式。

## 18. 删除 Task 04 temporary adapter

完成 Runtime切换后全局删除仅为旧 Preview存在的 `draft.files["style.css"]` adapter。

历史 v1 migration里的 `style.css` hardcode合法。

## 19. 验证

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

## 20. Acceptance Criteria

- [ ] Browser Runtime独立目录。
- [ ] public input只有 runtime definition + ExecutionSnapshot + checker contract。
- [ ] Browser topology fail closed：恰好一个 entry HTML，其余仅 CSS；第二 HTML/JS/TS/unknown topology不执行。
- [ ] srcDoc dependency不含 CSS content。
- [ ] generationId 与 CSP nonce职责分离，document rebuild时都更新，CSS-only edit时都保持。
- [ ] CSS slots按 declaration order。
- [ ] runtime:ready后同步最新全部 CSS。
- [ ] CSS edit不 reload iframe。
- [ ] HTML edit rebuild document。
- [ ] iframe onLoad不等于 ready，且不会覆盖已经合法收到的 current-generation ready；readiness reset只由 generation change驱动。
- [ ] source为 lab-host/lab-runtime。
- [ ] 所有 Runtime messages 带 generationId；Host/iframe 双向拒绝 stale/wrong generation。
- [ ] postMessage("*") opaque-origin理由保留。
- [ ] learner HTML不 raw-concat。
- [ ] nonce每 document generation随机。
- [ ] CSP不开放 unsafe JS。
- [ ] CSP阻断 learner HTML/CSS 的 HTTP(S) network egress，并有 request-level自动化覆盖。
- [ ] script/event/javascript URL/navigation有 defense-in-depth。
- [ ] runtime-owned root/CSS slot使用 mount 前捕获 reference，learner DOM clobbering不能劫持。
- [ ] Browser checker只查询 learner fragment后代；runtime shell、learner-root wrapper与CSS slots不能被 `style/exists/count` 命中或计数。
- [ ] checker scope isolation、invalid selector与target-not-found语义有自动化覆盖。
- [ ] CheckResult与 Browser definition type解耦。
- [ ] structured diagnostics 无回归：mismatch / target-not-found / checker-error 可区分，expected/actual 与 Browser selector/property 仍可展示。
- [ ] style check 多个语义等价 accepted values 仍可通过。
- [ ] PreviewPanel bounded canvas / viewport presets / hints UX 未因 Runtime 重写退化。
- [ ] captured draft/snapshot race正确。
- [ ] check:run 前显式按 captured snapshot 同步 CSS，不依赖 live React effect 时序。
- [ ] stale generation ready/result 与“最后一次 CSS 编辑后立即 Check”均有自动化覆盖。
- [ ] isolated runtime/security E2E通过。
- [ ] current CSS learner E2E无回归。
