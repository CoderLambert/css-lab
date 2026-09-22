# Editor Experience 重构方案归档

- Date: 2026-09-22
- Branch: `main`
- Delivery scope: 将本地 CSS Editor Experience 实施方案纳入仓库版本管理，并在推送前确认它与最新远程代码可共同通过项目验证。

## 改动目标

保存 `docs/功能文档/编辑器重构方案.md`，让后续实现 CSS autocomplete、缩进、格式化、Color Swatch 和 CodeMirror integration 重构时，可以追溯原始目标、架构边界、依赖决策和验收标准。

本次只归档方案，不实施其中的 Editor Experience 功能，也不修改运行时代码或依赖。

## 实际改动

| 文件或区域 | 模块 | 实际变更 |
| --- | --- | --- |
| `docs/功能文档/编辑器重构方案.md` | Feature specification | 新增 Editor Experience 的完整范围、非目标、依赖、组件边界、CodeMirror 设计和验证要求。 |
| `docs/变更记录/2026-09-22-editor-refactor-plan.md` | Delivery record | 记录本次文档归档的目标、实际文件、验证结果和同步边界。 |

## 关键实现

方案文档明确保持现有数据流：

```text
CodeMirror
→ onChange
→ useExerciseProgress.updateCss
→ React css state
→ Preview
→ IndexedDB
```

同时将未来实现限制在 CSS editor experience，排除 Monaco、CSS LSP、通用 IDE、全局状态和与当前学习产品无关的基础设施。文档包含建议文件边界、依赖选择、React/CodeMirror lifecycle 约束及手动验收清单。

## 行为与兼容性

No runtime behavior change。

该方案是后续任务输入，不表示其中功能已经实现。文档加入版本库不会改变 Next.js 路由、客户端 bundle、IndexedDB schema 或学习流程。

## 验证

| 命令或检查 | 结果 |
| --- | --- |
| 敏感信息模式扫描 | Passed；未发现 API key、password、authorization header 或 private key。 |
| `pnpm install --frozen-lockfile` | Passed；lockfile 无变化。 |
| `pnpm lint` | Passed。 |
| `pnpm build` | Passed；远程 Zod schema 更新与本地 M5 组合后生产构建成功。 |
| `git diff --cached --check` | Passed。 |

## 风险、限制与后续

- 方案中的 Editor Experience 尚未实施；未来执行时仍需重新核对当时安装的 React、Next.js 和 CodeMirror API。
- 本地 M5 commit 已在推送前 rebase 到最新 `origin/main`，没有使用 force push。
- 最终远程同步结果和 commit SHA 由提交后的交付报告记录，避免在同一 commit 文档中形成自引用。
