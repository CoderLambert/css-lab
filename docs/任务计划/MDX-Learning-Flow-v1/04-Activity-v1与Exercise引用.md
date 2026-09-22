# Task 04 — Activity v1 与 Exercise 引用收敛

## 并行属性

本任务属于 Parallel Wave 1，可与 Task 02、Task 03 并行。

只处理 Activity API / 当前 lesson.mdx / 直接相关 E2E。

---

## 目标

冻结 MDX Learning Activity v1：

```text
Concept
Predict
Compare
Exercise
```

重点消除 `Exercise` 对完整 learner URL 的耦合。

---

## 1. Activity v1 范围

本任务不新增 Activity。

保留：

### Concept

用途：

```text
解释 mental model / 核心概念
```

Props：

```ts
{
  title: string;
  children: ReactNode;
}
```

### Predict

用途：

```text
先预测 → 再反馈 → 修正 mental model
```

Props：

```ts
{
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}
```

保持当前 client interactive behavior。

### Compare

用途：

```text
两个概念/属性/代码的并列对照
```

保持当前 6 个 string props。

### Exercise

改为 lesson-local reference。

---

## 2. Exercise Activity 最终 API

删除：

```ts
href: string;
title: string;
```

改为：

```ts
interface ExerciseActivityProps {
  slug: string;
  label: string;
  goal: string;
}
```

### 为什么是 label

`exercise.json.title` 是 Exercise domain 的标题事实源。

MDX 中的 `label` 是教学叙事中的展示文案，可以一致，也允许为了语境略有不同。

不要把两个来源都叫 `title` 制造“哪个才是真 title”的语义歧义。

---

## 3. Link 生成

当前 Lesson MDX 只在：

```text
/learn/<course>/<module>/<lesson>/<current-exercise>
```

路由内渲染。

使用 lesson-local sibling href：

```tsx
<Link href={`./${slug}`}>
```

不要在 component 中：

- hardcode `/learn`。
- reconstruct course/module/lesson slugs。
- 调用 ContentReader。
- 引入 global routing registry。
- 使用 pathname parsing。

`./<slug>` 在当前 exercise route 下解析为同 Lesson sibling exercise。

如果实际 Next Link 行为经测试发现该形式不满足路由语义，允许主 Agent改用最小 route-context prop，但必须在集成报告中说明；不得直接退回 MDX 完整 href。

---

## 4. 当前 lesson.mdx 迁移

所有：

```mdx
<Exercise
  href="/learn/..."
  title="..."
  goal="..."
/>
```

改成：

```mdx
<Exercise
  slug="center-box"
  label="水平与垂直居中"
  goal="..."
/>
```

三个当前 Exercise 都如此。

---

## 5. Heading 调整

当前 lesson.mdx 顶部：

```md
# 先判断轴，再选择属性
```

必须改为 H2 或移除。

推荐：

```md
## 先判断轴，再选择属性
```

其余 section hierarchy 要保持语义合理。

不要依赖 renderer 把 H1 降级。

---

## 6. MDX 文件中的职责说明更新

当前末尾类似：

```text
MDX 这里只负责……
```

可以保留，但更新为正式措辞：

```text
MDX 负责教学叙事与 Activity 编排；
Exercise 的 starter/checks/solution 由 Exercise source 负责。
```

不要继续称其为 Demo 临时说明。

---

## 7. Exercise reference 存在性

**本 Agent 不实现 filesystem validation。**

Task 05 的 `content:check` 会验证：

```mdx
<Exercise slug="center-box" />
```

必须对应同目录：

```text
exercises/center-box/exercise.json
```

本任务只收敛 API。

---

## 8. UI 风格

保持当前已经确定的去卡片化方向：

- Concept：轻背景/左强调线。
- Predict：功能区块，可有明确边界。
- Compare：轻量双栏，不做重卡片嵌套。
- Exercise：课程 item / link row，不做大 Card。

不要在本任务重新设计 Workspace layout。

---

## 9. E2E 调整

更新 learner runtime E2E 中与以下有关的断言：

- Lesson heading 语义。
- Exercise Activity link 可以正常跳转到 sibling exercise。
- navigation sequence 原能力仍成立。

不要复制一套新 E2E 文件；优先扩展已有：

```text
e2e/learner-runtime.spec.ts
```

避免断言 Tailwind class。

使用 role / href / visible text。

---

## 10. 本任务禁止

- 不实现 registry generator。
- 不实现 MDX parser/validator。
- 不改 package。
- 不改 Preview。
- 不改 checker。
- 不改 hints。
- 不增加 Activity。
- 不增加 Context/Store 仅用于 Exercise link。

---

## 11. 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
git diff --check
```

搜索：

```bash
git grep -n '<Exercise' -- 'content/**/*.mdx'
git grep -n 'href="/learn' -- 'content/**/*.mdx'
```

第二条最终应无 MDX Exercise 命中。

---

## 12. Acceptance Criteria

- [ ] Exercise props 为 slug/label/goal。
- [ ] MDX 不再硬编码 learner absolute URL。
- [ ] Exercise link 正确跳到同 Lesson sibling。
- [ ] lesson.mdx 无 H1。
- [ ] Concept/Predict/Compare 行为无回归。
- [ ] 不增加新的 Activity。
- [ ] learner navigation E2E 通过。
