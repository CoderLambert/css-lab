# MDX Learning Flow v1 基线收敛

- Date: 2026-09-23
- Branch: `feat/mdx-learning-flow-demo`
- Delivery scope: 将现有 MDX learner demo 收敛为可校验、可生成、可作为正式基线维护的 MDX Learning Flow v1。

## Change objective

消除 Lesson 正文的双路径读取，建立 `lesson.json` metadata 与 `lesson.mdx` teaching content 的清晰边界；同时把手工维护的 MDX registry、开放式 MDX 编译和 Exercise 完整 learner URL 依赖，收敛为自动生成、受控校验和 lesson-local 引用。

本次不引入 Workspace v2、HTML/JS 编辑、Browser Runtime v2 或 Checker Registry，也不修改 M6A 后续能力边界。

## Actual changes

| File or area | Module | What changed |
| --- | --- | --- |
| `src/lib/content/types.ts`, `src/lib/content/file/file-content-reader.ts` | Content domain | `Lesson` 仅保留 metadata 与 parent IDs；Reader 不再读取 `lesson.mdx` 正文。 |
| `src/lib/content/lesson-content-source.ts`, `src/lib/content/file/file-lesson-content-inspector.ts` | Source inspection | 新增 server-only 的窄 Inspector，只返回 lesson source 是否存在及是否为空。 |
| `src/features/studio/lib/content-health.ts`, `src/app/studio/page.tsx` | Studio Health | 通过依赖注入检查 missing/empty MDX；missing source 始终是 error，empty source 才按 published chain 区分 error/warning。 |
| `scripts/content/lesson-manifest.mjs`, `lesson-registry-source.mjs`, `generate-lesson-content-registry.mjs` | Content tooling | 扫描固定 content hierarchy，按 course/module/lesson slug 生成 deterministic static MDX registry。 |
| `src/features/learning/generated/lesson-content-registry.tsx` | Generated registry | 提交生成文件，使用静态 MDX imports 与 JSX switch；不使用动态 Component lookup。 |
| `src/app/learn/[courseSlug]/[moduleSlug]/[lessonSlug]/[exerciseSlug]/page.tsx` | Learner route | 使用 filesystem curriculum key 查找 generated registry，移除 `bodyMdxSource` workaround。 |
| `scripts/mdx/remark-lesson-contract.mjs`, `next.config.ts`, `src/mdx-components.tsx` | MDX compiler | 限制组件白名单、静态 props、Predict options、Exercise slug；拒绝 import/export、任意表达式、未知 JSX 与 H1，并保持 h2/h3 语义。 |
| `src/features/learning/components/mdx/lesson-activity-components.tsx`, `content/**/lesson.mdx` | Activity API | Exercise 改用 `slug/label/goal` 与 `./<slug>` sibling link；迁移 Compare literal props，移除 MDX learner absolute URL。 |
| `scripts/mdx/remark-collect-exercise-references.mjs`, `scripts/content/check.mjs`, `scripts/content/content-json.mjs` | Content validation | 强制 Lesson source 结构完整，读取窄 metadata context，并校验 Exercise target、slug、publication status、重复引用与 canonical sequence。 |
| `scripts/content/lesson-contract.test.mjs`, `scripts/content/lesson-reference.test.mjs` | Content tests | 使用 Node built-in test 覆盖合法/非法 MDX contract、fenced code 不误收集 Exercise，以及临时 content tree 的结构、registry、reference 和 sequence integrity。 |
| `scripts/content/lesson-manifest.mjs`, `src/features/studio/lib/content-health.ts` | Integrity boundary | Lesson manifest 不再静默忽略缺少 `lesson.json` 的目录；Studio 对 missing/empty `lesson.mdx` 使用最终 severity 语义。 |
| `docs/功能文档/MDX-Learning-Flow-v1-产品方案.md`, `docs/任务计划/MDX-Learning-Flow-v1/*.md` | Contract documentation | 回写 Lesson 双文件 invariant、canonical Exercise sequence、registry scalability trade-off、merge readiness 与 M6A 行为兼容边界。 |
| `package.json`, `pnpm-lock.yaml`, `.github/workflows/quality.yml` | Tooling / CI | 增加 `content:generate`、`content:check`、`test:content` 及 CI hard gates；移除 `react-markdown`。 |
| `src/features/learning/components/lesson-markdown.tsx`, `src/features/learning/lib/lesson-content-registry.tsx` | Legacy cleanup | 删除旧 Markdown renderer 与手工 registry。 |
| `e2e/learner-runtime.spec.ts`, `playwright.config.ts` | Learner regression | 覆盖唯一 H1、MDX Activity、Predict feedback、progressive hints、Preview presets 和 sibling navigation；支持通过环境变量指定 Playwright base URL。 |
| `AGENTS.md`, `README.md` | Project documentation | 记录正式 MDX content、authoring、generated registry 与 Exercise reference 规则。 |

## Key implementation

- Lesson runtime 与 Lesson source inspection 分离，避免把 MDX source、compiled content 或 filesystem path 放回 domain model。
- Registry locator 使用 `courseSlug/moduleSlug/lessonSlug`，stable ID 仍只承担 domain identity。
- Registry generator 只扫描固定层级、不跟随 symlink，并按 key 排序；生成文件经过 stale check，新增 Lesson 后无需修改 application source。
- MDX contract 通过同一套 Remark plugin 同时服务 Next build 与 `content:check`，避免运行时 eval 或第二套 validator。
- Exercise references 通过 MDX AST 和 VFile data 收集，不使用正则，因此 fenced code 中的示例不会被当成真实引用。
- `lessons/*` 下所有直接子目录都必须同时拥有 `lesson.json` 和 `lesson.mdx`；`exercise.order` 是 learner navigation 的唯一 canonical sequence，effective learner-visible Lesson 的 MDX references 必须完整、唯一且顺序一致。

## Behavior and compatibility

- Learner 页面继续保留 Concept、Predict、Compare、Exercise、progressive hints、Preview viewport presets 和 structured checker diagnostics。
- `Exercise` 的 MDX authoring API 从完整 `href/title` 改为 `slug/label/goal`；当前三个 Exercise 的 learner URL 保持不变。
- 旧 `react-markdown` 双栈被删除，Lesson 正文统一走 MDX generated registry。
- `StyleCheck.alsoAccepts`、当前 preview message protocol 和现有 Exercise v1 assets 保持不变，留给后续 M6A/Checker milestone 处理。
- generated static registry 是 v1 的可审查实现取舍；未来如出现可测量性能问题，可以迁移到 lazy/static-chunk loading，但不得改变 Lesson source 和 Activity authoring contract。

## Validation

| Command or check | Result |
| --- | --- |
| `pnpm content:generate` | Passed; repeated generation is idempotent. |
| `pnpm content:check` | Passed; 1 lesson checked. |
| `pnpm test:content` | Passed; 22 tests, including temporary filesystem integrity cases. |
| `pnpm lint` | Passed. |
| `pnpm build` | Passed; Next build completed successfully. |
| `CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 PORT=3100 pnpm test:e2e` | Passed; 5 tests. |
| `git diff --check` | Passed. |
| Targeted Prettier check for changed implementation files | Passed. |

## Risks, limitations, and follow-up

- 本机 3000 端口被 Invidious 占用，因此 E2E 使用 3100 端口验证；CI 默认仍使用 3000。
- Next webpack 输出了 MDX loader cache dependency warning，但 build 成功；这不是本次引入的功能失败。
- 用户已有的未跟踪目录 `docs/重构记录/` 未纳入本次提交。
- 本次仅完成 implementation-ready 交付，未创建 PR；官方 Quality Gate 尚未运行。
