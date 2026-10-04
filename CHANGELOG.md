# 更新说明（CHANGELOG）

## 0.2.0（2026-10-04）

- **新增：管理子代码库（发现 + 切换 + worktree 归组）**。会话工作目录下有多个仓库时，Git 面板顶栏在 Git 标题与分支胶囊之间显示「仓库」切换器：
  - 宿主新增 `listRepos` op：扫描会话工作目录的子目录（深度 1）与孙目录（深度 2），`depth` 缺省 2、可传 1–4，非法值落缺省、越界钳制；`.git` 为目录（主仓）或文件（linked worktree）都能识别。
  - 按 `git rev-parse --git-common-dir` 归组，由 `git worktree list` 补全每个检出的分支 / 短哈希，组内区分主仓（`main`）与附加检出（`linked`）。
  - 会话根不是仓库但发现了子仓库时自动进入第一个子仓库（顺带修复此前「非仓库根直接报错」）；只有一个仓库且会话根就是该仓库时切换器隐藏，单仓界面不变。
  - 手动切换仓库时清空右栏差异、提交详情与提交说明草稿等残留，避免跨仓误提交。
  - 过滤：会话根之外、目录已不存在、bare、以及 submodule 的 `.git/modules` gitdir 幽灵条目都不入列；目录仍在但 git 标记失效（`prunable`）的条目保留并标注「⚠ 疑似失效」。
  - 防护上限：repos ≤ 50（超出按相对路径排序取前 50）、遍历目录条目 ≤ 5000、整体 ≤ 10 秒；超时返回已扫描到的部分结果，切换器首行提示截断原因（`repos` / `dirs` / `timeout`）。
  - 扫描不进入 `node_modules` 等忽略目录、以 `.` 开头的目录与符号链接（Windows junction 同样跳过）。
  - 切换器条目文案（验收修订）：选项以仓库名为主，形如 `仓库名（分支）`；根仓追加「· 根」、嵌套仓追加「· 相对路径」用于消歧；detached HEAD 显示「游离 短哈希」。
  - 切换器弹层配色（验收修订）：原生 select 弹层条目的文字颜色继承透明叠加层（color:transparent）导致白底白字不可见（子仓看似「没扫出来」）；为 option 追加显式主题令牌配色，仓库/分支两个下拉一并修复，亮/暗主题自适应。
  - 下拉风格统一（验收修订）：仓库胶囊补齐图标（内联 SVG 文件夹剪影，与分支胶囊同为「图标 + 名称 + 折叠符」）；修复分支下拉分组标签（本地分支/远程分支/标签）因继承透明色渲染为空白行的问题（optgroup 追加显式配色）。
- **文档**：README / README.en 补充子代码库说明、仓库切换器行为与多仓库 / worktree 布局指南；版本号提升到 `0.2.0`。

## 0.1.6（2026-09-22）

- **修复：dsh 0.1.7-alpha.1 下 Git 页签整页崩溃（“读取不到目录”的真正原因）**。该版本把分支图标导出由
  `IconBranchOutline16` 改名为 `IconBranchOutlineRegular` / `IconBranchOutlineMedium`，插件直接渲染了被删除的
  `primitives.IconBranchOutline16`，于是 React 收到 undefined 元素类型抛出 #130，整个 `conversation.view`
  被错误边界替换成空白。现改为运行时按存在的导出回退解析（`IconBranchOutline16 → Regular → Medium → 空组件`），
  新旧 dsh 均可渲染。
- 新增回归测试 `test/primitives-compat.test.js`：分别用 0.1.6 / 0.1.7 / 未来无该导出的三种 primitives 形状断言
  图标解析，并扫描构建产物确保没有把被删除的 primitive 直接当作 JSX 类型使用。
- 说明：0.1.5 的会话 `cwd` 修复（`props.sessionId`）仍然有效，本次崩溃掩盖了它。

## 0.1.5（2026-09-18）

- **修复：dsh 0.1.6-alpha.2 下 Git 面板读不到当前目录**。该版本从会话列表 store
  （`useSessions` / `SessionListState`）移除了 `current` 字段，而插件原先靠 `s.current` 取当前会话的
  `cwd`，取值恒为空，面板因此找不到仓库。现改为优先读取 `conversation.view` 槽位提供的 `sessionId`
  （`s.byId[sessionId]?.cwd`），并保留 `s.current` 作为旧运行时回退；Git 视图与文件视图里的同一段
  选择器一起修正。
- 新增回归测试 `test/client-cwd.test.js`：从构建产物中提取选择器，分别在 0.1.6-alpha.2 与旧版 store
  形状下断言 cwd 解析。

## 0.1.4（2026-09-14）

- **新增：分支 / 标签统一下拉**：顶栏的分支胶囊改为一个下拉框，用 `<optgroup>` 分组列出「本地分支 / 远程分支 /
  标签」；选项值带 `branch:` / `tag:` 前缀（分支与标签可能同名），据此分别调用 `switchBranch` 或新增的
  `switchTag`（`git switch --detach refs/tags/<name>`，检出为 detached HEAD）。
- `tags` op 现在额外返回 `current`（当前检出的标签，仅在 detached HEAD 时非空），胶囊据此回显当前 ref
  （在标签上时显示标签名，而不是 `HEAD (no branch)`）。
- **自举保护**：`status` 新增 `self` 字段（该目录是否就是插件自身的源码树）。当面板指向插件自己的仓库时，
  从下拉框选标签会先弹确认（提示会替换正在运行的插件前端代码）——此前直接检出 `v0.1.1` 会让插件实时退回旧
  版本，表现为分支按钮弹出旧的页内菜单；选分支不拦截，保证能一键切回。

## 0.1.3（2026-09-03）

- **移动端适配（Git 视图）**：窄屏下面板自动单列堆叠、历史区固定约 5 行（178px）、底部提交栏由「挤压状态卡」改为堆叠布局、预留底部安全区（修复根节点与提交栏安全区内边距被重复叠加的问题）。
- **原生分支选择器**：统一桌面与移动端——点击分支胶囊调用 `showPicker()` 打开原生 `<select>`（隐藏的原生 select 覆盖层，而非叠加自绘胶囊）；修复 `branchSelectRef` 声明在 `DiffView` 导致的白屏；长分支名完整显示（不再截断）。
- **交互与兼容**：`patch-client.mjs` 作为权威构建产物；文件行显示指针光标（而非文本 I-beam）；Git 视图内隐藏 dsh-pocket 的「复制文件」按钮，并阻止 dsh-pocket 文件守卫截获 Git 文件行的点击。
- **发布说明**：`package.json` 版本提升到 `0.1.3`，tag `v0.1.3` 已推送，npm 已发布 `dsh-git-graph@0.1.3`（含 provenance）；**GitHub 未为该 tag 创建 Release**（此前仅 `v0.1.1`、`v0.1.2` 有 Release）。

## 0.1.2（2026-09-03）

- **修复**：dsh `0.1.2-alpha.5` 会话区新增的「可调宽面板」手柄（`data-width-handle`）在全屏 Git 页签上显示为
  竖条——在 Git 视图激活时将其隐藏（`[data-conversation-scroll]:has([data-git-view]) ~ [data-width-handle]`，
  仅影响 Git 页签，聊天/轨迹视图的可调宽面板不受影响）。
- **准备收录**：新增 `screenshots.json`（市场详情页截图声明，指向 `docs/screenshots/git-panel.png`）；
  仓库添加 `dsh-plugin` topic；`cordis.patch.yml` 注释更新为 Git 专用。

## 0.1.1（2026-09-03）

- **改为 Git-only**：移除「文件」浏览/编辑页签与 `/fs` API（原 CodeMirror 文件编辑器在 dsh `0.1.2-alpha.5`
  运行时上会触发 MutationObserver 死循环，先整体下线；宿主 `/fs` 代码保留，便于以后恢复）。
- **兼容性**：
  - 检测 alpha.5 的批处理 boot manifest（`window.__DSH_BOOT__.batches`），该运行时下文件编辑器自动降级为
    备选渲染（无 MutationObserver）；rc.2 保留完整 CodeMirror。
  - 宿主重复路由优雅跳过（桌面/其它插件已注册 `/git`、`/fs` 时不再崩溃）。
- **npm ↔ GitHub 关联 + CI**：`package.json` 增加 `repository`/`homepage`/`bugs`（指向 GitHub 仓库）；
  `.github/workflows/ci.yml`（push/PR 跑测试，Node 20/22）+ `release.yml`（打 `v*` 标签自动
  `npm publish --provenance`，tag 版本须与 package.json 一致）。
- **文档**：中英 README 精简为 Git-only 描述；加入 Git 面板截图
  （`docs/screenshots/git-panel.png`，从桌面工程 git 历史恢复）；发布元数据同步。
- **测试**：改为 git-only 断言（`apply()` 只注册 `/git`；`/fs` 返回 `no-route`）。

## 0.1.0（2026-09-02）

- **初始发布**（unscoped `dsh-git-graph`）：打包「Git + 文件浏览」为可安装的 dsh bundle 插件。
  - Git：状态 / 分支 / 差异 / 暂存 / 提交 / 推送拉取 / 提交图 / 溯源等 `/git` JSON API + 浏览器 Git 页签。
  - 文件浏览：`/fs` tree/read/write + 文件树 / 预览 / 编辑页签（后于 0.1.1 下线）。
  - 加固：大文件/超长单行守卫（`tooBig`）、`/fs` 越界拦截（`invalid-path`）、宿主路由注册容错。

---

## 备注

- 曾以 scoped 名 **`@enoughpower/dsh-git-graph`** 发布过 `0.1.0`/`0.1.1`；由于 2FA 绕过 token 无法执行
  撤包（npm 限制），该包仍在 registry 上，**请使用 unscoped 的 `dsh-git-graph`**。
- 发布流程：`npm version patch && git push --tags` → GitHub Actions 自动测试、发布到 npm（带 provenance）并创建对应的 GitHub Release。
