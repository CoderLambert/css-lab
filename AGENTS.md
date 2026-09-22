<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CSS Lab — Project Context

CSS Lab is an interactive CSS learning platform. The core learner loop is:

```text
Learn a concept
→ edit CSS
→ see an isolated live preview
→ run exercise checks
→ get feedback
→ continue to the next exercise
```

The product is intentionally small and focused. Prefer simple, explicit architecture over adding infrastructure.

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

CodeMirror 6 is the intended CSS editor.
Exercise preview is intended to run inside a sandboxed iframe.

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
3. Exercise content files (`base.css`, `starter.css`, `solution.css`) are raw CSS because CSS itself is the subject being taught.

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

Exercises additionally have a positive integer `revision`.

Lesson content rules:

- `lesson.json` is lesson runtime metadata; `lesson.mdx` is teaching content.
- Every direct child directory under `content/courses/<course>/modules/<module>/lessons/` is a Lesson source directory and must contain both `lesson.json` and `lesson.mdx`; missing either file is a structural error.
- `Lesson` runtime objects must not carry MDX source, compiled content, or source paths.
- Lesson MDX is compiled through the generated registry and may use only `Concept`, `Predict`, `Compare`, and `Exercise`.
- Lesson MDX must not contain imports/exports, arbitrary JavaScript expressions, raw HTML/custom JSX, or level-one headings.
- `Exercise` activities use a lesson-local `slug`, plus `label` and `goal`; do not hard-code learner absolute routes in MDX.
- `exercise.order` is the canonical learner navigation sequence. Effective learner-visible Lessons must reference every published Exercise exactly once and in that order; they must not reference draft Exercises. Hidden/draft Lessons may reference draft Exercises while still requiring existing, slug-matching, non-duplicate references.
- The generated registry is not edited by hand. Run `pnpm content:generate` after adding or moving lesson content, then run `pnpm content:check` before completing content changes.

# Exercise Assets

The intended exercise directory is:

```text
exercise.json
fixture.html
base.css
starter.css
solution.css
```

Responsibilities:

- `fixture.html`: trusted exercise markup.
- `base.css`: fixed visual/setup CSS the learner does not edit.
- `starter.css`: learner-editable initial CSS.
- `solution.css`: authoring/reference solution only.

`solution.css` must never be part of the learner runtime `Exercise` type or be sent to learner client props.

Do not put answer properties into `base.css`.

# Exercise Check DSL

The current check protocol is intentionally small:

- `style`
- `exists`
- `count`

Checks are declarative content data. Do not create per-exercise custom JavaScript check functions when the shared DSL can express the requirement.

Extend the DSL only when a real exercise requires a new capability.

# Editor and Preview Runtime

When implementing the editor/runtime:

- CodeMirror 6 is the CSS editor.
- Reuse existing CSS Lab editor tokens instead of importing a canned editor theme.
- Keep editable CSS in React local state unless persistence is explicitly required.
- Do not introduce Zustand/Redux/etc. for exercise editing state.

Preview runs in an iframe so learner CSS cannot affect the application UI.

Security/runtime rules:

- use `sandbox="allow-scripts"`
- do not add `allow-same-origin` unless a future task gives a concrete requirement
- do not support learner JavaScript
- do not use `eval` or `new Function`
- communicate through a typed `postMessage` protocol
- validate `event.source` and message shape
- CSS edits should update the iframe's user style without reloading the iframe on each keystroke

Keep the preview messaging protocol small and explicit.

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

Persistence rules:

- Feature/UI code must not call raw `indexedDB` APIs directly.
- Keep the storage contract asynchronous so alternative adapters can be introduced without rewriting React consumers.
- Use `idb`'s typed `DBSchema` support and promise-based API instead of maintaining custom request/transaction wrappers.
- Keep IndexedDB transactions short. Do not await network requests or unrelated async work inside an active transaction.
- For read-modify-write operations, use a single `readwrite` transaction and await `tx.done`.
- Treat persistence as a progressive enhancement: storage failures must not break Editor, Preview, Checker, or Reset behavior.
- Exercise revision is part of the persistence key/compatibility boundary; progress from a different revision must not be restored as current progress.

# Product Scope

Do not expand CSS Lab into a generic online IDE.

Unless explicitly requested, do not add:

- HTML editing
- JavaScript editing
- npm execution
- WebContainer
- arbitrary package installation
- collaboration
- community features
- authentication
- database
- cloud sync
- CMS
- AI tutor
- payments

Implement the current task only; do not proactively build adjacent milestones.

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
