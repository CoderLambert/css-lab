# Task 03 — Curriculum Structure 与现有 Flexbox 迁移

## 1. 目标

在 Learner Contract 已冻结、deterministic Module/reorder tooling 已完成后，建立 CSS Foundations v1 的 Module 结构，并把现有 `flexbox` / `flexbox-alignment` 安全迁移到新 Curriculum 位置。

本 Task 不批量创作新 Lesson 正文。

---

## 2. Prerequisites

必须确认：

- Task 01 completed。
- Task 02 completed。
- authoring-skill tests pass。
- 当前 branch 干净。
- 当前真实 content tree 与计划一致。

必须运行：

```bash
node .agents/skills/css-lesson-authoring/scripts/inspect-context.mjs --course css-foundations --module flexbox
```

并读取：

```text
content/courses/css-foundations/course.json
content/courses/css-foundations/modules/flexbox/module.json
content/courses/css-foundations/modules/flexbox/lessons/flexbox-alignment/
```

---

## 3. Task A — 创建缺失 Module skeleton

使用 Task 02 的 deterministic Module scaffold 创建 draft Module：

```text
css-language-and-selection
cascade-and-values
box-model-and-flow
visual-styling-and-typography
grid
flow-positioning-and-layering
responsive-css
integration-and-debugging
```

现有：

```text
flexbox
```

保留 stable ID，禁止删除重建。

Module title / description / stable ID 必须按已冻结的课程基线确定，不允许临时随机。

所有新增 Module：

```text
status = draft
```

---

## 4. Task B — Module order migration

最终目标顺序：

```text
1 css-language-and-selection
2 cascade-and-values
3 box-model-and-flow
4 visual-styling-and-typography
5 flexbox
6 grid
7 flow-positioning-and-layering
8 responsive-css
9 integration-and-debugging
```

使用 deterministic reorder tool。

禁止直接批量文本替换 `module.json` order。

现有 flexbox：

- stable ID 不变。
- slug 不变。
- title / description 只有在课程基线明确要求时才调整。
- status 默认保持当前值，本 Task 不以“统一 draft”为理由回滚现有 published content。

---

## 5. Task C — Flexbox Lesson order migration

现有：

```text
flexbox-alignment order 1
```

目标：

```text
flex-formatting-context-and-axes order 1
flexbox-alignment order 2
flex-wrapping-and-multiline-alignment order 3
flexible-items-and-free-space order 4
flex-item-control-and-order order 5
```

本 Task 只需要：

1. 将现有 `flexbox-alignment` deterministic 移到 order 2。
2. 不创建其他 4 个 Lesson。
3. 不改现有 Exercise order。
4. 不改现有 learner prose。
5. 不发布任何新内容。

为什么先迁移 order：

> 后续 scaffold Flexbox Lesson 1 时需要一个无 collision 的确定性位置。

如果现有 scaffolder/reorder contract 证明“Lesson 1 尚不存在时直接把 alignment 移到 2”会造成工具或 content checker 不允许的 sparse order，则不要手绕过；回到 Task 02 修正确定性迁移语义，或把迁移与首个 Lesson scaffold 放到 Task 08 的原子步骤。

---

## 6. Task D — Curriculum architecture metadata review

对 9 个 Module 的 metadata 做一次只读 review：

- slug 是否长期稳定。
- title 是否 learner-friendly。
- description 是否描述 mental model 而非 property list。
- order 是否与 dependency graph 相符。
- status 是否符合 publication policy。

不要在 Module metadata 中写详细 Lesson list。

---

## 7. Validation

```bash
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm test:authoring-skill
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
```

必须验证现有 published Flexbox learner route 没有因为 Module order migration 失效。

---

## 8. Acceptance Criteria

- [ ] 9 个 Module 都有正式目录/metadata。
- [ ] 新 Module 全部 draft。
- [ ] module orders 与课程架构一致。
- [ ] flexbox stable ID / slug 保持。
- [ ] flexbox-alignment stable ID / slug 保持。
- [ ] flexbox-alignment 迁移没有破坏现有 3 个 Exercise。
- [ ] 没有创建其他 Lesson。
- [ ] existing learner E2E pass。
- [ ] all gates pass。

完成后，Course 已具备按 Module 小批生产内容的结构基础。


---

## 9. Scheduled execution status

Task 03 is complete under the scheduled execution override.

### Deterministic operations executed

- `inspect-context.mjs --course css-foundations --module flexbox` executed against the current branch baseline.
- `reorder.mjs module` dry-run then apply: `flexbox 1 → 5`.
- `reorder.mjs lesson` dry-run then apply: `flexbox-alignment 1 → 2`.
- Eight missing Modules created with `scaffold.mjs module` and explicit final orders.
- Final full Module mapping dry-run reports `changed: 0`.
- Final Flexbox Lesson mapping dry-run reports `changed: 0`.

### Stable Module IDs frozen by this task

```text
css-language-and-selection       css.language-and-selection
cascade-and-values               css.cascade-and-values
box-model-and-flow               css.box-model-and-flow
visual-styling-and-typography    css.visual-styling-and-typography
flexbox                          css.flexbox
grid                             css.grid
flow-positioning-and-layering    css.flow-positioning-and-layering
responsive-css                   css.responsive-css
integration-and-debugging        css.integration-and-debugging
```

The IDs follow the existing `css.<semantic-identity>` convention and now form the stable identity baseline for subsequent curriculum production.

### Fast-gate evidence

```text
9 Module metadata records present
orders exactly 1..9
all Module IDs unique
all Module slugs unique
8 new Modules status = draft
existing flexbox status = published
flexbox stable id/slug preserved
flexbox-alignment stable id/slug/status preserved
flexbox-alignment order = 2
existing three Exercise directories remain present
no additional Lesson created
deterministic final reorder dry-runs = no-op
metadata validation = passed
main still docs-only M6A v5; no Exercise contract cutover
```

Full `content:generate / content:check / test:content / lint / build / E2E` verification remains deferred to Task 13 by the scheduled execution contract. No learner-facing prose or Exercise assets were changed in Task 03.

Lane B may begin Task 04 from this point.
