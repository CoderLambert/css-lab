# Task 06 — Integration、E2E、独立审核与 Merge Readiness

## 目标

对 MDX Learning Flow v1 做最终集成验证。

本任务不新增产品能力。

---

## 1. 开始前同步最新 main

执行：

```bash
git fetch origin
git status --short
git log --oneline --decorate -5
```

如果 `origin/main` 在当前 branch merge base 之后有新提交：

- 先检查改动范围。
- merge 最新 main 到当前 feature branch。
- 不 force push。
- 解决冲突时保留本任务包已确认的 MDX baseline。
- 合并后重新执行所有验证。

不要等到最终 merge 时才发现漂移。

---

## 2. 全局架构搜索

最终必须搜索：

```text
bodyMdxSource
lesson-content-registry.tsx
LessonMarkdown
react-markdown
href="/learn
<Exercise
mdxjsEsm
alsoAccepts
css-lab-parent
css-lab-preview
```

解释：

- `bodyMdxSource`：禁止残留。
- 旧手工 registry：禁止残留。
- LessonMarkdown/react-markdown：禁止残留。
- MDX Exercise absolute learner href：禁止残留。
- `alsoAccepts` 当前允许存在，是 transitional checker capability。
- `css-lab-parent/css-lab-preview` 当前允许存在；M6A Task 05 才会替换 runtime protocol。

不要为了 grep 清零误删 M6A 未来才处理的代码。

---

## 3. Generated Registry Review

人工检查 generated file：

- header 清楚。
- imports 按 key deterministic 排序。
- key 是 course/module/lesson slug path。
- static JSX switch。
- default null。
- 没有 filesystem absolute path。
- 没有 stable id/source locator 混用。

执行：

```bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
```

如果 generated file stale，修 source/generator，不接受“先生成后算通过”但不提交变更。

---

## 4. MDX Contract Review

当前真实 lesson.mdx 确认：

- 无 import/export。
- 无 H1。
- 无 arbitrary JSX。
- Predict options 是 static literal array。
- Exercise 使用 slug/label/goal。
- 没有完整 learner URL。

运行：

```bash
pnpm content:check
pnpm test:content
```

---

## 5. Learner Product Regression

Playwright 至少继续覆盖：

### Navigation

- `/learn` 进入第一个 published exercise。
- previous/next 顺序不变。
- 当前 3 个 exercise URL 不变。

### MDX

- Lesson metadata H1 存在且唯一。
- MDX H2/H3 可见。
- Concept 可见。
- Predict 可交互。
- Compare 内容可见。
- Exercise Activity link 可导航。

### Editor / Preview

- CSS typing 更新 preview。
- formatter 工作。
- format 一次 undo。
- color swatch editor-local。
- Preview responsive/preset UI 不被破坏。

不要求本轮为每个 viewport preset 写复杂视觉测试，但至少验证 controls 存在且切换一个 preset 后 iframe 仍可用。

### Checker

- 正确答案通过。
- progress 持久化。
- reload restore。
- mismatch 显示 actual / expected。
- checker diagnostics 不退化成只有 pass/fail。
- `align-items: end` 当前合法替代仍通过。

### Hints

- 初始不展示 hints。
- 点击一次只显示第一层。
- 按钮显示 1/N。
- 不允许 Lesson 正文直接暴露全部 hints。

---

## 6. Studio Regression

```text
courses: 当前数量不变
modules: 当前数量不变
lessons: 当前数量不变
exercises: 3
published exercises: 3
blocking issues: 0
warnings: 0
learner links: 3
```

若当前仓库内容数量已经被其他 main 改动改变，以最新真实 content 为准，但 MDX 改造不能制造新 issue。

---

## 7. 两个独立 Review 子 Agent

主 Agent 在所有自动测试通过后，必须启动两个**只读审核子 Agent并行执行**。

### Review Agent R1 — Architecture / Content Boundary

只读审核：

- Lesson runtime/source boundary。
- generated registry。
- no dual source。
- MDX whitelist / expression restrictions。
- Activity API。
- filesystem/domain coupling。
- 是否出现不必要抽象。

输出：

```text
Critical
Major
Minor
No issue
```

每项附文件和原因。

### Review Agent R2 — Product / Regression / Test Quality

只读审核：

- progressive hints。
- Preview UX 保留。
- checker diagnostics。
- E2E 是否真正覆盖行为而不是 class。
- content:check / test:content 是否可能漏报。
- current exercise reference correctness。

同样输出 severity + 文件定位。

### 主 Agent处理

- Critical/Major 必须修。
- Minor 逐项判断并记录。
- 修复后重新跑完整验证。
- 不允许“两个 reviewer 都过”替代自动测试。

---

## 8. 最终验证命令

必须全部执行：

```bash
pnpm content:check
pnpm test:content
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
git status --short
```

预期：

```text
content:check PASS
test:content PASS
lint PASS
build PASS
e2e PASS
diff-check PASS
```

`git status --short` 可以显示本任务预期未提交修改；在最终 commit 后应 clean。

---

## 9. 禁止通过降低测试标准“修绿”

失败时禁止：

- delete/skip E2E。
- 把 strict assertion 改成无意义 visible。
- 移除 contract rule。
- 把 error 改 warning。
- 让 generator build 时偷偷刷新。
- 删除 diagnostics 字段规避类型问题。
- 恢复 full URL Exercise API。

必须修真实实现。

---

## 10. 临时文件清理

确认没有：

```text
.github/workflows/*temporary*
.github/workflows/*demo-validation*
test-results/
playwright-report/
debug scripts
scratch files
```

仓库 workflow 保持正式配置。

---

## 11. 最终完成报告

Codex 必须报告：

1. Lesson metadata/source boundary。
2. MDX registry generation。
3. MDX authoring contract。
4. Activity v1 API。
5. content:check / test:content。
6. Studio health。
7. old Markdown cleanup。
8. learner UX retained：
   - hints
   - preview
   - diagnostics
9. Review Agent R1 findings + resolution。
10. Review Agent R2 findings + resolution。
11. `pnpm content:check`。
12. `pnpm test:content`。
13. `pnpm lint`。
14. `pnpm build`。
15. `pnpm test:e2e`。
16. remaining risks。

---

## 12. Merge-ready Acceptance Criteria

- [ ] 00 文档全部 hard gate 满足。
- [ ] Task 01-05 criteria 满足。
- [ ] 两个独立 reviewer 无 unresolved Critical/Major。
- [ ] 当前 branch 已同步最新 main。
- [ ] 完整验证全绿。
- [ ] 无临时 workflow/debug 文件。
- [ ] 当前分支可以作为正式 MDX Learning Flow v1 基线。

完成后停止。

不要自动 merge main。
不要自动启动 M6A。
