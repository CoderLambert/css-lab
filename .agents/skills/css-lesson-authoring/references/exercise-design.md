# Exercise Design Guide

Each Exercise should test one primary learning objective.

Before writing files, define objective, editable surface, starter state, expected behavior, progressive hints, checker strategy, and reference solution.

## File responsibilities

### starter/index.html
Use the smallest DOM needed to make the objective concrete.

### starter/base.css
Fixed visual/setup CSS only. Never hide answer properties here.

### starter/style.css
Learner starting CSS only.

### solution/style.css
Authoring/reference solution only. It must not be relied on by learner runtime code.

## Progressive hints
Move from conceptual to concrete: locate the problem domain, remind the mental model, then provide near-implementation direction. Do not reveal the final answer in the first hint.

## Difficulty progression
Change reasoning demand, not just selector names.
