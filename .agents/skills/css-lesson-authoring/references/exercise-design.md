# Exercise Design Guide

Each Exercise should test one primary learning objective while remaining realistic enough to make the result observable.

Before writing files, define:

- objective
- editable surface
- fixture purpose
- starter state
- expected behavior
- progressive hints
- checker strategy
- reference solution

## File responsibilities

### fixture.html

Use the smallest DOM needed to make the learning objective concrete.

### base.css

Contains fixed visual/setup CSS only.

Never hide answer properties here.

### starter.css

Contains only the learner's starting point.

Do not repeatedly make learners re-enter knowledge already established unless repetition is itself the objective.

### solution.css

Authoring/reference solution only. It must not be relied on by learner runtime code.

## Progressive hints

Hints move from conceptual to concrete:

1. locate the problem domain
2. remind the relevant mental model
3. provide a near-implementation direction

Do not reveal the final answer in the first hint.

## Difficulty progression

A sequence should change the reasoning demand, not just the selector names.

Examples:

- identify the relevant axis
- apply the property in a straightforward case
- handle a changed direction/layout context
- diagnose a plausible failure
