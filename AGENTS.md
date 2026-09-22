# CSS Lab — Project Context

CSS Lab is an interactive CSS learning platform. Preserve the existing Next.js 16 / React 19 / TypeScript / Tailwind / Zod / idb architecture and small explicit feature boundaries.

## Content contract

Content is file-backed under `content/courses/<course>/modules/<module>/lessons/<lesson>/...`. UI never reads filesystem paths directly. Disk records flow through strict schemas and `FileContentReader`.

Course, Module, and Lesson metadata use schemaVersion 1. Exercise metadata uses schemaVersion 2. All entities use stable id, mutable slug, positive order, and status `draft | published`; Exercise also has positive revision.

Lesson teaching remains `lesson.json` + `lesson.mdx` with the generated MDX registry and Concept/Predict/Compare/Exercise contract. `exercise.order` is canonical learner order.

## Exercise assets

```text
exercise.json
starter/
  index.html
  base.css
  style.css
solution/
  style.css
```

Current CSS curriculum keeps `index.html` and `base.css` locked and `style.css` editable. Workspace declaration order is significant. `solution/` is server-only authoring/reference source and must never enter learner runtime Exercise/client props.

Use `.agents/skills/css-lesson-authoring/SKILL.md` and its scaffolder for curriculum authoring structure. Do not hand-maintain a second v1 asset layout.

## Runtime and security

Preview uses a sandboxed iframe. Do not support learner JavaScript in M6A. Do not use eval/new Function. Keep typed postMessage validation and `sandbox="allow-scripts"` without `allow-same-origin`.

Filesystem access is server-only. File-backed content readers/inspectors must enforce canonical content-root containment, no descendant symlink traversal, and regular-file final targets.

## State

Use smallest state scope. Learner progress uses async ProgressStore + idb and revision boundary. Persistence failure must not break Editor/Preview/Checker/Reset.

## Scope

Do not expand CSS Lab into a generic IDE. No npm/WebContainer/arbitrary packages/collaboration/auth/database/cloud sync/CMS unless explicitly required. M6A does not implement JavaScript or TypeScript runtime.

## Verification

Before completing code work run fast relevant checks:
```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
```
Content/MDX changes must keep generated registry idempotent. Full E2E is required before merge review even when deliberately deferred during active development.
