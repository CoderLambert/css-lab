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
- `exists`
- `count`

Do not create per-exercise custom JavaScript.

`style.alsoAccepts` is a transitional compatibility capability for equivalent computed values. Treat the behavior as important; do not assume the current field shape is permanent.

## Check category

Use a style check when the lesson explicitly trains a CSS property/value and computed style is a faithful proxy.

Use structural checks for required selectors/elements only when structure is part of the objective.

If the real objective is geometric or behavioral and the current DSL cannot validate it reliably, stop and report a checker capability gap. Do not substitute a convenient but incorrect proxy.

## Diagnostics

Design checks so learner-facing feedback can distinguish:

- learner mismatch
- missing selector / content problem
- checker/runtime fault

Messages should describe the requirement, not merely say “wrong answer”.
