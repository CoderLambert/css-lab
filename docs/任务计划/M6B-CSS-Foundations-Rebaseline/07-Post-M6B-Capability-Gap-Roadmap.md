# Post-M6B — Capability Gap Roadmap

> 本文不是 M6B implementation scope。它记录审计后应如何选择下一平台 milestone，避免 rebaseline 完成后直接无序扩张。

## 1. 已知课程驱动的真实 gaps

CSS Foundations v1 source branch 最终审核登记了以下真实缺口：

| Capability | 主要课程需求 | 当前影响 |
| --- | --- | --- |
| source-aware CSS validation | selector strategy、cascade/value strategy、media query authored intent、debugging | resolved style 能验证结果，但不能证明 learner 写法 |
| geometry/layout validation | intrinsic sizing、spacing、Flex wrapping/free-space、Grid、positioning | declaration proxy 不足以证明最终 layout |
| pseudo-state validation | hover/focus/focus-visible | 静态 snapshot 不能验证 interaction state |
| scroll-state validation | sticky/fixed behavior | 需要 deterministic scroll scenario |
| paint/stacking validation | stacking context / z-index | computed style 不能证明真实 occlusion/paint order |
| multi-viewport validation | responsive CSS / capstone | 单 preview state 不能证明 viewport matrix |
| authored Grid track validation | fr/repeat/track semantics | resolved outcome 不能证明 authored track intent |

这些 gaps 来自真实课程设计，不是为了“平台化”而发明的抽象需求。

## 2. 建议的后续顺序

### Phase A — Checker Evidence v2

优先解决可覆盖最多 draft content 的通用 evidence：

1. source-aware CSS inspection。
2. deterministic geometry/layout assertions。
3. viewport matrix。

原则：

- 优先扩展现有 declarative Checker DSL。
- 不引入 per-exercise JavaScript checker。
- 不建立 CheckerRegistry。
- 需要 CSS source parsing 时使用受控 parser/AST，而不是 eval。

### Phase B — Interaction / Scroll / Paint

在有真实 blocked Lessons 时分别实现：

- controlled pseudo-state。
- deterministic scroll container。
- paint/occlusion observation。

这些能力安全模型不同，不要强塞进一个 generic browser automation checker。

### Phase C — Publication batches

每新增 checker capability：

1. 只解锁对应 Lessons。
2. re-run source/curriculum review。
3. 把 READY 的 draft content 分 batch promotion 到 published。
4. 完整 learner E2E 覆盖新增 published chain。

不要一次性把 31 draft Lessons 全 publish。

## 3. Editable HTML

M6A 已实现 editable HTML，但 CSS Foundations v1 当前 Learner Contract 不要求 learner author HTML。

因此：

- 不为平台证明而修改 CSS Foundations 课程边界。
- 第一个真实需要 editable HTML 的课程/Exercise 出现时，再补：
  - HTML tab edit
  - CSS tab edit
  - multi-file persistence
  - Reset All
  - captured check
  - HTML generation lifecycle E2E

## 4. JavaScript / TypeScript

JS/TS 不应作为 CSS checker gap 的解决方式。

后续独立 milestone 才考虑：

~~~text
JavaScript Worker Runtime
→ JavaScript Browser Runtime
→ TypeScript Toolchain
→ TypeScript no-runtime/type-check workflow
~~~

第二 runtime 出现前必须先设计新的 content compatibility boundary；不能静默扩展 current Exercise v2 让旧 v2 rollback code 无法理解新 runtime。

## 5. 仍需跟踪的工程治理项

这些不是 CSS Foundations rebaseline 的核心功能，但审计已发现：

- main branch protection / ruleset 缺失。
- product shell 当前没有显式 site-level security headers。
- Playwright 当前仅 Chromium。

处理原则：

- branch protection 优先作为 release governance 修复。
- security headers 在部署策略明确后单独审计，不与 iframe CSP 混为一谈。
- Firefox/WebKit 优先添加 focused smoke coverage；不要机械把全部 E2E 三倍复制。

## 6. 非目标

后续 capability work 仍不应自动引入：

- generic IDE。
- arbitrary VFS。
- terminal。
- npm / WebContainer。
- plugin registry。
- global event bus。
- auth/cloud sync/CMS。
- AI tutor。

每项平台扩展必须由已存在的真实课程 outcome 驱动。
