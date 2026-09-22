# Lesson Design Guide

A Lesson is a coherent knowledge unit, not a container created merely because several exercises exist.

Before authoring files, define:

1. prerequisites — what learners are expected to already understand
2. learning outcome — what learners should be able to reason about or do
3. mental model — the reusable model that explains the behavior
4. common misconceptions — plausible but wrong models
5. teaching flow — how explanation, prediction, comparison, and practice fit together
6. exercise progression — what each Exercise adds beyond the previous one

Prefer this learning loop when it fits:

```text
Explain
→ Predict
→ Compare / Observe
→ Exercise
→ Feedback
→ Hint
→ Retry
```

Do not mechanically force every Activity into every Lesson.

## Activity roles

### Concept

Explain the underlying model and why it works. Avoid merely restating property definitions.

### Predict

Make the learner commit to a result before seeing it. Use it to expose misconceptions.

### Compare

Use for concepts that are easy to conflate, such as:

- justify-content vs align-items
- margin vs gap
- fixed vs absolute
- auto-fit vs auto-fill

### Exercise

Move from explanation to implementation. Each Exercise should have a clear objective and a meaningful reason to exist in the sequence.

## Quality bar

A strong Lesson should answer:

- Why does this behavior happen?
- What incorrect prediction might a learner make?
- What observation would correct that model?
- What must the learner implement themselves?
- Why is the next exercise harder or different?
