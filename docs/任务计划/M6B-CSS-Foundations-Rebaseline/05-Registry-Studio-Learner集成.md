# Task 05 — Generated Registry / Studio / Learner Integration

## 1. 目标

在 9/32/100 content tree 已经全部符合 v2 后，把内容接入 current generator、Studio health 和 learner visibility，并验证 draft/published 边界。

## 2. Generated MDX Registry

使用 current main generator：

~~~bash
pnpm content:generate
~~~

目标：

- registry 能覆盖全部 32 Lessons。
- 不引用 source branch 的旧生成文件。
- 第二次生成 idempotent。

~~~bash
pnpm content:generate
git diff --exit-code -- src/features/learning/generated/lesson-content-registry.tsx
~~~

## 3. Content contract

完整运行：

~~~bash
pnpm content:check
pnpm test:content
~~~

重点验证：

- direct Lesson directory 全部有 lesson.json + lesson.mdx。
- stable IDs 全库唯一。
- sibling orders 无冲突。
- draft/published Exercise references 符合 MDX Learning Flow v1。
- effective published Lesson 只引用 published Exercises。
- draft Lessons 可以引用自己的 draft Exercises，但引用必须存在、slug 匹配、无重复。

## 4. Studio target state

迁移后 Studio 期望 inventory：

~~~text
Courses:             1
Modules:             9
Lessons:            32
Exercises:          100
Published Exercises: 3
~~~

blocking health：

~~~text
errorCount = 0
~~~

### Warnings

不要把 warningCount=0 当作机械目标。

curriculum source 的最终审核明确存在 capability-gap blocked draft Exercises，其中部分可能有空 checks。current Studio 对 draft Exercise without checks 会给 warning。

Task 05 必须生成 warning inventory：

- code。
- location。
- 对应 curriculum capability-gap。
- 是否预期。

允许预期 draft warnings；不允许：

- published Exercise without checks。
- browser unsupported language。
- multiple HTML。
- missing/unexpected solution。
- undeclared starter。
- source inspection failure。
- published-child-hidden 等未解释 publication 错误。

不得通过弱 checks 或降低 Studio severity 来消警告。

## 5. Solution / filesystem security regression

100 Exercise 扩容后仍必须保持结构安全：

- ContentReader 不读取 solution。
- learner route 不 import inspector。
- solution 不进入 client graph。
- canonical coursesRoot。
- ancestor no-symlink。
- final file no-symlink。
- regular-file only。
- root containment。
- source-only inspector failure 不返回部分结果。

已有 security E2E 不得删除或放宽。

## 6. Learner visibility

M6B 不自动 publish draft curriculum。

因此 production learner chain 应继续只暴露当前 published stable core。

至少验证：

- /learn 仍能进入第一个有效 published Exercise。
- draft Module/Lesson/Exercise 不能通过 learner route 打开。
- generated registry 包含 draft Lesson 不意味着 learner route 可访问。
- current 3 published Exercises navigation 正确。
- module/lesson order 调整后 published sequence 不被 draft siblings 阻断。

## 7. Build / bundle

32 MDX registry entries 会扩大 build input。

必须真实运行：

~~~bash
pnpm lint
pnpm build
~~~

不因 registry 变大改为 runtime filesystem读取 MDX，也不引入 CMS/API。

## 8. Documentation sync

更新 current README / AGENTS：

- CSS Foundations v1 已进入 9 Module / 32 Lesson / 100 Exercise source tree。
- 只有稳定核心 published；其余仍 draft。
- Exercise 全部是 v2 Workspace contract。
- CSS Foundations 当前课程选择仍是 fixed HTML + CSS-only。
- capability-gap content 不等于平台已支持对应 checker。

旧 curriculum Task 13 报告应保留历史事实，并追加 rebaseline 状态或新的 M6B final report；不要篡改历史验证记录称当时 E2E 已通过。

## 9. Acceptance Criteria

- [ ] registry 覆盖 32 Lessons。
- [ ] generator idempotent。
- [ ] content:check / test:content 通过。
- [ ] Studio inventory = 1/9/32/100，published Exercises = 3。
- [ ] Studio blocking errors = 0。
- [ ] warnings 全部被分类；无降低断言制造绿灯。
- [ ] draft learner route fail closed。
- [ ] published 3 Exercise chain 正常。
- [ ] solution/filesystem security regression 通过。
- [ ] lint / build 通过。
