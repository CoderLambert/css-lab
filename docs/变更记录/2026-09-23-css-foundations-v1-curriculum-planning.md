# 2026-09-23 — CSS Foundations v1 Curriculum Planning

## Scope

本次变更建立 CSS Foundations v1 的课程规划，并把后续执行模式重构为 3 个错峰定时任务直接推进同一 feature branch。

不在规划提交中修改 learner runtime，不提前实现 M6A。

## Baseline

```text
main@1cc5b7134ea3bafca4398d48aceadf5b5be64b7d
```

Curriculum/code audit originated at `7aaf4ba1`; `1cc5b713` only updates M6A planning documents, so the curriculum audit findings remain valid.

## Added / Reworked

- `docs/功能文档/CSS-Foundations-v1-课程规划.md`
- `docs/任务计划/CSS-Foundations-v1/`
- `00-执行总计划与Codex编排.md` 重构为三车道 scheduled execution contract。
- `13-Capability-Gap与最终课程审核.md` 成为所有 deferred validation 的统一恢复点。

## Scheduled lanes

```text
Lane A
Task 01 → 02 → 03 → wait → Task 13

Lane B
Task 04 → 05 → 06 → 07

Lane C
Task 08 → 09 → 10 → 11 → 12
```

主要安全并行区：

```text
Lane B 完成 M3 后
→ Lane C 可做 M5/M6
→ Lane B 同时继续 M4
```

三个 Lane 有互斥文件所有权，不修改 shared generated registry；完整 registry generation / build / E2E / exhaustive review 延后到 Task 13。

## Key Findings

1. 当前仓库只存在 Flexbox 示例性局部课程，不应视为正式 Curriculum Architecture。
2. 旧 freeCodeCamp / CSS curriculum 讨论没有形成完整持久化研究资料。
3. 当前 `scaffold.mjs` 只支持 Lesson / Exercise，没有 Module scaffold。
4. 当前没有正式 existing order migration mechanism。
5. current checker 无法可靠覆盖 source syntax、geometry、pseudo state、scroll behavior、stacking、multi-viewport 与 Grid authored track 等目标。
6. 核心 CSS Foundations v1 暂不需要新增 Activity primitive。
7. 现有 `flexbox-alignment` 应保留核心 mental model，但位于 Flexbox axes Lesson 之后。
8. scheduled mode 可以延后耗时 verification，但不能延后 CSS semantic correctness 或 checker truthfulness。

## Final gate

只有 Task 13 完成：

```text
content:generate
content:check
test:content
test:authoring-skill
lint
build
e2e
generator idempotency
independent reviews
source audit
publication review
```

后，才允许报告 CSS Foundations v1 curriculum production complete。
