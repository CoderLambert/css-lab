# CSS Lab Content Contract

Use this reference when creating or reviewing CSS curriculum content.

## Structure

```text
content/courses/<course>/
  course.json
  modules/<module>/
    module.json
    lessons/<lesson>/
      lesson.json
      lesson.mdx
      exercises/<exercise>/
        exercise.json
        fixture.html
        base.css
        starter.css
        solution.css
```

Every direct Lesson directory must contain both `lesson.json` and `lesson.mdx`.

## Metadata

All content entities use:

- `schemaVersion: 1`
- stable `id`
- mutable kebab-case `slug`
- positive integer `order`
- `status: draft | published`

Exercise additionally uses positive integer `revision`.

Stable IDs are semantic identity. Do not derive or change them casually. The scaffolder requires the caller to provide the ID and then checks repository-wide uniqueness.

## Lesson MDX

`lesson.json.title` is the only H1.

Lesson MDX starts at H2 and may use only:

- Markdown prose
- fenced code
- `Concept`
- `Predict`
- `Compare`
- `Exercise`

Do not use imports, exports, raw HTML/custom JSX, arbitrary JavaScript expressions, or H1 headings.

`Exercise` uses lesson-local `slug`, `label`, and `goal`.

## Sequence

`exercise.order` is the canonical learner navigation sequence.

For an effective learner-visible Lesson:

- every published Exercise is referenced exactly once in MDX
- references appear in `exercise.order`
- draft Exercises are not referenced

Draft Lessons, or Lessons that are not learner-visible because an ancestor is unpublished, may reference draft Exercises while source paths and slugs still must be valid and non-duplicated. `hidden` is not a content status.

## Generated registry

Do not edit the generated lesson registry manually.

After adding/moving lessons:

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
```

The generated static registry is a v1 implementation detail, not a permanent content-authoring contract.
