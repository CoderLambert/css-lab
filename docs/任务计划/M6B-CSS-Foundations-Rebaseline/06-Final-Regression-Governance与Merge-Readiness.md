# Task 06 — Final Regression / Governance / Merge Readiness

## 1. 目标

对整个 M6B release unit 做最终审计。

Task 06 不再接受“旧 branch 当时通过过”的替代证据。所有最终 gate 必须在 M6B 最终 feature HEAD 上真实执行。

## 2. Legacy cleanup audit

全课程扫描必须确认：

- 100 Exercise 全部 schemaVersion 2。
- content/courses/css-foundations 下不存在 legacy Exercise layout：
  - fixture.html
  - exercise-level base.css
  - starter.css
  - solution.css
- 不存在 production v1 Exercise parser。
- 不存在 runtime fixtureHtml/baseCss/starterCss aliases。
- 不存在 v1/v2 dual reader/write。
- offline migrator 未被 application/client graph import。

如果保留迁移脚本，文档必须明确其 one-way/offline 属性。

## 3. M6A contract regression

完整保留：

### Progress

- IndexedDB version 2。
- revision key boundary。
- blocked-open bounded fallback。
- late-open discard。
- completed achievement。
- no deleteDatabase rollback。

### Browser Runtime

- sandbox allow-scripts only。
- CSP/network egress block。
- no learner JS execution。
- runtime-owned document shell。
- HTML generation lifecycle。
- CSS hot update no reload。
- typed source/generation/request validation。
- stale result rejection。
- checker scope isolation。

### Filesystem / solution

- canonical root。
- no symlink descendants。
- regular files。
- root containment。
- solution server-only。

### MDX

- generated registry。
- Activity contract。
- canonical Exercise sequence。
- no draft leak。

## 4. Full final gate

必须实际运行：

~~~bash
pnpm test:authoring-skill
pnpm content:generate
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
~~~

然后：

~~~bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
~~~

只有真实执行成功才能标记 PASS。

任何未执行完整 E2E 的状态最多：

~~~text
DEV_DONE_PENDING_E2E
~~~

不得 MERGE_READY。

## 5. Curriculum final reconciliation

最终报告至少重新确认：

- 9 Modules。
- 32 Lessons。
- 100 Exercises。
- published/draft count。
- stable ID set 与 source branch 的差异。
- revision 差异，尤其 align-items-end revision 2。
- source branch 课程语义是否有遗漏。
- capability-gap warning inventory。
- generated registry coverage。
- current learner published chain。

source branch Task 13 的 14 READY / 10 checker-limited / 8 checker-capability distribution 是历史审核输入，不应不经复核直接当作 M6B 当前结论；迁移后重新确认。

## 6. Repository governance

规划审计时：

~~~text
main protected = false
repository rulesets = []
~~~

M6B merge 前应配置 main ruleset / branch protection，至少：

- changes through Pull Request。
- required Quality Gate status。
- prevent force push。
- prevent branch deletion（如适用）。

GitHub App/connector 可能没有 administration permission。

因此：

- 能配置时，实际配置并读取确认。
- 无权限时，明确报告 EXTERNAL_ADMIN_REQUIRED。
- 不得因为 API 403 就声称 protection 已存在。
- 若用户未明确 waiver，EXTERNAL_ADMIN_REQUIRED 阻止治理层面的 MERGE_READY。

## 7. main drift / conflict check

最终 gate PASS 后重新读取：

- latest main HEAD。
- latest M6B feature HEAD。
- source curriculum HEAD。

如果 main 在 M6B 开发期间前进：

- normal merge main into feature 或按新 contract forward-fix。
- 不 rebase shared branch。
- 不 force push。
- 重新跑受影响 gate。

检查：

- compare status。
- changed files。
- conflicts。
- generated registry。
- content counts。
- security contracts。

## 8. Merge policy

M6B 是单一 release unit。

允许正常 PR merge commit。

禁止：

- 把 old curriculum source branch 直接 merge 到 main。
- squash/rebase 隐藏未经验证的 migration history，除非用户后续明确改变策略。
- 逐 Module 单独发布到 main。
- final gate 未满足时 merge。

merge 后：

1. 读取 main HEAD。
2. 确认 M6B feature ancestry。
3. 运行/检查 main push Quality Gate。
4. 确认 9/32/100 content tree 和关键 M6A contracts 已进入 main。
5. old curriculum source branch 标记为历史 source，可在后续人工决定是否删除。

## 9. Task 06 Completion Status

只使用：

- ACTIVE
- PARTIAL
- DEV_DONE_PENDING_E2E
- MERGE_READY
- MAIN_MERGED
- BLOCKED

只有 main merge 成功且 post-merge audit 正确才报告 MAIN_MERGED。

## 10. Acceptance Criteria

- [ ] legacy production contract cleanup 完成。
- [ ] M6A security/storage/runtime regressions全部通过。
- [ ] fast gates 全 PASS。
- [ ] full E2E 真实 PASS。
- [ ] generator idempotency PASS。
- [ ] curriculum final reconciliation 完成。
- [ ] main drift/conflict check 完成。
- [ ] branch protection/ruleset 已确认，或明确 EXTERNAL_ADMIN_REQUIRED 并由用户处理/waive。
- [ ] 满足 merge policy 后才进入 main。
