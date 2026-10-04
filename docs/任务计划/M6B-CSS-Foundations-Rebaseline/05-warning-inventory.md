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
- M6B release expected warnings: 13
- Current Post-M6B warnings: 12
- Warning code: `exercise-without-checks` only

The 13-warning set below is the historical M6B release baseline. It identified draft Exercises whose real learning outcome could not be truthfully covered by the checker capabilities available at that release point; M6B did not add weak proxy checks or lower Studio severity.

Post-M6B, warnings are removed only when a separately validated current-runtime capability plus a truthful Exercise redesign closes the corresponding gap. Issue #10 is the first item resolved this way: current production `rule-style` can prove the authored `width:max-content` intent, while the redesigned block-level fixture makes the available-space → intrinsic-size contrast observable without hard-coding a pixel geometry answer. The Exercise remains draft. Therefore the current Studio warning count is **12**, while the original 13-entry table remains release-history evidence.

### Exact correspondence with the latest curriculum source

The `e48ba8781ed78e37ca0af77cea75e324cd4c24e4` rollout still adds `rule-style` and/or `viewport-style` to exactly 13 Exercises, and that baseline set is exactly equal to this 13-entry `exercise-without-checks` warning inventory: source-only = 0 and warning-only = 0. The current latest source `e48f365cc6a6f0688916813cb4bc4a8c765b98c2` has 34 such Exercises and 95 unsupported check records: it retains the original 13 and adds 21 source-only authored-check Exercises through the later #7/#9/#14/#15 corrections, environment/cascade corrections, priority rollout, and source-order rollout. Current latest-source-vs-M6B is therefore 34 vs 13 (source-only = 21, warning-only = 0); the latest source also expands `rule-style` with optional declaration-priority and `afterSelector` validation. M6B intentionally does not add these new warnings, checker capability, or source guidance; the latest source additions are deferred with the unsupported capability rollout.

This was an intentional M6B release boundary, not a migration omission. At the M6B release point all 13 Exercises remained draft with all 13 warnings. Post-M6B capability work may reduce this list only with separately validated current-runtime evidence; do not delete a warning or copy historical source checks merely to make the count smaller.

| Location | Stable ID | Capability gap | Current Post-M6B status |
| --- | --- | --- | --- |
| `box-model-and-flow/sizing-constraints-and-overflow/observe-intrinsic-content` | `css.box-model-and-flow.sizing-constraints-and-overflow.observe-intrinsic-content.001` | geometry/layout observation | **resolved by #10** — `rule-style` authored evidence + observable block fixture; still draft |
| `flexbox/flex-item-control-and-order/use-auto-margin` | `css.flexbox.flex-item-control-and-order.use-auto-margin.001` | geometry/layout observation | remaining warning |
| `grid/grid-formatting-context-and-tracks/compare-fixed-and-flexible-tracks` | `css.grid.grid-formatting-context-and-tracks.compare-fixed-and-flexible-tracks.001` | authored Grid track validation | remaining warning |
| `grid/grid-formatting-context-and-tracks/define-explicit-tracks` | `css.grid.grid-formatting-context-and-tracks.define-explicit-tracks.001` | authored Grid track validation | remaining warning |
| `integration-and-debugging/responsive-component-capstone/build-responsive-profile` | `css.integration-and-debugging.responsive-component-capstone.build-responsive-profile.001` | multi-viewport + integrated layout observation | remaining warning |
| `responsive-css/media-queries-and-breakpoints/choose-content-breakpoint` | `css.responsive-css.media-queries-and-breakpoints.choose-content-breakpoint.001` | source-aware CSS + multi-viewport validation | remaining warning |
| `responsive-css/media-queries-and-breakpoints/debug-media-cascade` | `css.responsive-css.media-queries-and-breakpoints.debug-media-cascade.001` | source-aware CSS + multi-viewport validation | remaining warning |
| `responsive-css/media-queries-and-breakpoints/mobile-first-override` | `css.responsive-css.media-queries-and-breakpoints.mobile-first-override.001` | source-aware CSS + multi-viewport validation | remaining warning |
| `responsive-css/responsive-layout-strategies/add-selective-breakpoint` | `css.responsive-css.responsive-layout-strategies.add-selective-breakpoint.001` | multi-viewport validation | remaining warning |
| `responsive-css/responsive-layout-strategies/integrate-responsive-component` | `css.responsive-css.responsive-layout-strategies.integrate-responsive-component.001` | multi-viewport + geometry/layout observation | remaining warning |
| `visual-styling-and-typography/interaction-states-and-focus/compare-focus-input` | `css.visual-styling-and-typography.interaction-states-and-focus.compare-focus-input.001` | controlled pseudo/focus state validation | remaining warning |
| `visual-styling-and-typography/interaction-states-and-focus/focus-visible-indicator` | `css.visual-styling-and-typography.interaction-states-and-focus.focus-visible-indicator.001` | controlled focus-visible state validation | remaining warning |
| `visual-styling-and-typography/interaction-states-and-focus/hover-state-feedback` | `css.visual-styling-and-typography.interaction-states-and-focus.hover-state-feedback.001` | controlled hover state validation | remaining warning |

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
