# M6A v6 — Release compatibility

## Release unit

M6A 的 Exercise content/schema v2、Progress IndexedDB v2、Workspace Editor 与 Browser Runtime 必须作为一个 release compatibility unit 进入 `main`。

阶段提交只用于 review / bisect，不代表可逐阶段生产发布。

## Forward migration boundary

生产内容最终只使用 Exercise schemaVersion 2：

```text
exercise.json
starter/
solution/
WorkspaceDefinition
RuntimeDefinition
```

不保留 production Exercise v1/v2 dual-read。

Progress storage 最终 contract：

```text
database = css-lab
version  = 2
store    = exercise-progress
key      = [exerciseId, revision]
value    = files + status + timestamps
```

v1 的 `code -> files["style.css"]` 仅存在于 historical migration 与 migration tests。

## Safe rollback

一旦真实用户浏览器已经完成 IndexedDB v2 upgrade，或者 production content 已发布为 Exercise v2：

- 不能直接部署 M6A 之前的 Exercise v1 Reader。
- 不能把 `DATABASE_VERSION` 恢复成 1。
- 不能用 `deleteDatabase` 作为 rollback。
- 不能恢复长期 v1/v2 dual-read / dual-write。

安全 hotfix/rollback 必须继续理解 **Exercise v2 + IndexedDB v2**。

如果新 Browser Runtime / Workspace UI 出现生产问题，可以通过 forward-fix 或临时关闭新的 UI/Runtime path 缓解，但 content/storage compatibility boundary 必须保持 v2。

## Known forward-fix strategy

优先级：

1. 修复 Browser Runtime / Workspace UI，而不改变 Exercise v2 / DB v2。
2. 如需暂时降级 learner experience，仍从 v2 Workspace/Draft 派生受限体验。
3. 保留 v2 IndexedDB record 可读写，避免数据丢失。
4. 修复后恢复完整 Runtime path。

## Planned but not implemented

M6A 不包含：

- JavaScript Worker Runtime
- JavaScript Browser Runtime
- TypeScript Toolchain
- TypeScript type-check/no-runtime workflow
- generic VFS / IDE plugin architecture
