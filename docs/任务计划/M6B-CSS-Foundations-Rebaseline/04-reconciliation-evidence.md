# Task 04 Published Flexbox Reconciliation Evidence

Remote evidence used for this reconciliation:

- main baseline: `9762a9ed06aeeec296591f06d43ea517b79e77ad`
- curriculum source: `70cb8dcfcbda6456b35f64826a7a634c071f6a8f`
- reconciliation feature parent: `9b0a26539537fe989d331910f4ccd2995ee7c867`

## center-box

- stable ID unchanged: `css.flexbox.alignment.center-box.001`
- revision remains **1**
- HTML/base/starter/solution assets are byte-equivalent between current v2 content and curriculum source mapping
- checks and accepted outcome are unchanged
- only prompt/hints teaching language is forward-ported

Existing revision-1 Draft/completion remains compatible.

## space-between-items

- stable ID unchanged: `css.flexbox.alignment.space-between-items.001`
- revision remains **1**
- HTML/base/starter/solution assets are byte-equivalent between current v2 content and curriculum source mapping
- checks and accepted outcome are unchanged
- only hints teaching language is forward-ported

Existing revision-1 Draft/completion remains compatible.

## align-items-end

- stable ID unchanged: `css.flexbox.alignment.align-items-end.001`
- revision changes **1 → 2**
- starter adds `flex-direction: column`
- base constrains the container width for horizontal cross-axis observation
- checks add the required `flex-direction: column`
- solution changes from row/bottom semantics to column/cross-axis-end semantics
- `align-items: end` remains accepted through the existing semantic `alsoAccepts` contract

Revision 1 progress must not restore into revision 2. The M6B Playwright regression seeds a completed revision-1 record, verifies revision-2 hydration starts from the new starter, then creates a distinct revision-2 completion while preserving revision-1 achievement.

The IndexedDB schema remains database `css-lab`, version 2, key `[exerciseId, revision]`; M6B does not introduce DB v3.

## Latest-source overlap review

The latest observed source is now `1b1a9785fa338b0c8fb08a5c6b670ecd9e70e894`; the prior priority source was `54a26dbbb41a26dfdeec23fb37c7f1b10b12e672`; the prior answer-leakage source was `8bfaed7251be79f437d1f888ee0448c84dcf673f`; the prior partial reasoning source was `77eb0c615f013548aaba3f350239d24ae8635ba0`; the prior clear/accessibility source was `46a0d15585c3c5c41761534d4c26735cd428c163`; the prior focus-state source was `d91c7681a5ed599393a31f58ad81cf5c832c7e5c`; the prior authored-value/custom-property source was `7ba27cfbedf5c0257c81b7804573c8401d6634a7`; the prior selector/typography source was `48978b2808f947d8215b161f49caf8942a8258a4`; the prior environment source was `2adc3daecebdcc6162dede5999dac2a457a04511`; the prior responsive source was `7c0b52acd51b4be4708d0fb82f6132e79f0b5d0b`; the prior source was `f3eb60f00a9e832c5097265c3b14b56d3f7e1526`; the prior latest source was `2472e7fd4c7b5a7564feb4020f11329329f881a0`; the intermediate source was `70266f67319a1cb7ed4400b8f0db64cb725ab0e`; the prior observed checker-rollout source was `e48ba8781ed78e37ca0af77cea75e324cd4c24e4`; the actual frozen migration source remains `70cb8dcfcbda6456b35f64826a7a634c071f6a8f`. In the `70cb..e48` delta, the three published Flexbox Exercises above only receive check-id namespace renames for `container-display-flex`. The later source guidance/test, curriculum-correction, authored-selector/typography, authored-value/custom-property, focus-state, clear/accessibility, partial reasoning-correction, further answer-leakage, source-only priority, and source-only afterSelector commits do not change these three Exercise records.

The current Studio contract checks `duplicate-check-id` uniqueness within one Exercise, not across the repository or across sibling Exercises. Therefore those cross-Exercise renames are not a correctness requirement for M6B. They were reviewed and intentionally not ported; no meaningless ID churn is introduced into the published revision boundary.

The current M6B revision/assets/check semantics remain governed by the existing Task 04 reconciliation above. The latest source's `rule-style` / `viewport-style` rollout and optional `rule-style.priority` / `afterSelector` extensions are handled as separate post-freeze capability decisions in `06-source-reconciliation-evidence.md`.
