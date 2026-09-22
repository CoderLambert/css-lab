---
name: css-lesson-authoring
description: >
  Create, revise, or review CSS Lab curriculum under content/courses.
  Use deterministic scripts for context inspection, scaffolding, and source-pack
  validation. Do not use for learner UI, Runtime protocol, Workspace platform
  architecture, or other platform refactors.
---

# CSS Lesson Authoring

Use this Skill for CSS curriculum authoring only. Structural deterministic work uses the scripts in `.agents/skills/css-lesson-authoring/scripts/`; model reasoning focuses on teaching design and authored content.

Always read `references/content-contract.md` and `references/lesson-design.md`. For exercises also read `references/exercise-design.md` and `references/checker-guidelines.md`. For grounded source work read `references/source-grounding.md`.

## Scaffold

Use `inspect-context.mjs` before creating or substantially revising content. Use `scaffold.mjs lesson` for Lesson skeletons and `scaffold.mjs exercise` for Exercise skeletons. Stable IDs remain caller-supplied semantic identity.

Exercise scaffold output follows the established Exercise v2 contract:

```text
exercise.json
starter/
  index.html
  base.css
  style.css
solution/
  style.css
```

New content is always `draft`. Promotion to `published` is deliberate after review/validation.

## Authoring rules

- Course/Module/Lesson remain schemaVersion 1; Exercise is schemaVersion 2.
- Keep `starter/index.html` minimal.
- Keep answer properties out of `starter/base.css`.
- Put only the learner starting point in `starter/style.css`.
- Put authoring/reference answer only in `solution/style.css`.
- Keep MDX Exercise references aligned with canonical `exercise.order`.
- Use only existing Concept/Predict/Compare/Exercise MDX capabilities.
- If platform/checker capability is missing, report it instead of extending learner UI, Workspace domain, Runtime protocol, or platform architecture from the authoring workflow.
- Do not redesign the established Exercise v2 Workspace/Runtime contract.

## Validate

Run:
```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm test:authoring-skill
pnpm lint
pnpm build
```

Run E2E when learner-visible behavior changes before merge review.
