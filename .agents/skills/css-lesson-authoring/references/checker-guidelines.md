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
- `exists`
- `count`

Do not create per-exercise custom JavaScript. `viewport-style` is not implemented in the current production contract; historical source-branch implementations are not current-runtime evidence.

## Evidence boundaries

`style` reads the computed/resolved value on a learner-fragment element. It can prove a fixture outcome, not which selector, unit, function, or cascade mechanism the learner authored.

`exists` and `count` inspect learner-fragment descendants, not the runtime shell or its CSS slots. Use them only when structure is part of the objective.

`rule-style` inspects the browser CSSOM declarations of one explicitly selected Workspace CSS file. It can prove source-level selector/value/priority/order facts. It does not prove cascade victory, layout geometry, viewport activation, or actual hover/focus interaction.

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

## Combination patterns and anti-proxy review

**Authored mechanism plus outcome:** use `rule-style` for `width: 2rem`, then `style` for the expected computed width in a controlled fixture. Computed `32px` alone cannot prove use of `rem`.

**Selector strategy plus match boundary:** use `rule-style` for the intended selector, then positive and negative `style` checks for target and non-target outcomes. Final appearance alone cannot prove a combinator or selector strategy.

**Pseudo-state rule:** source-check `.target:hover` or `.target:focus-visible`, but use Preview observation for actual interaction/modality. An authored rule is not evidence that keyboard focus works correctly.

**Media-scoped rule:** source-check the conditional declaration, but do not claim responsive behavior from source alone. Fixed-viewport sampling is the next capability task; neither source checks nor a few future samples prove continuous responsive geometry or breakpoint rationale.

Use `priority: "normal"` when an `!important` workaround defeats the lesson, and `afterSelector` when preserving the conflicting/reference rule is part of the objective. Do not force source constraints unrelated to the learning claim.

`style.alsoAccepts` remains available for equivalent computed values. For either style checker, review every alternative against false positives rather than broadening acceptance to hide an unreliable test.

## Diagnostics

- `matched`: the requested source fact or existing computed/structural outcome matches.
- `target-not-found`: the requested source file/selector in its selected media scope is absent, or an existing DOM checker cannot find its target.
- `mismatch`: a selector exists but its requested declaration is absent or has the wrong value, priority, or order.
- `checker-error`: invalid selector syntax or a runtime/CSSOM fault.

Malformed packets are rejected at the schema/host/iframe boundaries; they are not learner failures. Keep existing result diagnostics (`selector`, `property`) and generation/request identity checks.

Messages should describe the requirement and selected source file, not merely say “wrong answer”.
