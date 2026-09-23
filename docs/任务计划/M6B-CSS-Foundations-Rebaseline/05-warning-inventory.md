# Task 05 — Studio Warning Inventory

Validated by remote Quality Gate on M6B feature history after the 9/32/100 migration.

Target state:

- Courses: 1
- Modules: 9
- Lessons: 32
- Exercises: 100
- Published Lessons: 1
- Draft Lessons: 31
- Published Exercises: 3
- Draft Exercises: 97
- Studio blocking errors: 0
- Expected warnings: 13
- Warning code: `exercise-without-checks` only

These warnings are intentionally preserved. They identify draft Exercises whose real learning outcome cannot be truthfully covered by the current `style / exists / count` checker DSL. M6B does not add weak proxy checks and does not lower Studio severity.

| Location | Stable ID | Capability gap |
| --- | --- | --- |
| `box-model-and-flow/sizing-constraints-and-overflow/observe-intrinsic-content` | `css.box-model-and-flow.sizing-constraints-and-overflow.observe-intrinsic-content.001` | geometry/layout observation |
| `flexbox/flex-item-control-and-order/use-auto-margin` | `css.flexbox.flex-item-control-and-order.use-auto-margin.001` | geometry/layout observation |
| `grid/grid-formatting-context-and-tracks/compare-fixed-and-flexible-tracks` | `css.grid.grid-formatting-context-and-tracks.compare-fixed-and-flexible-tracks.001` | authored Grid track validation |
| `grid/grid-formatting-context-and-tracks/define-explicit-tracks` | `css.grid.grid-formatting-context-and-tracks.define-explicit-tracks.001` | authored Grid track validation |
| `integration-and-debugging/responsive-component-capstone/build-responsive-profile` | `css.integration-and-debugging.responsive-component-capstone.build-responsive-profile.001` | multi-viewport + integrated layout observation |
| `responsive-css/media-queries-and-breakpoints/choose-content-breakpoint` | `css.responsive-css.media-queries-and-breakpoints.choose-content-breakpoint.001` | source-aware CSS + multi-viewport validation |
| `responsive-css/media-queries-and-breakpoints/debug-media-cascade` | `css.responsive-css.media-queries-and-breakpoints.debug-media-cascade.001` | source-aware CSS + multi-viewport validation |
| `responsive-css/media-queries-and-breakpoints/mobile-first-override` | `css.responsive-css.media-queries-and-breakpoints.mobile-first-override.001` | source-aware CSS + multi-viewport validation |
| `responsive-css/responsive-layout-strategies/add-selective-breakpoint` | `css.responsive-css.responsive-layout-strategies.add-selective-breakpoint.001` | multi-viewport validation |
| `responsive-css/responsive-layout-strategies/integrate-responsive-component` | `css.responsive-css.responsive-layout-strategies.integrate-responsive-component.001` | multi-viewport + geometry/layout observation |
| `visual-styling-and-typography/interaction-states-and-focus/compare-focus-input` | `css.visual-styling-and-typography.interaction-states-and-focus.compare-focus-input.001` | controlled pseudo/focus state validation |
| `visual-styling-and-typography/interaction-states-and-focus/focus-visible-indicator` | `css.visual-styling-and-typography.interaction-states-and-focus.focus-visible-indicator.001` | controlled focus-visible state validation |
| `visual-styling-and-typography/interaction-states-and-focus/hover-state-feedback` | `css.visual-styling-and-typography.interaction-states-and-focus.hover-state-feedback.001` | controlled hover state validation |

Forbidden warning/error classes remain absent in the integrated tree:

- `published-child-hidden`
- `workspace-zero-editable`
- `browser-unsupported-language`
- `browser-multiple-html`
- `undeclared-starter-file`
- `missing-solution-file`
- `unexpected-solution-file`
- `exercise-source-inspection-failed`
- `published-lesson-empty`
- `published-module-empty`
- `published-course-empty`

This inventory is a current M6B release fact, not evidence that those checker capabilities have been implemented.
