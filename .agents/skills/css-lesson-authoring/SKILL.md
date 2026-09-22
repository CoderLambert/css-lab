---
name: css-lesson-authoring
description: >
  Create, revise, or review CSS Lab curriculum content under content/courses.
  Use when adding CSS modules, lessons, or exercises, turning provided source files into
  grounded curriculum, reviewing lesson quality, or scaffolding/migrating authoring files.
  Use deterministic scripts for context inspection, scaffolding, order migration, and source-pack
  validation. Do not use for learner UI, runtime, Workspace, MDX component
  implementation, or M6A architecture work.
---

# CSS Lesson Authoring

Use this Skill for CSS curriculum authoring only.

The core rule is:

> If a step is structural and deterministic, use the script. Use model reasoning only for teaching design and authored content.

Do not hand-create structural files when the provided scaffolder can create them safely.

## Modes

This Skill supports two modes.

### Create

Use when the user wants a new Module, Lesson, or Exercise, including when source files are provided.

### Review

Use when the user wants an existing Lesson/Exercise audited for factual accuracy, teaching quality, checker quality, source grounding, or repository contract compliance.

Do not modify content in Review mode unless the user asks for fixes.

---

# Required references

Read only what is needed for the task.

Always read:

- `references/content-contract.md`
- `references/lesson-design.md`

When exercises are involved, also read:

- `references/exercise-design.md`
- `references/checker-guidelines.md`

When source files or a source pack are supplied, also read:

- `references/source-grounding.md`

The repository's `AGENTS.md` remains authoritative for project-wide rules.

---

# Deterministic tools

All scripts live in:

```text
.agents/skills/css-lesson-authoring/scripts/
```

## Inspect curriculum context

Before creating or substantially revising a Lesson, run:

```bash
node .agents/skills/css-lesson-authoring/scripts/inspect-context.mjs \
  --course <course-slug> \
  --module <module-slug>
```

For an existing Lesson:

```bash
node .agents/skills/css-lesson-authoring/scripts/inspect-context.mjs \
  --course <course-slug> \
  --module <module-slug> \
  --lesson <lesson-slug>
```

Use the returned order/status/context instead of inferring it manually.

## Scaffold a Module

Use the deterministic scaffolder instead of hand-writing new Module metadata:

```bash
node .agents/skills/css-lesson-authoring/scripts/scaffold.mjs module \
  --course <course-slug> \
  --slug <module-slug> \
  --id <stable-id> \
  --title "<title>" \
  --description "<description>"
```

The script validates the parent Course, slug, repository-wide stable-ID uniqueness, order availability, and overwrite protection. It creates only `module.json` plus `lessons/`; new Modules default to `draft`.

Stable IDs, titles, descriptions, and curriculum position are semantic decisions supplied by the caller. Do not let the model batch-create Module metadata by hand.

## Reorder existing Modules or Lessons

Existing sibling order migrations must use:

```bash
node .agents/skills/css-lesson-authoring/scripts/reorder.mjs module \
  --course <course-slug> \
  --orders '{"module-a":1,"module-b":2}' \
  --dry-run
```

or:

```bash
node .agents/skills/css-lesson-authoring/scripts/reorder.mjs lesson \
  --course <course-slug> \
  --module <module-slug> \
  --orders '{"lesson-a":1,"lesson-b":2}' \
  --dry-run
```

Review the dry-run plan, then rerun without `--dry-run` to apply it.

The reorder tool validates current sibling orders and the final mapping before writing. It changes only `order`; stable `id`, `slug`, `status`, and other metadata must remain unchanged. Do not manually renumber existing Module/Lesson JSON when this tool covers the migration.

## Scaffold a Lesson

After the teaching plan is coherent, use:

```bash
node .agents/skills/css-lesson-authoring/scripts/scaffold.mjs lesson \
  --course <course-slug> \
  --module <module-slug> \
  --slug <lesson-slug> \
  --id <stable-id> \
  --title "<title>" \
  --minutes <positive-integer> \
  --description "<description>"
```

The script:

- validates parent Course/Module
- validates slug
- rejects duplicate stable IDs
- computes the next order unless `--order` is supplied
- rejects order collisions
- refuses overwrite
- creates a draft Lesson
- creates `lesson.json`, valid `lesson.mdx`, and `exercises/`

Stable IDs are semantic decisions. The script deliberately requires `--id` instead of inventing one.

## Scaffold an Exercise

```bash
node .agents/skills/css-lesson-authoring/scripts/scaffold.mjs exercise \
  --course <course-slug> \
  --module <module-slug> \
  --lesson <lesson-slug> \
  --slug <exercise-slug> \
  --id <stable-id> \
  --title "<title>" \
  --prompt "<prompt>"
```

The script creates a draft Exercise with the current v1 asset layout and refuses overwrite.

Do not manually renumber existing exercises to make a new Exercise fit. Use explicit `--order` only when the teaching sequence requires it and no collision exists.

## Inspect a reusable source pack

```bash
node .agents/skills/css-lesson-authoring/scripts/inspect-source-pack.mjs \
  --manifest <path/to/source-pack.json>
```

Do this before reading source-pack files.

The script validates:

- manifest shape
- source IDs
- source roles
- path containment
- supported text extensions
- regular files
- UTF-8
- byte size
- SHA-256

It does not decide what the sources mean. That remains an authoring/reasoning task.

---

# Create workflow

## 1. Inspect context

Run `inspect-context.mjs`.

Read the current Module and, when relevant, the neighboring Lessons so the new Lesson does not repeat or skip prerequisites.

## 2. Inspect sources when supplied

If the user provides accessible files directly, read them as the active source set.

If the user provides a reusable `source-pack.json`, run `inspect-source-pack.mjs` first and then read the relevant source files.

Do not require a source pack when the user simply provides files for a one-off authoring task.

## 3. Build a teaching plan before writing files

Internally establish:

- prerequisites
- learning outcome
- mental model
- likely misconceptions
- Lesson flow
- Exercise objectives
- checker strategy

If the requested experience cannot be expressed with the existing `Concept / Predict / Compare / Exercise` primitives, stop and report the capability gap. Do not invent a new MDX component.

If the checker DSL cannot validate the real objective reliably, stop and report the checker capability gap. Do not use a misleading proxy.

## 4. Scaffold deterministic structure

Use `scaffold.mjs` for new Module/Lesson/Exercise structure and `reorder.mjs` for existing Module/Lesson order migration.

Do not manually create structural metadata, directory skeletons, orders, or draft statuses when the scripts cover the operation.

## 5. Author the Lesson

Replace scaffold TODO content.

Use only approved MDX primitives.

Do not add H1, imports, exports, raw JSX, or arbitrary JavaScript.

Keep MDX Exercise references aligned with canonical `exercise.order`.

## 6. Author Exercises

For every Exercise:

- keep fixture minimal
- keep answer properties out of `base.css`
- choose starter state based on what the learner already knows
- create progressive hints
- create declarative checks
- write `solution.css` only as authoring reference

Review checks against equivalent valid solutions.

## 7. Validate repository contracts

Run:

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm test:authoring-skill
pnpm lint
pnpm build
```

If learner-visible behavior changed, also run:

```bash
pnpm test:e2e
```

Do not report completion while a required gate fails.

---

# Source-grounded create workflow

When files are the basis for the Lesson:

1. validate/inspect the source set
2. extract grounded claims
3. derive learning outcomes and misconceptions
4. design the teaching flow
5. design Exercise objectives
6. scaffold files
7. author content in CSS Lab's own teaching voice
8. validate checker semantics
9. run repository gates
10. report source coverage

Do not copy source prose into learner content as a shortcut.

Do not silently resolve material contradictions between sources.

At completion, report which source IDs/paths informed the main concepts and exercises.

---

# Review workflow

For an existing Lesson:

1. run `inspect-context.mjs`
2. read `lesson.json`, `lesson.mdx`, and referenced Exercises
3. if source files are supplied, review factual claims against those sources
4. check teaching progression and misconceptions
5. check progressive hints
6. check checker semantics and equivalent valid solutions
7. run repository validation relevant to the review
8. report findings by severity

Use:

- Critical — learner content is structurally broken, unsafe, or cannot function
- Major — factual/teaching/checker error likely to mislead or reject valid work
- Minor — maintainability, clarity, or consistency issue

Do not give a generic “looks good” verdict without checking the concrete contract.

---

# Boundaries

This Skill must not:

- redesign learner UI
- modify Preview/runtime protocol
- add new MDX Activity components
- implement M6A
- introduce Exercise v2
- invent Checker Registry/Matcher DSL
- add CMS/database/auth infrastructure
- auto-publish newly scaffolded content
- silently overwrite existing curriculum files

New content is scaffolded as `draft`.

Promotion to `published` is a deliberate authoring/review decision after validation.
