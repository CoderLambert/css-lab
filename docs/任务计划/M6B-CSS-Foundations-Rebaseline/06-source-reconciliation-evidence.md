# M6B Latest Curriculum Source Reconciliation Evidence

审计日期：2026-09-24

本文件记录 M6B 对 migration freeze 之后最新 curriculum source 的明确处理决定。它不是把 latest source 当成 M6B 的原始输入，也不是把 source branch 的旧 runtime 带回当前平台。

## Exact heads and roles

| Role | Branch / evidence | SHA |
| --- | --- | --- |
| main platform baseline | `main` | `9762a9ed06aeeec296591f06d43ea517b79e77ad` |
| M6B feature audit head before this evidence change | `feat/m6b-css-foundations-rebaseline` | `b63c72c5cd2a54872d1159ea9d9b07337a665ba4` |
| frozen migration/planning source (`migrationSourceHead`, `frozenSourceHead`) | `feat/css-foundations-v1-curriculum-plan` at M6B freeze | `70cb8dcfcbda6456b35f64826a7a634c071f6a8f` |
| prior observed curriculum source (`priorObservedSourceHead`) | `feat/css-foundations-v1-curriculum-plan` | `e48ba8781ed78e37ca0af77cea75e324cd4c24e4` |
| intermediate observed source | `feat/css-foundations-v1-curriculum-plan` | `70266f67319a1cb7ed4400b8f0db64cb725ab0e` |
| prior latest observed source | `feat/css-foundations-v1-curriculum-plan` | `2472e7fd4c7b5a7564feb4020f11329329f881a0` |
| prior observed source | `feat/css-foundations-v1-curriculum-plan` | `f3eb60f00a9e832c5097265c3b14b56d3f7e1526` |
| prior responsive source | `feat/css-foundations-v1-curriculum-plan` | `7c0b52acd51b4be4708d0fb82f6132e79f0b5d0b` |
| prior environment source | `feat/css-foundations-v1-curriculum-plan` | `2adc3daecebdcc6162dede5999dac2a457a04511` |
| prior selector/typography source | `feat/css-foundations-v1-curriculum-plan` | `48978b2808f947d8215b161f49caf8942a8258a4` |
| latest observed curriculum source (`latestObservedSourceHead`) | `feat/css-foundations-v1-curriculum-plan` | `7ba27cfbedf5c0257c81b7804573c8401d6634a7` |
| frozen historical M6A evidence | `feat/m6a-workspace-domain-v6` | `573f630b4d77a34824cb1f746eca914a0960e8af` |

`70cb` is the source actually used when M6B migration/planning was frozen. `e48` is the prior observed source containing the checker/publication rollout; `702` is the intermediate source after two source-only authoring guidance/test commits; `247` is the prior latest source after four curriculum-only correction commits; `f3` is the prior source after two more curriculum-only correction commits; `7c` is the prior responsive source; `2adc` is the prior environment source; `489` is the prior selector/typography source; `7ba` is the current latest source after authored-value/custom-property corrections. These SHA roles must not be collapsed.

## Reproducible delta classification

The exact range `70cb8dcf..e48ba878` is 1 commit and 160 changed files. A tree/diff audit classified it as:

| Bucket | Count | Disposition |
| --- | ---: | --- |
| Exercise JSON files | 100 | audited; no blanket source overwrite |
| Lesson files (`lesson.json` + changed `lesson.mdx`) | 42 | capability/publication narrative reviewed; not mechanically promoted |
| Module/assets/other | 12 | reviewed by the classifications below |
| Legacy runtime/schema files | 3 | denied: do not import old preview/runtime/schema |
| Source-branch E2E files | 2 | semantic evidence only; do not overwrite M6B tests |
| Task 13 audit report | 1 | stale sign-off claims corrected in the M6B copy |
| **Total** | **160** | **fully classified** |

The subsequent range `e48ba878..70266f6` is 2 commits and 3 source-only files:

- `AGENTS.md`;
- `.agents/skills/css-lesson-authoring/references/checker-guidelines.md`;
- `.agents/skills/css-lesson-authoring/scripts/authoring-skill.test.mjs`.

Those commits repair the source branch's own authoring guidance drift and add a documentation/schema-type consistency test. They do not change the 13 Exercise checker set or publication sweep. They are acknowledged as source drift but are intentionally not ported into M6B, whose current production checker contract remains `style | exists | count`.

The subsequent `702..247` range is 4 commits and 12 curriculum files. It makes source-branch corrections corresponding to #8 (real margin-collapse condition), #10 (intrinsic sizing contrast), #26 (logical margin vs Flex main-axis model), and #23 (cascade vs defaulting/inheritance pipeline). The later `247..f3` range is 2 commits and 12 curriculum files, corresponding to #28 (both min/max bounds observable) and #16 (real sparse/dense holes plus explicit/implicit row comparison). The `f3..7c` range is 1 commit and 8 curriculum files, correcting #20's responsive Flex threshold and two related fluid-sizing observations. The `7c..2adc` range is 2 commits and 8 curriculum files, correcting #22's selective breakpoint fixture and #27's environment-debug activity; it also adds `rule-style` / `viewport-style` to `debug-constraints-and-environment`, creating one source-only unsupported-checker Exercise beyond the original 13. The `2adc..489` range is 3 curriculum-only commits and 12 files: it closes #9 with bounded authored selector evidence across seven selector Exercises and closes #15 by making parent authored typography plus child inheritance observable; it adds nine source-only unsupported-checker Exercises beyond the original 13. The final `489..7ba` range is 2 curriculum-only commits and 9 files: it closes #14 by adding authored-value/custom-property linkage checks to seven Exercises and adds seven more source-only unsupported-checker Exercises beyond the original 13. These changes are semantically relevant and were reviewed; the source branch closed the earlier individual audit issues with focused comments. The source branch remains read-only evidence and M6B does not selectively import these edits into its frozen v2 migration result.

### Publication sweep

The source commit changes `draft → published` only in 116 files:

- 8 Modules;
- 31 Lessons;
- 97 Exercises;
- breakdown of publication-only files: 77 Exercise JSON, 31 Lesson JSON, 8 Module JSON.

This is effectively publication of the remaining curriculum, not a small status correction. M6B intentionally remains at 9 Modules / 32 Lessons / 100 Exercises with 1 published Lesson + 31 draft and 3 published Exercises + 97 draft. The source publication status is not copied mechanically because the current audit includes known correctness/pedagogy findings and the post-M6B roadmap requires capability-first, batch publication.

### Unsupported checker rollout

Exactly 13 source Exercises gain `rule-style` and/or `viewport-style` in the `e48` rollout, and that baseline set exactly matches the 13 M6B warnings. The current latest source `7ba` retains the original 13 and adds 16 more source-only checker Exercises, including the selector/typography, environment, and authored-value/custom-property corrections, so its current unsupported-checker set is 29 vs M6B's 13 warnings. The current M6A/M6B checker contract remains only:

```text
style | exists | count
```

The `e48` 13-item source set is exactly the 13 current M6B `exercise-without-checks` warnings: source-only = 0, warning-only = 0. The latest source adds 16 source-only unsupported checker Exercises, making latest-source-vs-M6B source-only = 16 and warning-only = 0. M6B therefore retains its original 13 warnings and 13 draft Exercises, while deferring the additional latest-source rollout to `07-Post-M6B-Capability-Gap-Roadmap.md`. This is intentional deferment, not migration failure.

M6B does not add a new DSL, generic checker registry, per-Exercise JavaScript checker, or legacy compatibility runtime as part of #21.

### Open audit impact on publication

At the initial #21 reconciliation read, at least 30 Exercises promoted by the source publication sweep were covered by open curriculum audit findings. The later source branch corrections closed #8, #9, #10, #14, #15, #16, #20, #22, #23, #26, #27, and #28. At the latest Issue read, at least 7 explicitly named promoted Exercises remain covered by open findings #7, #18, #25, and #30. #31 concerns stale final-report evidence rather than a new promoted Exercise. Keeping the M6B publication boundary avoids silently publishing either the still-open findings or source-branch changes that were not migrated into M6B.

Issue #23 is separate: the M9 inheritance/cascade wording was unchanged at `70cb`, `e48`, and M6B, then received a curriculum correction in the latest source `247`. The source-side GitHub Issue is now closed after that focused correction, but M6B still intentionally retains its frozen draft content and tracks the affected Lesson as curriculum debt; this is pre-existing debt/correction review, not a newly introduced `e48` defect and not a reason to import source runtime changes.

Issue #29 is also separate source-branch/future-checker debt. The `e48` source had introduced/used `rule-style` / `viewport-style` while its own `AGENTS.md` and authoring guidance still listed only `style | exists | count`; `e48..702` corrected that source-only guidance and added a drift test. The source-side agent closed it, but it was reopened for this M6B boundary: that source correction does not authorize M6B to change its current contract, and the checker rollout remains a separate capability milestone.

### Legacy denylist

The source delta changes:

- `src/features/exercise/lib/preview-document.ts`;
- `src/features/exercise/lib/preview-messages.ts`;
- `src/lib/content/schemas/exercise.ts`.

These are legacy source-branch runtime/schema surfaces. They are explicitly denied and do not overwrite M6A Browser Runtime, Exercise v2, Workspace, Progress DB v2, or the current message protocol. The two source-branch E2E changes are likewise not copied over current M6B tests.

### Compatible and authored asset review

The source's cross-Exercise check-id namespace renames were reviewed against the current per-Exercise duplicate-ID contract and intentionally not ported; see `04-reconciliation-evidence.md`.

The four CSS asset changes are not unconditional serialization updates:

- `mobile-first-override/solution.css` expands `flex` shorthand into longhands to serve `rule-style` checks; deferred with that unsupported rollout;
- `compare-focus-input/solution.css` expands `outline` shorthand for the same checker-coupled reason and remains covered by #18;
- `focus-visible-indicator/starter.css` and `solution.css` change the exercise from repairing an existing `:focus` anti-pattern to an empty-starter/full-rule shape, which is a separate pedagogical decision, not mechanical copying.

## Resolution

For M6B, #21 is resolved by explicit reconciliation:

1. acknowledge `7ba27cf` as latest observed source, with `48978b2` retained as the prior selector/typography source, `2adc3da` retained as the prior environment source, `e48ba878` retained as the prior checker-rollout source, `70266f6` as the intermediate authoring-guidance source, and `2472e7f`/`f3eb60f`/`7c0b52a` as prior curriculum-correction sources;
2. preserve `70cb8dcf` as the actual migration/frozen source;
3. keep the 116-file publication sweep deferred;
4. keep the 13 unsupported checker additions and their exact 13 warnings deferred;
5. keep known-audited promoted Exercises draft;
6. denylist legacy runtime/schema/E2E overwrites;
7. route future checker/publication work to the existing Post-M6B capability roadmap.

This is an evidence-only reconciliation. It does not close #29 or #31, and it does not resolve governance #24.
