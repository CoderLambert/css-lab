# Task 01 — Learner Contract 与课程边界冻结

## 1. 目标

在任何新增 Module / Lesson 前，把 CSS Foundations v1 的课程契约从 provisional plan 收敛为可执行基线。

本 Task 主要是**审核与决策冻结**，不是课程生产。

---

## 2. 必须读取

```text
AGENTS.md
docs/功能文档/CSS-Foundations-v1-课程规划.md
docs/功能文档/MDX-Learning-Flow-v1-产品方案.md
.agents/skills/css-lesson-authoring/SKILL.md
content/courses/css-foundations/
```

并重新确认当前真实仓库状态。

---

## 3. 必须解决的 Open Decisions

逐项检查是否已经从用户决策、产品文档或新提交中得到答案：

1. learner 是否已掌握基础 HTML / DOM 阅读。
2. 是否假定零 CSS 基础。
3. CSS Foundations endpoint。
4. visual styling 与 layout/system mental model 的相对范围。
5. browser support policy。
6. learner-facing language。
7. code / identifier language。
8. Lesson 学习粒度。
9. Exercise 密度。
10. 是否包含 capstone。
11. capstone 是否坚持 CSS-only + fixed HTML。
12. animations / advanced CSS 是否排除在 v1 core。

---

## 4. Codex 不得自行决定的事项

如果 1 / 2 / 3 / 5 / 11 仍无正式依据：

- 不得默认为最终值。
- 不得开始 Course-wide scaffold。
- 输出清晰 Decision Matrix。
- 标出每个选项会改变哪些 Module / Lesson / fit classification。
- 停在 human review gate。

可以保留 provisional recommendation，但必须明确标为 recommendation，不是事实。

---

## 5. 需要复核的 9 Module 架构

检查：

```text
M1 css-language-and-selection
M2 cascade-and-values
M3 box-model-and-flow
M4 visual-styling-and-typography
M5 flexbox
M6 grid
M7 flow-positioning-and-layering
M8 responsive-css
M9 integration-and-debugging
```

逐项验证：

- Coverage。
- Dependency。
- Cognitive Load。
- Transfer。
- Practiceability。
- Observability。
- Checkability。
- Non-redundancy。
- Misconception Coverage。
- Product Fit。

不得仅因为 freeCodeCamp/MDN 有某个章节就自动创建对应 Module。

---

## 6. 需要复核的 32 Lesson

检查每个 Lesson：

- 是否围绕一个 mental model。
- 是否可以明确给出前置知识。
- 是否与相邻 Lesson 重复。
- 是否值得 learner 实际修改 CSS。
- 是否存在可观察的 preview。
- current checker 能否诚实验证 outcome。
- 是否本质要求 HTML editing。
- 是否可以由现有 Activity 表达。

如果 Lesson 边界需要合并/拆分，Task 01 是正式修改 Curriculum Map 的位置。

---

## 7. Deliverables

更新：

```text
docs/功能文档/CSS-Foundations-v1-课程规划.md
```

至少把：

```text
Provisional
→ Confirmed
```

的决定明确标记。

如果仍有 unresolved：

新增/更新：

```text
Open Decision
Decision owner
Impact
Blocking / non-blocking
```

---

## 8. Acceptance Criteria

- [ ] 关键 Open Decisions 不再被 Codex 静默假定。
- [ ] Curriculum endpoint 有正式文字定义。
- [ ] HTML prerequisite 明确。
- [ ] CSS prerequisite 明确。
- [ ] browser policy 明确或明确标为 blocking open decision。
- [ ] capstone boundary 明确。
- [ ] 9 Module architecture 重新审核。
- [ ] 32 Lesson map 重新审核。
- [ ] capability classification 重新审核。
- [ ] 没有开始新增课程文件。
- [ ] 没有实现产品 capability。

完成后提交并停止，等待 Task 02。
