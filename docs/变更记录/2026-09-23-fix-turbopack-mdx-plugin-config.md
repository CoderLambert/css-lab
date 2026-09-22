# 修复 Turbopack 下 MDX 合约插件加载失败

- Date: 2026-09-23
- Branch: feat/mdx-learning-flow-demo
- Delivery scope: 修复 `next dev` 在 Turbopack 下加载 MDX remark 插件时报不可序列化选项和空 preset 的问题。

## Change objective

`next dev` 使用 Next.js 16 Turbopack 启动时，直接把 remark 插件函数传给 `@next/mdx` 会触发 loader options 不可序列化错误。将插件改为字符串路径后，还需要让 loader 能够从模块默认导出中取得可执行的 unified preset。

本次只调整 MDX 插件的构建配置与导出形式，不改变课程内容契约或学习流程行为。

## Actual changes

| File or area | Module | What changed |
| --- | --- | --- |
| `next.config.ts` | Next.js / MDX integration | 使用基于项目根目录解析出的绝对插件路径，将可序列化字符串传给 `@next/mdx`。 |
| `scripts/mdx/remark-lesson-contract.mjs` | MDX lesson contract plugin | 保留命名导出并补充默认导出，使 `@next/mdx` loader 能正确加载 remark preset。 |

## Key implementation

Next.js 16 的 Turbopack 配置会把 MDX loader options 传给 Rust 侧处理，因此不能传入 JavaScript 函数。配置现在通过 `node:path` 的 `resolve(process.cwd(), ...)` 生成稳定的绝对模块路径，交由 `@next/mdx` loader 动态加载。插件同时提供默认导出，匹配 loader 对字符串插件的 `interopDefault` 加载约定。

## Behavior and compatibility

开发服务器可以在 Turbopack 下启动并渲染现有学习页面；课程内容检查、MDX 合约测试和生产构建行为保持不变。生产构建仍使用仓库既有的 webpack 脚本。

## Validation

| Command or check | Result |
| --- | --- |
| `pnpm lint` | Passed |
| `pnpm build` | Passed |
| `pnpm content:check` | Passed |
| `pnpm test:content` | Passed (11 tests) |
| `git diff --check` | Passed |
| `pnpm dev` + `curl http://localhost:3001/learn/css-foundations/flexbox/flexbox-alignment/center-box` | Passed; HTTP 200 and lesson content rendered. Port 3000 was occupied, so Next.js used 3001. |

## Risks, limitations, and follow-up

- 本次未重复运行 E2E；此前同一功能提交已通过 E2E，当前改动仅涉及 MDX loader 配置和插件导出。
- 未跟踪的 `docs/重构记录/` 是工作区中既有的其他记录，本次不纳入提交。
