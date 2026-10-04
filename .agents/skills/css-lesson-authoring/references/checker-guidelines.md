# Checker Authoring Guidelines

The checker exists to validate the learning objective, not to force a single code spelling unless that exact syntax is the lesson objective.

Before creating checks, ask:

1. What behavior or source fact proves mastery?
2. Does the current checker DSL express it accurately?
3. Are there semantically equivalent valid solutions?
4. Could an incorrect solution pass accidentally?
5. Could a correct solution be rejected?

## Current DSL

The current shared checker supports:

- `style`
- `rule-style`
- `layout-contained`
- `exists`
- `count`

Do not create per-exercise custom JavaScript. `viewport-style` is not implemented in the current production contract; historical source-branch implementations are not current-runtime evidence.

## Evidence boundaries

`style` reads the computed/resolved value on a learner-fragment element. It can prove a fixture outcome, not which selector, unit, function, or cascade mechanism the learner authored.

`exists` and `count` inspect learner-fragment descendants, not the runtime shell or its CSS slots. Use them only when structure is part of the objective.

`rule-style` inspects the browser CSSOM declarations of one explicitly selected Workspace CSS file. It can prove source-level selector/value/priority/order facts. It does not prove cascade victory, layout geometry, viewport activation, or actual hover/focus interaction.

`layout-contained` measures horizontal border-box containment in a strict ancestor's content box in the current captured, static Browser snapshot. It does not prove authored syntax, vertical containment, paint/occlusion, scrolling behavior, or responsiveness across viewports.

If the real objective is geometric or behavioral and the current DSL cannot validate it reliably, report a checker capability gap. Do not substitute a convenient but incorrect proxy.

## File-scoped rule-style contract

```json
{
  "id": "authored-width",
  "type": "rule-style",
  "path": "style.css",
  "selector": ".target",
  "property": "width",
  "equals": "2rem",
  "priority": "normal",
  "message": "请在 style.css 的 .target 规则中使用 width: 2rem，且不使用 !important"
}
```

`path` is required and is a declared Workspace path, not an OS path or a `starter/` asset path. Exercise v2 validation requires it to reference an **editable CSS file**. This keeps locked setup CSS from certifying learner work without passing editable metadata into the Runtime. Do not guess the last CSS file or hard-code the filename in runtime logic.

Other fields retain the source-check behavior:

- `selector`: exact browser `CSSStyleRule.selectorText`. A selector list or an equivalent selector is not automatically interchangeable. Syntax is validated, but the selector need not currently match a DOM element; this permits authored pseudo-state rules.
- `property` and `equals`: compare the trimmed CSSOM declaration value, not computed pixels or original raw bytes. Browser serialization can normalize whitespace, values and shorthand/longhand representations. This is not a raw-source spelling checker.
- `alsoAccepts`: optional alternative serialized values. Use only when they preserve the objective; accepting pixels would invalidate a check intended to teach `rem`.
- `media`: optional exact `CSSMediaRule.conditionText`, with outer whitespace trimmed and repeated whitespace collapsed. Omitted means top-level style rules only. Provided means direct style-rule children of matching top-level media blocks, regardless of whether the condition is currently active. Nested conditions, CSS nesting, `@supports`, and `@layer` are not flattened or certified by this version.
- `priority`: optional `normal` or `important`. Omitted leaves declaration priority unconstrained. This inspects the selected declaration, not the complete cascade.
- `afterSelector`: the selected declaration must occur after the last occurrence of that exact reference selector in the same file and selected media scope. A missing reference fails. It does not compare across files or prove selector specificity.

For repeated matching selectors, the last rule that declares the property supplies its value, priority and position. A later matching rule with only unrelated properties does not erase it. This deliberately describes authored source order, not the winning CSS cascade declaration; pair it with `style` when the rendered outcome matters.

Only the runtime's captured reference for the selected Workspace slot is inspected. Other files, inline style attributes, learner-inserted style tags, and fake `data-workspace-path` attributes are not source evidence for that check. CSS-only updates are read afresh on the next captured check request.

## Horizontal layout-contained contract

```json
{
  "id": "avatar-fits-frame",
  "type": "layout-contained",
  "selector": ".avatar",
  "within": ".frame",
  "axis": "x",
  "message": "头像需要有实际显示尺寸，且不能超出容器内容区的水平范围"
}
```

All fields are required. `axis` is exactly `x`; there is no configurable tolerance, viewport size, property, source path, or arbitrary callback. Schema, host and iframe reject unknown fields.

Both selectors must identify exactly one ordinary HTML element among learner-root descendants; the container must be a strict ancestor of the target. The runtime shell/root/style slots are not selectable targets. Missing targets return `target-not-found`; ambiguous/invalid selectors return `checker-error`; self/non-ancestor relationships return `mismatch`.

The target border box and container must have finite, positive actual width and height and one box fragment each. Left and right target edges must lie between the container border edges minus its resolved border/padding lengths, with a fixed **0.5 CSS px** tolerance on each side. Width-only comparison is insufficient: a margin can move a small enough element outside the container. Measurements use fractional CSS pixels, not rounded clientWidth or a hard-coded answer such as 154px.

The first version deliberately supports only static, untransformed `horizontal-tb` boxes. The target-to-document ancestor chain is inspected, including body/html because learner CSS can style them without making them valid checker targets. Explicit `hidden`, display:none, non-visible visibility, zero opacity or content-visibility:hidden fails as `mismatch`. Empty/zero boxes fail, and fragmented boxes are unsupported. Transforms (including individual translate/rotate/scale), perspective, motion paths, zoom, non-horizontal writing, non-visible overflow, nonzero scroll offsets, fixed/sticky, columns, tables, content-visibility:auto, filters/masks/clipping and animations/transitions are rejected as `checker-error`. Animations in the learner subtree are also unsupported. These conservative rejections are not a general visibility or paint oracle; occlusion and arbitrary painted content are outside this contract.

Failures remain ordinary per-check results rather than throwing out the entire check request. `expected` and `actual` contain readable intervals or a specific reason; `diagnostic.property` is null because this is not a CSS-property equality assertion. Captured CSS is dispatched by the existing host immediately before checking, with unchanged generation/request identities. The helper neither reads Progress/solutions nor enables learner JavaScript.

The first consuming Exercise is `debug-fixed-width-failure`. It combines authored width/cap checks, a narrow horizontal-containment sample and a second locked wide sample where the used width must remain 320px. The reference solution stays unchanged; the locked HTML/base fixture gains the second context inside revision 2 so common fixed-pixel or more-specific overrides cannot pass merely by matching the narrow sample. Exercise schemaVersion, stable ID, Workspace/DB contracts and draft status remain unchanged. New layout support alone does not approve the whole Lesson for publication.

The measurement boundary follows CSSOM View's transformed border-box/fragment semantics and CSSOM's resolved padding values. This is why transformed or fragmented scenes cannot use the simple subtraction algorithm.

## Combination patterns and anti-proxy review

**Authored mechanism plus outcome:** use `rule-style` for `width: 2rem`, then `style` for the expected computed width in a controlled fixture. Computed `32px` alone cannot prove use of `rem`.

**Preferred width plus available-space cap:** use `rule-style` for the preferred width and percentage cap, then combine a narrow `layout-contained` assertion with a wider locked context whose computed width still equals the preferred width. A single narrow used size is too easy to reproduce with a fixed-pixel cascade override. Multi-context evidence still does not prove the absence of every deliberately fixture-specific selector; the goal is to reject reasonable alternative mechanisms without building a general cascade engine.

**Selector strategy plus match boundary:** use `rule-style` for the intended selector, then positive and negative `style` checks for target and non-target outcomes. Final appearance alone cannot prove a combinator or selector strategy.

**Pseudo-state rule:** source-check `.target:hover` or `.target:focus-visible`, but use Preview observation for actual interaction/modality. An authored rule is not evidence that keyboard focus works correctly.

**Media-scoped rule:** source-check the conditional declaration, but do not claim responsive behavior from source alone. Follow the Post-M6B roadmap's course-driven geometry/layout work before viewport matrix; neither a single layout check nor a few future samples proves continuous responsiveness or breakpoint rationale.

Use `priority: "normal"` when an `!important` workaround defeats the lesson, and `afterSelector` when preserving the conflicting/reference rule is part of the objective. Do not force source constraints unrelated to the learning claim.

`style.alsoAccepts` remains available for equivalent computed values. For either style checker, review every alternative against false positives rather than broadening acceptance to hide an unreliable test.

## Diagnostics

- `matched`: the requested source fact, computed/structural outcome, or supported horizontal containment matches.
- `target-not-found`: the requested source file/selector is absent, or a DOM/layout selector has no learner-fragment target.
- `mismatch`: the source constraint is wrong, or the supported layout fails containment, positive-size, explicit-visibility or ancestry requirements.
- `checker-error`: invalid/ambiguous layout selector, unsupported layout scene, or runtime/CSSOM/measurement fault.

Malformed packets are rejected at the schema/host/iframe boundaries; they are not learner failures. Keep existing result diagnostics (`selector`, `property`) and generation/request identity checks.

Messages should describe the requirement and selected source file or layout relationship, not merely say “wrong answer”.
