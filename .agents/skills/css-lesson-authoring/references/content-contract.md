# CSS Lab Content Contract

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
        starter/
          index.html
          base.css
          style.css
        solution/
          style.css
```

Course, Module, and Lesson use `schemaVersion: 1`. Exercise uses `schemaVersion: 2`.

All entities use stable `id`, mutable kebab-case `slug`, positive `order`, and `status: draft | published`.
Exercise additionally uses a positive `revision`, declared Workspace files, and Browser runtime entry.

`exercise.order` remains the canonical learner navigation sequence. Published learner-visible Lessons reference every published Exercise exactly once and in order. `hidden` is not a content status.

`lesson.json` and `lesson.mdx` remain the Lesson content contract. The generated lesson registry is not edited by hand.
After structural Lesson changes run `pnpm content:generate`, `pnpm content:check`, and `pnpm test:content`.

The learner runtime hydrates only declared `starter/` workspace files. `solution/` is server-only authoring/reference source and never enters learner Exercise props.
