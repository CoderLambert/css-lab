<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Front-end Lab Platform — Project Context

This repository is a focused front-end learning-lab platform. CSS Lab is the current curriculum track; JavaScript Lab and TypeScript Lab are long-term tracks, not already-implemented runtimes.

The current learner loop is:

```text
Learn a concept
→ edit author-enabled Workspace files
→ execute an immutable snapshot in the appropriate runtime
→ run checks
→ get feedback
→ continue to the next exercise
```

Current M6A production capability is content-defined HTML/CSS Workspace + Browser Runtime. Prefer simple, explicit architecture over infrastructure or generic IDE abstractions.

The application has two product areas inside one Next.js app:

- `/learn`: learner-facing course and exercise experience.
- `/studio`: local/internal content-authoring workspace. Do not split Studio into a separate app unless explicitly requested.

The content system is file-backed by design. A database, authentication system, CMS, API layer, global state library, observability stack, or other infrastructure should not be introduced unless the task explicitly requires it.

# Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui / Base UI primitives
- Zod for runtime/content validation
- idb for typed IndexedDB access
- pnpm

CodeMirror 6 is the Workspace editor foundation for the currently supported HTML/CSS editors.
Browser exercises run inside a sandboxed iframe.

Do not re-run `create-next-app`, `shadcn init`, or reinstall existing shadcn components.

# Project Structure

Use the existing boundaries:

```text
content/                        course assets and exercise source files

src/app/                        routes and server entry points
src/components/ui/              shadcn/shared UI primitives only
src/features/learning/          learner product components
src/features/exercise/          editor / preview / checker runtime
src/features/progress/          learner progress domain and IndexedDB adapter
src/features/studio/            authoring UI when implemented
src/lib/content/                content schemas, domain types and adapters
src/lib/                        small shared utilities
```

Keep business components out of `src/components/ui/`.

Do not create generic abstractions such as `UniversalEditor`, `BaseFeature`, or broad utility buckets unless multiple real use cases already exist.

# Styling Rules

Application UI uses Tailwind CSS.

`src/app/globals.css` is reserved for:

- Tailwind / shadcn setup
- design tokens
- `@theme inline` mappings
- genuinely global base rules

Do not add business-component CSS classes to `globals.css`.

Prefer semantic utilities backed by the existing tokens:

```text
bg-background
text-foreground
bg-panel
text-panel-foreground
bg-workspace
bg-editor
text-editor-foreground
bg-preview
bg-primary
text-primary-foreground
text-muted-foreground
border-border
bg-success
bg-lesson-highlight
```

Do not use physical palette utilities in product components such as:

```text
bg-green-500
text-zinc-500
border-gray-200
```

Do not hard-code visual colors with hex/rgb/oklch in JSX/TSX.

The visual direction is calm, low-saturation sage/moss green: focused, comfortable, quiet, and suitable for long learning sessions. Avoid neon, hacker-terminal styling, decorative gradients, visual noise, or marketing-page aesthetics.

Exceptions to the Tailwind-only UI rule:

1. Design-token values live in `globals.css`.
2. Third-party editor APIs such as CodeMirror may use CSS variable references through their theme API.
3. Exercise CSS source files under `starter/` and `solution/` are raw CSS because CSS itself is the subject being taught.

# shadcn/ui

Treat shadcn components as source-owned primitives.

- Shared primitives remain in `src/components/ui/`.
- Product components remain in feature folders.
- Reuse existing components before adding new ones.
- Do not install additional UI libraries without explicit need.
- Do not rewrite shadcn primitives merely to make them project-specific; compose them from feature components instead.

# Server / Client Boundaries

Use Server Components by default.

Client Components are appropriate for genuinely interactive runtime boundaries such as:

- CodeMirror
- resizable panels
- iframe messaging
- local exercise editing state

Keep the client boundary as small as practical.

Filesystem access is server-only.

- `node:fs`, `node:path`, and `FileContentReader` must never be imported by Client Components.
- File-backed content is read on the server and passed to client components as serializable runtime objects.

Do not make Server Components call internal HTTP endpoints for local application data.

# Content Domain

Content lives under:

```text
content/courses/<course>/modules/<module>/lessons/<lesson>/...
```

The application must access content through the content domain / reader abstraction. UI code must not know filesystem paths.

Disk records and runtime domain objects are separate concepts:

```text
disk JSON/files
→ Zod validation
→ FileContentReader hydration
→ runtime domain model
→ UI/runtime
```

Content JSON schemas are strict.

Every content entity has:

- `schemaVersion`
- stable `id`
- mutable `slug`
- `order`
- `status`: `draft | published`

Rules:

- Stable IDs must not change when titles or slugs change.
- Directory names must match metadata slugs.
- Runtime child entities carry parent stable IDs.
- Reader adapters read content; visibility decisions belong to consumers.
- Learner routes must explicitly reject non-`published` content.
- Studio will eventually need access to both draft and published content.

Exercises additionally have a positive integer `revision`, a declared Workspace file list and a Runtime definition. Course/Module/Lesson remain schemaVersion 1; Exercise is schemaVersion 2.

Lesson content rules:

- `lesson.json` is lesson runtime metadata; `lesson.mdx` is teaching content.
- Every direct child directory under `content/courses/<course>/modules/<module>/lessons/` is a Lesson source directory and must contain both `lesson.json` and `lesson.mdx`; missing either file is a structural error.
- `Lesson` runtime objects must not carry MDX source, compiled content, or source paths.
- Lesson MDX is compiled through the generated registry and may use only `Concept`, `Predict`, `Compare`, and `Exercise`.
- Lesson MDX must not contain imports/exports, arbitrary JavaScript expressions, raw HTML/custom JSX, or level-one headings.
- `Exercise` activities use a lesson-local `slug`, plus `label` and `goal`; do not hard-code learner absolute routes in MDX.
- `exercise.order` is the canonical learner navigation sequence. Effective learner-visible Lessons must reference every published Exercise exactly once and in that order; they must not reference draft Exercises. Draft Lessons, or Lessons hidden only because an ancestor is unpublished, may reference draft Exercises while still requiring existing, slug-matching, non-duplicate references.
- The generated registry is not edited by hand. Run `pnpm content:generate` after adding or moving lesson content, then run `pnpm content:check` before completing content changes.

# Curriculum Authoring Skill

When creating, revising, or reviewing CSS curriculum content, use the repo-level skill:

```text
.agents/skills/css-lesson-authoring/SKILL.md
```

For deterministic authoring operations, prefer the Skill scripts over hand-writing structure:

- inspect Course/Module/Lesson context with `inspect-context.mjs`
- scaffold Module/Lesson/Exercise skeletons with `scaffold.mjs`
- reorder Module/Lesson siblings with `reorder.mjs`
- migrate historical Exercise v1 assets only with the offline `scripts/content/migrate-css-foundations-v1-to-v2.mjs`; never add v1 compatibility to production readers/runtimes
- validate reusable source packs with `inspect-source-pack.mjs`

Do not bypass the scaffolder for orders, draft skeletons, duplicate-ID checks, or overwrite protection when it covers the operation. Model reasoning should focus on teaching design, lesson narrative, exercise objectives, hints, and checker semantics.

User-provided source files may be used as curriculum grounding. Follow the Skill's source-grounding workflow and never turn source text directly into exercises without deriving learning claims and outcomes first.

# Exercise Assets

The intended exercise directory is:

```text
exercise.json
starter/
  index.html
  base.css
  style.css
solution/
  style.css
```

Responsibilities:

- `starter/index.html`: initial HTML workspace file; current CSS curriculum keeps it locked.
- `starter/base.css`: fixed visual/setup CSS; current CSS curriculum keeps it locked.
- `starter/style.css`: learner-editable initial CSS.
- `solution/style.css`: authoring/reference solution for the editable workspace file.

Exercise metadata uses `schemaVersion: 2` and declares Workspace files plus a Browser runtime entry. Course/Module/Lesson metadata remain `schemaVersion: 1`.

Legacy `fixture.html` / exercise-level `base.css` / `starter.css` / `solution.css` is historical input only. Use the one-way offline M6B migrator for preserved source branches; future authoring must never create that layout.

`solution/` must never be part of the learner runtime `Exercise` type or be sent to learner client props.

Do not put answer properties into `starter/base.css`.

Workspace declaration order is runtime-significant. The current CSS curriculum keeps `index.html` and `base.css` locked and `style.css` editable, but the platform supports content marking HTML as editable. `runtime.entry` is an HTML fragment, not a complete HTML document.

# Exercise Check DSL

The current check protocol is intentionally small:

- `style`
- `exists`
- `count`

Checks are declarative content data. Do not create per-exercise custom JavaScript check functions when the shared DSL can express the requirement.

Extend the DSL only when a real exercise requires a new capability.

# Workspace, Toolchain and Runtime

Use this architecture vocabulary:

```text
Content
→ Workspace
→ optional Toolchain
→ optional Runtime
→ Checker
→ Progress / Learning Shell
```

CSS / JavaScript / TypeScript are curriculum/language domains. Browser / Worker are runtimes. A TypeScript compiler is a toolchain.

Current M6A rules:

- Workspace files are author-defined and fixed; learners cannot create/delete/rename files.
- `editable` controls learner ownership, not secrecy. Locked files are still runtime inputs and must never hide solutions.
- Progress stores learner-owned mutable Draft files only.
- `ExecutionSnapshot` combines locked starter content with the captured learner Draft in declaration order.
- Browser Runtime consumes only Runtime Definition + ExecutionSnapshot + check request; it does not read ProgressStore, editable metadata, solutions, or OS filesystem paths.
- Browser `runtime.entry` is an HTML fragment. The Runtime owns the document shell, CSP, CSS slots and bridge.
- CodeMirror has explicit HTML and CSS wrappers over a narrow shared lifecycle. Do not introduce LanguageRegistry/LanguagePlugin abstractions.
- CSS swatches and CSS formatting remain CSS-specific; HTML formatting remains HTML-specific.

Browser security/runtime rules:

- use only `sandbox="allow-scripts"`
- do not add `allow-same-origin`, forms, popups or top-navigation capability
- do not enable learner JavaScript execution until the dedicated JavaScript runtime milestone
- do not use `eval` or `new Function`
- use the typed `lab-host` / `lab-runtime` postMessage protocol
- validate `event.source`, source discriminator, shape, generationId and requestId
- generationId is protocol identity; CSP nonce is a separate cryptographic authorization secret
- CSS-only edits update CSS slots without rebuilding the iframe document
- HTML edits create a new document generation
- learner HTML is mounted into a runtime-owned root rather than raw-concatenated into srcDoc
- checker selectors are scoped to learner fragment descendants; runtime shell/root/CSS slots are not checker targets
- HTTP(S) egress from learner HTML/CSS remains blocked by CSP

Keep runtime protocols small and explicit. Do not add generic RuntimeRegistry, CheckerRegistry, VFS, execution graph or plugin systems.

# State and Persistence

Use the smallest state scope that works:

```text
URL state
→ server data
→ component-local React state
→ shared state only when a demonstrated need exists
```

Do not add a global state library by default.

Learner progress uses an asynchronous `ProgressStore` abstraction backed by IndexedDB through the `idb` package.

Current storage contract is database `css-lab`, version 2, store `exercise-progress`, key `[exerciseId, revision]`, with learner Draft `files` rather than a CSS-only `code` field.

Persistence rules:

- Feature/UI code must not call raw `indexedDB` APIs directly.
- Progress stores only learner-owned mutable Workspace files plus completion achievement; it does not store locked files, active tab, dirty state, Predict state, hints or Lesson UI state.
- Keep the storage contract asynchronous so alternative adapters can be introduced without rewriting React consumers.
- Use `idb`'s typed `DBSchema` support and promise-based API instead of maintaining custom request/transaction wrappers.
- Keep IndexedDB transactions short. Do not await network requests or unrelated async work inside an active transaction.
- For read-modify-write operations, use a single `readwrite` transaction and await `tx.done`.
- Treat persistence as a progressive enhancement: storage failures and blocked upgrades must not break Editor, Preview, Checker or Reset.
- Exercise revision is part of the persistence key/compatibility boundary; progress from a different revision must not be restored.
- DB v2 is a forward migration. Production rollback/hotfix code must still understand DB v2; never use `DATABASE_VERSION = 1` or `deleteDatabase` as rollback.

# Product Scope

Do not expand Front-end Lab into a generic online IDE.

Current implemented platform capability includes content-defined HTML/CSS editing and Browser Runtime. HTML editability is controlled by content metadata.

Planned but not implemented:

- JavaScript Worker Runtime
- JavaScript Browser Runtime
- TypeScript Toolchain
- TypeScript no-runtime/type-check workflow

Do not proactively add:

- learner JavaScript execution before its dedicated runtime milestone
- npm execution
- WebContainer
- terminal
- arbitrary package installation/runtime
- framework lab runtime
- generic VFS/FileExplorer
- LanguagePlugin/LanguageRegistry
- RuntimeRegistry/RuntimeFactory
- ToolchainRegistry/CompilerRegistry
- CheckerRegistry
- collaboration
- community features
- authentication
- database-backed CMS
- cloud sync
- AI tutor
- payments

When the first real curriculum Exercise enables editable HTML, that content change must add learner-route E2E for HTML edit, CSS edit, multi-file reload restore, Reset All and Check. Do not create fake published content or a test-only product route to prove platform capability.

# Coding Conventions

- TypeScript only for application code.
- Avoid `any`; use explicit types or `unknown` with validation.
- Prefer small, domain-specific components and functions.
- Avoid unnecessary barrel files.
- Use semantic HTML.
- Icon-only controls need accessible labels.
- User-facing learner content is primarily Chinese; code identifiers remain English.
- Preserve existing visual design unless the task is specifically a redesign.
- Do not add dependencies when the existing stack can solve the problem cleanly.

Before changing an unfamiliar framework or shadcn API, inspect the installed code/docs rather than assuming an older API.

# Verification

Before completing a code task, run:

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
```

Content/MDX changes must also keep the generated registry idempotent and pass `pnpm test:e2e` before merge review.

Fix issues introduced by the task before reporting completion.

The current `build` script is project-owned. Do not change build tooling or remove `--webpack` merely as cleanup unless the task specifically calls for it.

When reporting completion, summarize:

- changed files / architecture
- important decisions
- validation results
- remaining issues, if any
