# MDX Learning Flow v1 — 产品方案

## 1. 文档定位

本文档定义 CSS Lab 当前阶段正式采用的 **MDX Learning Flow v1 产品方案**。

它回答：

- 产品为什么从“题目 + 编辑器”升级为“教学流 + 实验工作区”。
- Lesson、Exercise、Preview、Hint、Checker 各自承担什么教学职责。
- `Concept / Predict / Compare / Exercise` 四类 Activity 如何组合。
- learner 在一节课中的完整体验应该是什么。
- 哪些能力属于 v1，哪些能力明确延期。
- 后续 M6A 重构必须保留哪些已经确认的产品行为。

本文档是 **产品行为与教学体验的基线**。

实现任务与工程拆分见：

```text
docs/任务计划/MDX-Learning-Flow-v1/
```

如果实现细节与本文档的产品目标冲突，应先判断是否属于工程约束；不得为了实现方便静默改变本文档已经明确的 learner experience。

---

# 2. 产品方向

CSS Lab 不再定义为：

> 一个提供 CSS 题目、代码编辑器和自动检查的练习网站。

正式方向是：

> **一个通过解释、预测、观察、实现、诊断和反馈，帮助 learner 建立前端 mental model 的交互式学习实验室。**

核心价值不是“让用户写出某个属性”，而是帮助用户形成：

```text
概念
→ 预测
→ 操作
→ 观察
→ 实现
→ 检查
→ 诊断
→ 修正 mental model
```

的学习循环。

对于 CSS，这意味着 learner 不应只记忆：

```text
justify-content = 水平
align-items = 垂直
```

而应该理解：

```text
flex-direction
→ 主轴 / 交叉轴
→ justify-content / align-items
→ 视觉结果
```

这种“规则之间的关系”才是长期可迁移能力。

---

# 3. 为什么采用 MDX

传统课程模型通常把 Lesson 拆成：

```text
文章
题目
代码
测试
```

但真实教学过程需要在同一条叙事中混合：

- 解释。
- 代码。
- 可执行示例。
- 预测题。
- 对比。
- 练习入口。
- 后续可扩展的实验 Activity。

MDX 适合作为：

> **教学叙事与 Activity 编排层。**

例如：

```mdx
## 先判断轴，再选择属性

这里解释主轴和交叉轴。

<Concept title="Flexbox 的对齐模型">
...
</Concept>

<Predict
  question="..."
  options={["justify-content", "align-items"]}
  answer="align-items"
  explanation="..."
/>

<Compare
  ...
/>

<Exercise
  slug="center-box"
  label="水平与垂直居中"
  goal="..."
/>
```

MDX 在这里负责：

```text
教学顺序
+
教学叙事
+
受控 Activity 组合
```

而不是承担所有业务数据。

---

# 4. 内容职责边界

正式内容模型：

```text
lesson.json
= Lesson metadata

lesson.mdx
= 教学正文与 Activity 编排

exercise.json
= Exercise machine contract

workspace assets
= learner 实际编辑/运行内容

checker
= Exercise 验收

progress
= learner 学习状态
```

## 4.1 lesson.json

负责稳定 metadata：

- id。
- slug。
- title。
- description。
- estimatedMinutes。
- order。
- status。

其中：

> `lesson.json.title` 是页面唯一 H1。

MDX 不重复承担 Lesson identity。

---

## 4.2 lesson.mdx

负责：

- 教学解释。
- 概念层次。
- Activity 顺序。
- Exercise 在教学叙事中的出现位置。

它不负责：

- checker。
- starter。
- solution。
- persistence。
- learner progress。
- runtime implementation。

---

## 4.3 Exercise

Exercise 是独立机器可验证任务。

当前职责：

```text
prompt
hints
checks
fixture
base styles
starter
solution
```

MDX 中的 `<Exercise />` 只是对同 Lesson Exercise 的教学引用，不复制其 machine contract。

---

# 5. learner 核心体验

一节 Lesson 不应只是：

```text
阅读文章
→ 做题
```

推荐学习节奏：

```text
Explain
→ Predict
→ Compare / Observe
→ Exercise
→ Feedback
→ Hint
→ Retry
→ Continue
```

v1 不要求每个 Lesson 机械包含所有 Activity。

课程作者应该根据知识点决定节奏。

---

# 6. Learning Workspace 产品结构

Desktop 的一级结构：

```text
┌──────────────────────────────────────────────────────────────┐
│ Header                                                       │
├──────────────────────┬───────────────────────────────────────┤
│                      │                                       │
│ Lesson               │ Workspace                             │
│                      │                                       │
│ 教学正文              ├───────────────────┬───────────────────┤
│ Activity              │ Editor            │ Preview / Result  │
│ 当前 Exercise          │                   │                   │
│                      │                   │                   │
├──────────────────────┴───────────────────┴───────────────────┤
│ Action Bar                                                   │
└──────────────────────────────────────────────────────────────┘
```

核心原则：

> **Lesson 是教学文档；Editor 是主要操作区；Preview 是实验观察窗口。**

这三者不是等价的三个大卡片。

---

# 7. Lesson Panel

Lesson Panel 负责：

- Lesson title / description。
- 当前 Exercise 上下文。
- MDX 教学正文。
- Activity 内容。

要求：

- 可独立滚动。
- 不人为限制成过窄阅读列。
- 保持合理正文宽度，但充分利用左侧 pane。
- 不使用营销页式大卡片嵌套。
- 内容层级以 typography、divider、轻背景为主。

## 7.1 Heading 语义

页面：

```text
lesson.json.title → H1
```

MDX：

```text
## → H2
### → H3
```

MDX 禁止 H1。

这样避免：

```text
Markdown H1
→ UI 强行渲染成 H2
```

这种语义错位。

---

# 8. Activity v1

v1 正式支持四类 Activity：

```text
Concept
Predict
Compare
Exercise
```

它们是教学 primitive，不是任意 React component escape hatch。

---

## 8.1 Concept

### 目标

明确一个知识点背后的 mental model。

例如：

```text
flex-direction 决定主轴
justify-content 控制主轴
align-items 控制交叉轴
```

### 产品形式

- 轻背景。
- 左侧强调线。
- 不使用厚重 Card。
- 可以包含普通 Markdown children。

### 使用原则

Concept 应解释“为什么”，而不是只是重复定义。

---

## 8.2 Predict

### 目标

让 learner 在看到结果前先做判断。

学习过程：

```text
形成预测
→ 选择答案
→ 查看解释
→ 修正 mental model
```

这与直接运行代码不同：

```text
直接运行
→ 看到了结果

先预测
→ 暴露了自己的 mental model
→ 再验证
```

后者是 CSS Lab 教学价值的重要组成。

### v1 行为

- 多个选项。
- learner 选择后立即得到解释。
- 显示“预测正确”或“这个预测还不成立”。
- 不计入 Exercise completion。
- 不写入 ProgressStore。
- 不影响 Checker。

Predict 是教学互动，不是考试系统。

---

## 8.3 Compare

### 目标

帮助 learner 建立相近概念之间的差异。

典型内容：

```text
justify-content vs align-items
margin vs gap
absolute vs fixed
auto-fit vs auto-fill
```

### 产品形式

- 轻量双栏。
- 明确标题。
- 代码与解释并列。
- 不做两张巨大 Card。

---

## 8.4 Exercise

### 目标

把 learner 从解释带到真实 coding task。

MDX 使用：

```mdx
<Exercise
  slug="center-box"
  label="水平与垂直居中"
  goal="先建立 flex formatting context，再分别处理主轴与交叉轴。"
/>
```

产品职责：

- 告诉 learner“接下来要练什么”。
- 链接到同 Lesson 的 exercise。
- 保持 Exercise machine contract 独立。

禁止在 MDX 中硬编码完整：

```text
/learn/course/module/lesson/exercise
```

---

# 9. 当前 Exercise 上下文

learner 打开某一道 Exercise 时，Lesson Panel 应保留整个 Lesson 教学叙事，同时明确显示：

```text
Current exercise
title
prompt
```

目的：

> learner 应知道自己当前在整个知识结构中的位置，而不是进入一个脱离上下文的独立做题页面。

Hints 不在这里默认全部显示。

---

# 10. Progressive Hints

提示系统正式采用逐层揭示。

初始：

```text
不显示提示正文
```

用户点击：

```text
提示
→ 显示 Hint 1

提示 1/3
→ 显示 Hint 2

提示 2/3
→ 显示 Hint 3
```

## 10.1 提示设计原则

提示应从抽象到具体：

### 第一层

帮助定位问题领域：

```text
先确认容器已经进入 flex formatting context。
```

### 第二层

提示概念：

```text
row 下交叉轴是垂直方向。
```

### 第三层

给接近答案的实现方向：

```text
使用 align-items 控制交叉轴末端对齐。
```

避免第一条 Hint 就直接给最终代码。

---

# 11. Preview

Preview 不等于固定大小 iframe。

正式模型：

```text
Resizable Preview Panel
        ↓
Bounded Preview Canvas
        ↓
Browser Viewport
```

## 11.1 Panel

- 随 Workspace 布局调整。
- 用户可通过 panel resize 改变可用宽度。
- 不固定死 390px。

## 11.2 Canvas

高度保持 bounded：

```text
不要随着大屏高度无限增长
```

原因：

- Preview 是实验窗口，不应占据整页一千多像素。
- 下方空间用于 Check Results / Hints。

## 11.3 Viewport presets

v1 保留：

```text
Auto
390
768
1280
```

含义：

### Auto

viewport 跟随 Preview Panel 当前可用尺寸。

### 390 / 768 / 1280

模拟具体 viewport。

如果真实 viewport 大于 panel：

```text
按比例缩放呈现
```

而不是撑破布局。

这个能力后续会直接服务于：

- responsive design。
- media query。
- grid。
- container query 等课程。

---

# 12. Checker Feedback

Checker 的产品职责不只是：

```text
PASS / FAIL
```

而是帮助 learner回答：

> 我哪里不满足条件？这是我的实现问题，还是检测器自身出错？

---

## 12.1 mismatch

例如：

```text
当前实现还未满足全部条件

检测对象
.container · align-items

当前值
stretch

期望值
flex-end / end
```

并明确：

```text
检测器已正常执行；
这里是当前实现与验收条件不一致。
```

---

## 12.2 checker fault

如果出现：

- checker runtime error。
- selector 本应由固定 fixture 提供但没有找到。

应明确提示：

```text
这更可能是题目配置/检测规则问题，
而不是 learner CSS 本身。
```

不能把系统异常伪装成 learner answer failed。

---

## 12.3 Checker 的教学原则

如果题目目标描述的是：

```text
行为结果
```

checker 应尽量避免无必要地锁死唯一代码写法。

例如：

```css
align-items: flex-end;
```

与当前场景等价的：

```css
align-items: end;
```

不应该因为字符串不同就无条件判错。

v1 暂时通过现有兼容能力解决具体问题。

最终 Matcher / Contract Test 属于后续 Checker milestone，不在 MDX v1 扩展。

---

# 13. Editor

Editor 是 learner 的主要操作区域。

当前 CSS Lab：

- CodeMirror 6。
- CSS editing。
- format。
- autocomplete。
- color swatch。
- undo/redo。
- persistence。

MDX Learning Flow v1 不改变 Editor Domain。

后续 M6A 会扩展 Workspace 到 HTML + CSS，但不得改变当前产品关系：

```text
Lesson
→ 指导

Editor
→ 实现

Preview
→ 观察

Checker
→ 反馈
```

---

# 14. Action Bar

底部 Action Bar 保留高频学习动作：

```text
上一题
Reset
提示
检查答案
下一题
```

要求：

- 固定在 Workspace 底部。
- 不跟随 Lesson 文档滚动。
- Check 是主动作。
- Hint 是 learner 卡住后的辅助动作。
- Next 不应替代 Check，也不强制所有 learner 必须通过才导航，除非未来产品明确改变学习策略。

---

# 15. Progress

Progress 当前仍以 Exercise completion 为核心。

MDX Activity：

```text
Concept
Predict
Compare
```

v1 不写 progress。

原因：

当前优先验证教学流，不提前设计：

- 阅读完成率。
- Predict mastery。
- Lesson mastery。
- Quiz score。
- Activity-level analytics。

这些等真实产品需求出现后再设计。

---

# 16. Content Authoring Experience

课程作者创建 Lesson：

```text
lesson.json
lesson.mdx
exercises/
```

理想流程：

```text
创建 Lesson source
↓
编写 MDX
↓
引用同 Lesson Exercise slug
↓
pnpm content:generate
↓
pnpm content:check
↓
preview / e2e
↓
commit
```

## 16.1 MDX 是受控 DSL

课程作者不能：

```mdx
import AppComponent from "@/..."
<AppComponent />
{arbitraryJavaScript()}
```

只允许正式 Activity primitive。

原因：

- Content 与 Application Code 保持边界。
- 内容可长期维护。
- 课程作者不会无意依赖内部组件实现。
- build-time validation 可以真正保证内容 contract。

---

# 17. 产品与工程边界

下面是产品要求：

- Lesson 使用 MDX learning flow。
- progressive hints。
- responsive Preview。
- structured diagnostics。
- Activity v1。
- Lesson/Workspace 全屏布局。

下面是当前实现，但未来允许重构：

- MDX generated registry 的具体文件结构。
- Browser postMessage protocol。
- Preview iframe shell。
- checker result internal type。
- CodeMirror adapter。
- progress IndexedDB implementation。

原则：

> **产品行为稳定，底层实现可演进。**

---

# 18. 与 freeCodeCamp 的差异化

CSS Lab 会借鉴成熟学习平台的：

- 分步教学。
- 自动验证。
- project-based learning。
- 可运行示例。

但产品不追求复制其“大量 step instruction”模式。

重点差异：

## 18.1 不只告诉下一行写什么

避免课程长期变成：

```text
现在添加 display:flex
→ 下一步
现在添加 justify-content:center
→ 下一步
```

CSS Lab 更强调：

```text
为什么
→ 预测会发生什么
→ 自己实现
→ 观察失败
→ 诊断原因
```

## 18.2 Debugging 是教学的一部分

真正前端开发大量时间花在：

```text
为什么这个属性没生效？
```

因此 checker feedback、progressive hints、未来 Debug Activity 都应服务 mental-model correction。

## 18.3 Workspace 更接近真实前端实验

后续 HTML/CSS/JS/TS 扩展会继续使用：

```text
Content
→ Workspace
→ Runtime
→ Checker
```

而不是为每种语言重新造一套课程系统。

---

# 19. v1 明确不做

MDX Learning Flow v1 不实现：

- Explore。
- Debug Activity。
- Workshop。
- Quiz。
- Review Activity。
- Certification。
- AI tutor。
- Activity analytics。
- mastery scoring。
- adaptive learning。
- HTML Editor。
- JS Runtime。
- TS Runtime。
- Exercise Contract Runner。
- 最终 Checker Matcher framework。

这些都不能为了“产品看起来完整”在当前分支提前加入。

---

# 20. v1 成功标准

MDX Learning Flow v1 达成的不是“Activity 数量多”，而是：

## 内容层

- 新 Lesson 可以只通过 content source 加入。
- Lesson 有稳定 metadata + MDX teaching flow。
- 内容错误在 build/CI 前被发现。

## learner 层

- 能读懂知识上下文。
- 能进行 Predict。
- 能看 Compare。
- 能进入 Exercise。
- 卡住时获得 progressive hint。
- 失败时知道 checker 看到了什么。
- 可以在合理 Preview viewport 中观察结果。

## 工程层

- MDX 不依赖任意 app imports。
- 不存在双 Lesson content path。
- registry 自动生成。
- Studio 能发现 missing/empty lesson content。
- lint/build/content check/e2e 全部成为质量门禁。

---

# 21. 后续演进原则

v1 合入 main 后，不立即继续扩展 Activity 数量。

后续根据真实课程内容逐步增加。

优先级应由教学需求驱动，例如：

### 可能的 Explore

适用于：

```text
flex-direction
justify-content
align-items
```

让 learner 操纵参数并观察轴变化。

### 可能的 Debug

适用于：

```text
justify-content 不生效
vertical center 不生效
position sticky 不工作
```

给错误代码，要求定位原因。

### 可能的 Quiz

用于检测概念理解，不替代 coding exercise。

但新增任何 Activity 前必须回答：

1. 当前四个 primitive 是否真的不能表达？
2. 是否至少有真实课程内容需要？
3. 是否有清晰的 learner outcome？
4. 是否值得增加新的 content contract 与测试成本？

---

# 22. 与 M6A 的关系

MDX Learning Flow v1 合入 main 后，M6A 继续解决：

- Workspace Domain。
- HTML + CSS editing。
- Exercise v2。
- Progress v2。
- ExecutionSnapshot。
- Browser Runtime。
- Security boundary。

M6A 必须把本文档确认的能力视为既有产品基线：

```text
MDX Lesson
Progressive Hints
Preview viewport UX
Structured checker diagnostics
Lesson + Workspace layout relationship
```

允许替换：

```text
PreviewFrame internals
runtime protocol
Exercise assets
Progress persistence schema
Editor internals
```

不允许在技术重构中无意删除已经确认的教学能力。

具体约束见：

```text
docs/任务计划/MDX-Learning-Flow-v1/07-M6A-衔接约束.md
```

---

# 23. 产品决策摘要

当前已经确定：

```text
Lesson 正文        → MDX
Lesson metadata    → JSON
教学编排           → MDX Activity
Activity v1        → Concept / Predict / Compare / Exercise
Exercise 引用      → lesson-local slug
页面 H1            → lesson.json.title
MDX heading        → 从 H2 开始
Hints              → progressive reveal
Preview            → resizable panel + bounded viewport
Viewport presets   → Auto / 390 / 768 / 1280
Checker feedback   → structured diagnostics
Progress           → Exercise completion 为主
MDX authoring      → controlled DSL
Registry           → generated static registry
```

当前没有确定、不得提前固化：

```text
最终 Checker matcher DSL
Activity mastery model
Quiz / Workshop schema
AI teaching model
JS/TS runtime model
Workspace v2 最终 UI 细节
```

这份边界应作为后续产品和工程决策的共同基线。
