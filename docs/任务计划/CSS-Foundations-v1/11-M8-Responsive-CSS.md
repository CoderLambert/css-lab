# Task 11 — M8 Responsive CSS

## 1. Module goal

建立：

```text
available space / intrinsic constraints
→ flexible layout
→ environment condition
→ selective rule change
```

Responsive CSS 不等于“记住手机/平板/桌面 breakpoint”。

Module：

```text
responsive-css
```

Prerequisite：

- M3 sizing。
- M5 Flexbox。
- M6 Grid。

---

## 2. Source grounding

优先：

- Media Queries specification。
- CSS Values / Sizing relevant sources。
- MDN Responsive Design。
- MDN media queries。
- Flex/Grid responsive patterns only as derived application, not copied recipes。

如果讨论 viewport unit / mobile viewport behavior，必须按当前 authoritative source 查证，不用陈旧移动端口诀。

---

## 3. Batch plan

```text
Batch A
  fluid-sizing-and-responsive-constraints
  media-queries-and-breakpoints

Batch B
  responsive-layout-strategies
  full multi-viewport manual/automated feasibility review
```

---

## 4. Lesson — fluid-sizing-and-responsive-constraints

Mental model：

> responsive behavior 优先来自 flexible constraints / intrinsic layout；media query 不是第一步。

Scope：

- percentage / relative sizing回顾。
- max/min constraints。
- Flex/Grid natural flexibility。
- images/content constraints if fixed fixture allows。
- avoid device-specific recipe。

Misconceptions：

- responsive = 写 media query。
- 每个 viewport 都需要独立 CSS。
- fixed pixel 一定不 responsive。
- relative unit 自动解决所有 responsive problem。

Exercises：

1. rigid width → fluid constraint。
2. max-width / available space。
3. Flex/Grid layout that adapts without breakpoint。

Checker：

single viewport resolved style 无法证明多 viewport responsive behavior。

Fit：NEEDS_CHECKER_CAPABILITY。

---

## 5. Lesson — media-queries-and-breakpoints

Mental model：

> media query 是条件性规则选择；breakpoint 应由 content/layout need 驱动，而不是设备品牌表。

Scope：

- width condition。
- mobile-first baseline。
- min-width / max-width semantics。
- source order/cascade with media query。
- prefers-* 不在 core，除非 Task 01 扩展。

Misconceptions：

- iPhone/iPad 固定 breakpoint。
- mobile-first = 先写 390px。
- media query 条件命中就忽略 cascade。
- breakpoint 越多越专业。

Exercises：

1. one breakpoint change。
2. mobile-first override。
3. debugging media condition/cascade。

Checker：

需要同一 Exercise 在多个 deterministic viewport 执行 checks 才能可靠验收。

Fit：NEEDS_CHECKER_CAPABILITY。

---

## 6. Lesson — responsive-layout-strategies

Mental model：

> responsive design 是 constraints + Flex/Grid + selective media queries 的组合策略。

Outcome：

learner 能：

- 判断何时布局可以自然适应。
- 判断何时需要 breakpoint。
- 在 390 / 768 / 1280 preview 上观察同一实现。
- 避免按设备写三份布局。

Exercises：

1. responsive flex component。
2. grid track/layout adaptation。
3. breakpoint only where layout breaks。
4. integrated component。

Fit：NEEDS_CHECKER_CAPABILITY。

---

## 7. Preview vs Checker finding

当前产品已经有：

```text
Auto
390
768
1280
```

因此：

- Observability：已有较好基础。
- Checkability：不足。

本 Task 不新增 runtime。

必须把未来需求写入 Capability Gap：

> 对同一 learner draft，在多个 deterministic viewport 下执行同一组/分组 checks，并能返回 viewport-specific diagnostics。

不要直接设计最终 API / schema，除非用户另开架构任务。

---

## 8. Production policy

由于 3 个 Lesson 都是 NEEDS_CHECKER_CAPABILITY：

1. 可以完成 source grounding、Lesson narrative、Predict/Compare、Exercise design。
2. draft Exercise 可以用于人工体验验证。
3. 不得因为 current preview 可手动切换，就宣称 automated mastery check 完成。
4. publication readiness 在 Task 13 单独决定。
5. 不在此 Task 顺手实现 viewport checker。

---

## 9. Acceptance Criteria

- [ ] responsive 不被降级为 media-query syntax。
- [ ] fluid sizing 在 media query 前。
- [ ] breakpoints 由 content/layout need解释。
- [ ] 390/768/1280 用于 observation，而不是硬编码 curriculum device taxonomy。
- [ ] multi-viewport checker gap 明确。
- [ ] no runtime expansion。
- [ ] draft content gates pass。
