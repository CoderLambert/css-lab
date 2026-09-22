# Task 02 — Authoring Tooling 确定性补强

## 1. 目标

补齐正式 Curriculum Production 需要、但当前 authoring skill 尚缺失的确定性结构操作。

当前已确认 gap：

```text
Module scaffold
Existing entity reorder / migration
```

本 Task 只做 authoring tooling，不创建新课程内容。

---

## 2. 必须读取

```text
AGENTS.md
.agents/skills/css-lesson-authoring/SKILL.md
.agents/skills/css-lesson-authoring/scripts/
.agents/skills/css-lesson-authoring/assets/
.agents/skills/css-lesson-authoring/references/content-contract.md
src/lib/content/schemas/
scripts/content/
content/courses/css-foundations/
```

先运行当前：

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
```

记录 baseline。

---

## 3. Task A — Module scaffold

为 `scaffold.mjs` 增加明确的：

```bash
node .agents/skills/css-lesson-authoring/scripts/scaffold.mjs module \
  --course <course-slug> \
  --slug <module-slug> \
  --id <stable-id> \
  --title "<title>" \
  --description "<description>"
```

要求：

- 验证 parent Course。
- 验证 slug。
- stable ID repository-wide uniqueness。
- 默认 next order。
- 支持显式 `--order`。
- order collision hard fail。
- refuse overwrite。
- 新 Module `status: draft`。
- 创建：
  - `module.json`
  - `lessons/`
- stable ID 必须由 caller 提供。
- 不自动 invent title / ID。
- 不创建 Lesson。

不要加入 Course scaffold，除非当前 Task 的真实实现发现 Module scaffold 无法在不新增极小共享 helper 的情况下完成；即使如此也不得顺手实现未请求的 Course CLI。

---

## 4. Task B — Deterministic reorder / migration

需要一个窄工具来安全调整 sibling entities 的 `order`。

最低需求：

```text
Module reorder
Lesson reorder
```

推荐提供独立 subcommand，例如：

```bash
node .../scaffold.mjs reorder-module ...
node .../scaffold.mjs reorder-lesson ...
```

或独立：

```text
reorder.mjs
```

具体 CLI 可以根据现有 Skill 风格决定，但 contract 必须：

1. 读取真实 parent context。
2. 校验目标 entity。
3. 校验所有 sibling order。
4. 接收显式最终 order mapping，或提供单一 move + deterministic normalization。
5. 操作前检测 collision / duplicate。
6. 不改变 stable ID / slug / status。
7. 只修改必要 metadata。
8. 支持 dry-run 或至少先输出 plan 再执行。
9. 出错不得留下部分写入。
10. 有测试覆盖。

不要创建通用“内容迁移框架”。

---

## 5. Task C — Skill contract 更新

同步更新：

```text
.agents/skills/css-lesson-authoring/SKILL.md
references/content-contract.md
AGENTS.md
```

明确：

- 新 Module 必须通过 deterministic scaffold。
- existing order migration 使用 deterministic tool。
- 不允许模型批量手写 module metadata。
- Lesson/Exercise 仍使用现有 scaffold。
- new content defaults draft。

---

## 6. Task D — Tests

必须扩展：

```text
pnpm test:authoring-skill
```

至少覆盖：

### Module

- valid create。
- missing course。
- invalid slug。
- duplicate stable ID。
- duplicate order。
- existing path overwrite。
- default order。
- draft status。

### Reorder

- valid module reorder。
- valid lesson reorder。
- duplicate target order fail。
- unknown entity fail。
- stable ID unchanged。
- status unchanged。
- no partial write on validation failure。
- repeat/dry-run semantics predictable。

使用 temp content tree，不修改真实课程 fixture。

---

## 7. 禁止 scope expansion

不实现：

- CMS。
- generic migration framework。
- Course editor UI。
- Workspace changes。
- Checker changes。
- Lesson content。
- new Activity。

---

## 8. Verification

```bash
pnpm test:authoring-skill
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
git diff --check
```

如修改影响 generated content tooling，再验证 generator idempotency。

---

## 9. Acceptance Criteria

- [ ] Module deterministic scaffold 可用。
- [ ] 新 Module 默认 draft。
- [ ] stable ID uniqueness enforced。
- [ ] order collision enforced。
- [ ] overwrite protection enforced。
- [ ] Module/ Lesson reorder 有 deterministic path。
- [ ] reorder 不改变 stable ID / slug / status。
- [ ] tests 覆盖正常与失败路径。
- [ ] Skill/AGENTS contract 同步。
- [ ] 全部 gates pass。
- [ ] 没有新增课程 Module。

完成后提交，进入 Task 03。
