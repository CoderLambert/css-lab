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
- `viewport-style`
- `exists`
- `count`

Do not create per-exercise custom JavaScript.

`alsoAccepts` is available on style-like checks for bounded equivalent property values. Treat the accepted behavior as important; do not assume it makes selectors, media conditions, declaration priority, geometry, or arbitrary CSS expressions semantically equivalent.

## Evidence boundaries

### `style`

Use `style` when a computed/resolved style on the live fixture is faithful evidence of the objective.

Good examples:

- final `display` value
- an inherited/computed result
- a basic declaration outcome where the authored spelling is not itself the lesson

Do not use a computed pixel result alone to prove that the learner authored `rem`, `em`, `%`, `calc()`, `fr`, `auto`, a custom-property linkage, a particular selector, or another source-level mechanism.

### `rule-style`

Use `rule-style` when the bounded authored rule is itself part of the learning objective.

Good examples:

- a specific selector or combinator when that exact authored form is intentionally required
- a pseudo-class rule such as `:hover` / `:focus-visible`
- a relative unit, `calc()`, `var()`, Grid track expression, or logical auto margin
- a declaration inside a known media condition

The current runtime reads learner CSS through CSSOM and compares:

- `CSSStyleRule.selectorText` exactly
- authored property value against `equals` / `alsoAccepts`
- media condition after whitespace normalization when `media` is supplied
- declaration priority when optional `priority: "normal" | "important"` is supplied
- a bounded source-order relation when optional `afterSelector` is supplied

Therefore `rule-style` does **not** prove:

- selector-list or media-query semantic equivalence across different spellings/orderings
- declaration priority when the check omits the optional `priority` field
- source-order relations when the check omits `afterSelector`; `afterSelector` itself uses exact selectorText matching
- final geometry, line formation, scrolling, or paint order
- real pointer/keyboard modality

Do not add an exact source check when it would reject reasonable equivalent solutions that the learner-facing objective claims to allow.

### `viewport-style`

Use `viewport-style` when one supported deterministic viewport width should produce a specific computed style outcome.

It is useful for verifying that an authored conditional rule actually changes the computed result at known sample widths.

It does **not** prove:

- behavior at all intermediate widths
- actual line wrapping or geometry
- that the chosen breakpoint was derived from content pressure
- arbitrary device behavior

The fixture must still make the responsive mechanism causally observable.

### `exists` / `count`

Use these only when selector existence or match count is part of the objective. They do not prove CSS styling semantics.

## Combination patterns

Prefer multiple complementary checks when mastery spans more than one evidence layer.

### Authored mechanism + resolved outcome

```text
rule-style -> prove the source mechanism
style      -> prove the resolved fixture result
```

Example: require `width: 2rem`, then verify the fixture resolves it to the intended computed width.

### Selector strategy + match boundary

```text
rule-style -> prove the intended authored selector when exact syntax is part of the objective
style      -> prove target elements receive the effect
style      -> prove a non-target remains unchanged
```

Before using an exact selector check, consider valid equivalent selectors and CSSOM serialization.

### Responsive conditional rule

```text
rule-style(media=...) -> prove the authored conditional declaration
viewport-style        -> prove a fixed-width computed outcome
Preview/Predict       -> teach geometry, wrapping, and breakpoint rationale
```

Do not treat three sampled viewport widths as continuous responsive proof.

## Anti-proxy review

Before accepting a checker plan, ask whether an incorrect solution could still pass by:

- hard-coding the resolved pixel result
- targeting fixture helper classes instead of the selector strategy being taught
- deleting the declaration conflict that creates a cascade lesson
- making competing declarations identical
- adding `!important` when a cascade exercise failed to assert `priority: "normal"`
- writing an unrelated declaration that happens to produce the same fixture result

Also ask whether a correct solution could be rejected because the checker requires one arbitrary selector/media/value spelling.

If the real geometric, behavioral, or equivalence objective cannot be validated reliably with the current DSL, redesign the activity so the machine-checkable subset remains truthful and the uncheckable prediction/observation is explicit. If that is not possible, report a checker capability gap rather than substituting a convenient but incorrect proxy.

## Diagnostics

Design checks so learner-facing feedback can distinguish:

- learner mismatch
- missing selector / content problem
- checker/runtime fault

Messages should describe the requirement, not merely say “wrong answer”.
