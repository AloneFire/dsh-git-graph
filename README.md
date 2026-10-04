# dsh-git-graph

> DeepSeek Harness 集成 **Git** 视图的插件。

`dsh-git-graph` 把 Git 操作（状态 / 分支 / 差异 / 提交 / 推送拉取 / 提交图 / 溯源）打包成一个可直接安装的
dsh 插件。宿主半注册 `/git` JSON API，浏览器半在会话区域加一个 **Git** 页签，打开与当前会话工作目录
绑定的面板（分支栏 + 提交图 + 变更文件 + 差异视图）。界面文案中英双语（跟随 dsh locale 服务）。

> **移动端适配**：Git 页签在手机（dsh-pocket 代理）上也可见，窄屏下自动**单列堆叠**（历史图 → 变更文件 →
> 差异）、压缩顶栏与字号、放大触控目标；桌面宽屏保持三栏布局。

---

## 特性

### Git 操作（`/git`）
- **工作区状态**：`status` 返回分支信息 + 已暂存 / 未暂存 / 未跟踪三类文件，逐文件标注状态码（`XY`）。
- **分支管理**：列出本地/远程分支（`branches`）、切换（`switchBranch`）、新建（`newBranch`）、
  删除（`deleteBranch`）、重命名（`renameBranch`）、合并（`merge`，可选 `--no-ff`）。
- **分支 / 标签统一下拉**：顶栏一个下拉框用分组（`<optgroup>`）同时列出「本地分支 / 远程分支 / 标签」，
  选中分支走 `switchBranch`、选中标签走 `switchTag`（检出为 detached HEAD）。`tags` 会标注当前检出的标签，
  胶囊据此回显当前 ref（在标签上时显示标签名，而不是 `HEAD (no branch)`）。若面板指向的是**插件自身的仓库**，
  选标签会先弹确认（避免把正在运行的插件前端换成旧版本）；选分支不拦截，方便一键切回。
- **差异与提交**：`diff`（工作区 / 已暂存）、`stage` / `unstage` / `discard` / `remove`、
  `commit`（提交选中文件或全部）、`amend`。
- **历史与溯源**：`log`（oneline 列表）、`graphLog`（带父提交的提交图）、`fileLog`（单文件历史）、
  `blame`（逐行溯源）、`show` / `showStat` / `showFiles` / `showFileDiff`（提交详情与单文件差异）、
  `catFile`（读指定 ref 或工作区文件内容）。
- **远程与标签**：`push` / `pull` / `fetch`（可 `prune`）、`remotes`、`tags`、`conflicts`。

> 大 diff 截断到 2 MiB，避免超大差异冻结传输与前端渲染。

### 子代码库切换（会话工作目录内）

- **发现**：扫描会话工作目录的子目录（深度 1）与孙目录（深度 2）中的 git 仓库；`.git` 为目录（主仓）或文件（linked worktree）都能识别。
- **归组**：先按 `git rev-parse --git-common-dir` 把仓库归组，再由 `git worktree list` 列出组内全部检出（主仓 + `git worktree add` 产生的附加检出），区分主仓（`main`）与附加检出（`linked`）。
- **切换**：顶栏「仓库」切换器列出发现的仓库，切换后状态 / 分支 / 差异 / 提交图整面板跟随。
- **边界**：只管理会话工作目录**之内**的仓库；位于会话根之外的兄弟 worktree 不会出现在列表；worktree 的增删管理不在本版本范围内。

---

## 界面截图

![Git 面板：分支栏 + 提交历史 + 变更文件 + 差异视图](./docs/screenshots/git-panel.png)

---

## 兼容性

| 项 | 要求 |
|---|---|
| dsh（宿主） | `>= 0.1.0-rc.5` |
| Node.js | `>= 20` |
| git | `>= 2.28`（`git init -b` 需要；分支/合并/日志等日常操作 2.x 均可） |
| 平台 | 宿主（Node）+ Web（浏览器） |

---

## 安装

该插件是 **bundle 插件**（`package.json` 声明 `dsh.bundle` + `cordis.patch.yml`，并声明 `dsh.client`），
装好后宿主层与浏览器层都会被自动激活。

```sh
# 本地目录
dsh plugin --profile web add /path/to/dsh-git-graph

# 或已发布的 npm 包
dsh plugin --profile web add dsh-git-graph
```

---

## 使用

1. 装好插件并在会话内打开一个工作区（仓库目录）。
2. 会话区域出现 **Git** 页签（对话轨迹右侧），点击进入 Git 面板。
3. 面板内：顶部分支栏 + 提交图；选中一个提交看详情（变更文件 / 差异）；选中工作区文件可暂存 /
   提交 / 丢弃。
4. 面板绑定「当前会话工作目录」。
5. 会话工作目录下有多个仓库时，顶栏会出现「仓库」切换器；会话根不是仓库时会自动进入第一个子仓库。

### 仓库切换器

- **显示条件**：至少发现 1 个仓库，且（仓库 ≥ 2 个或会话根本身不是仓库）。只有一个仓库且会话根就是该仓库时，切换器隐藏（保持原有单仓界面）。
- **自动进入首个子仓**：会话根不是仓库但发现了子仓库时，面板自动切到第一个子仓库（按相对路径排序，根仓库 `.` 排最前）；此前这种「非仓库根」会直接报错。
- **切换行为**：手动切换后，右栏差异、提交详情与提交说明草稿等残留会一并清空，避免把上一个仓库的内容或草稿带到新仓库；分支胶囊、提交图与差异视图随后刷新为新仓库数据。
- **条目文案**：`仓库名（分支）`；根仓追加「· 根」、嵌套仓追加「· 相对路径」用于消歧（单层子仓不追加）；detached HEAD 显示「游离 短哈希」。
- **失效条目**：worktree 目录仍存在、但 git 把该条目标记为失效（`prunable`，例如管理文件缺失）时，条目保留展示并追加「⚠ 疑似失效」；目录已被手工删除的注册表残留则直接过滤掉。
- **截断提示**：列表被截断时（仓库超过 50 个、遍历目录条目超过 5000 个，或整体扫描超过 10 秒），切换器首行显示一行不可选的「⚠ 列表已截断：原因」；原因取值为 `repos`（仓库数截断）、`dirs`（目录数截断）、`timeout`（超时，保留已扫描到的部分结果）；`repos` 与 `dirs` 可同时出现并以 `+` 组合，`timeout` 覆盖其余原因。

自检清单（对应上文的四种会话布局）：

1. 会话根是主仓且同级有 worktree：切换器出现多项，切换后分支胶囊 / 提交图 / 差异显示新仓库数据；
2. 会话根是含子仓库的目录：面板自动进入第一个子仓库；
3. 只有一个仓库且会话根就是它：切换器隐藏（界面与单仓版本一致）；
4. 会话根不是仓库且没有子仓库：维持原有的报错提示。

---

## 多仓库与 worktree 布局指南

面板一次管理一个仓库，但会自动发现会话工作目录内的其它仓库与其 worktree，供切换器选择。两种受支持的布局（代码不做特判，任选其一）：

**布局 A：同级布局（适合功能并行开发）**

```
workspace/            # 会话工作目录
├── proj/             # 主仓
├── proj-fix/         # proj 的 worktree（git worktree add ../proj-fix）
└── frontend/         # 无关仓库
```

`workspace/proj`、`workspace/proj-fix`、`workspace/frontend` 都会出现在切换器里；两个检出同组，分别标注为 `main` 与 `linked`。

**布局 B：主仓内部布局（临时 / 隐藏式 worktree）**

```
workspace/
└── proj/             # 主仓
    ├── .git/
    └── worktrees/
        └── fix/      # proj 的 worktree
```

主仓内部的 worktree 目录会让主仓 `git status` 多出一条 `?? worktrees/` 未跟踪记录。建好 worktree 后，建议把 `worktrees/` 写进主仓的 `.git/info/exclude`（只影响本机，不产生版本化文件），避免状态污染。

**扫描不会进入的目录**：`node_modules`、`.git`、`.dsh`、`.dsh-vision-router` 等忽略目录，以及所有以 `.` 开头的目录和符号链接（Windows 上的 junction 同样按符号链接跳过）。因此 `node_modules` 里的仓库不会被发现；pnpm 之类把仓库放进 `node_modules` 的布局请改用其它方式组织目录。

---

## JSON API

所有请求都是 `POST`，`content-type: application/json`。通用响应：

```jsonc
// 成功
{ "ok": true, "value": { /* 结果 */ } }
// 失败
{ "ok": false, "error": { "code": "git-error", "message": "..." } }
```

### `/git` 操作

| op | 请求 | 说明 |
|---|---|---|
| `status` | `{ path }` | 分支 + staged / unstaged / untracked 文件；`self` 标记该目录是否为插件自身源码树 |
| `staged` | `{ path }` | 仅已暂存（index vs HEAD）文件 |
| `branches` | `{ path }` | 本地/远程分支（当前、track 信息、ahead/behind） |
| `switchBranch` | `{ path, name }` | 切换分支（远程名自动退化为本地短名） |
| `switchTag` | `{ path, name }` | 切换到标签（检出为 detached HEAD） |
| `newBranch` | `{ path, name, base?, switch? }` | 新建分支，`switch` 为真时切过去 |
| `deleteBranch` | `{ path, name, force? }` | 删除分支（`force` → `-D`） |
| `renameBranch` | `{ path, name, oldName? }` | 重命名当前/指定分支 |
| `merge` | `{ path, name, noFf? }` | 合并分支，冲突时返回 `conflicts: true` |
| `diff` | `{ path, file?, staged? }` | 差异（截断到 2MiB） |
| `stage` | `{ path, files[] }` | 暂存指定文件 |
| `unstage` | `{ path, files[] }` | 取消暂存 |
| `discard` | `{ path, files[] }` | 丢弃工作区改动 |
| `remove` | `{ path, files[] }` | 物理删除（含未跟踪） |
| `log` | `{ path, n? }` | 最近提交列表 |
| `graphLog` | `{ path, n? }` | 提交图（含父提交、作者、日期、refs） |
| `fileLog` | `{ path, file, n? }` | 单文件历史 |
| `blame` | `{ path, file }` | 逐行溯源 |
| `catFile` | `{ path, file, ref?, workingTree? }` | 读某 ref 或工作区文件内容 |
| `commit` | `{ path, message, files[]? }` | 提交选中文件（缺省提交全部） |
| `amend` | `{ path, message? }` | 追加到上一提交 |
| `show` | `{ path, hash }` | 提交补丁 |
| `showStat` | `{ path, hash }` | 提交元信息 + stat + 补丁 |
| `showFiles` | `{ path, hash }` | 提交变更的文件名 |
| `showFileDiff` | `{ path, hash, file }` | 提交内单文件差异 |
| `push` | `{ path, branch?, setUpstream? }` | 推送 |
| `pull` | `{ path, rebase? }` | 拉取（`--ff-only`） |
| `fetch` | `{ path, prune? }` | 抓取远端 |
| `remotes` | `{ path }` | 远端列表（fetch/push URL） |
| `tags` | `{ path }` | 标签列表；`current` 为当前检出的标签（仅 detached HEAD 时非空） |
| `conflicts` | `{ path }` | 冲突文件列表 |
| `listRepos` | `{ path, depth? }` | 扫描 `path` 下的子代码库（子/孙目录；`depth` 缺省 2、可传 1–4），按 worktree 归组 |

`listRepos` 的返回结构：

- `root`：归一化后的扫描根；`rootIsRepo`：根下 `.git` 是否存在（文件或目录皆可）。
- `repos[]`：按相对路径排序（根仓库条目 `relPath` 为 `.`，排最前），每项含 `path` / `relPath` / `name` / `branch`（detached 时为空串）/ `head`（8 位短哈希）/ `group`（归组键）/ `worktree.role`（`main` 或 `linked`）/ `prunable`（非空 = git 给出的失效原因）。
- `truncated`：非空表示因防护而截断，取值为 `repos` / `dirs` / `timeout`；`repos` 与 `dirs` 可同时出现并以 `+` 组合，`timeout` 覆盖其余原因（表示已返回扫描到的部分结果）。
- 过滤规则：会话根之外、目录已不存在、bare、以及 submodule 的 `.git/modules` gitdir 幽灵条目都不会入列。
- 防护上限：repos ≤ 50、遍历目录条目 ≤ 5000、整体 ≤ 10 秒（扫描仅读取目录与执行只读 git 命令）。

---

## 目录结构

```
dsh-git-graph/
├── package.json        # 插件清单：dsh.bundle + dsh.client + 发布元数据
├── cordis.patch.yml    # 宿主激活 row（id=git-graph）
├── lib/
│   ├── index.js        # 宿主半：/git 路由 + 纯函数导出（可测）
│   └── client.js       # 浏览器半：Git 页签 UI（预编译单文件 bundle）
├── test/
│   ├── parse.test.js       # 纯函数单测（porcelain / 分支头解析）
│   └── integration.test.js # 真实仓库 + HTTP 端到端烟测
├── .github/workflows/  # CI + npm 发布（provenance）
├── README.md           # 中文文档
├── README.en.md        # English docs
└── LICENSE             # MIT
```

---

## 开发

```sh
# 运行测试（node 内置 test runner，无需额外依赖）
npm test

# 单跑某文件
node --test test/parse.test.js
node --test test/integration.test.js
```

- `test/integration.test.js` 会真实 `git init` 一个临时仓库、启动 `apply()`、用 HTTP 驱动 `/git`
  做端到端冒烟，结束后清理临时目录。要求 `git` 在 `PATH` 中。
- `lib/client.js` 是预编译产物（esbuild 单文件 bundle），本仓库直接复用桌面版已编译 bundle，
  宿主/浏览器两半用同一包名在 dsh 客户端模块系统里注册
  （`window.__ModuleLoader__.load({ id: "dsh-git-graph", factory })`）。
- CI（`.github/workflows/`）：push/PR 跑测试（Node 20/22）；打 `v*` 标签自动 `npm publish --provenance`
  （需 `NPM_TOKEN` secret，标签版本号须与 package.json 一致）。

---

## 安全

- 每个 `/git` 操作都限定在请求的 `path` 目录内执行，不引入任意 shell（走 `execFile` 参数数组）。
- 请求体上限 1MiB、`git` 输出缓冲 64MiB、diff 截断 2MiB，避免超大内容拖垮进程。
- `listRepos` 只读：不执行任何写操作，扫描范围限定在请求目录内（默认子/孙目录，最深 4 层），且有 50 仓 / 5000 目录 / 10 秒上限。
- **`git clean` 的防护边界**：把 worktree 放在主仓内部时，`git clean` 会跳过嵌套的仓库条目（输出 `Would skip repository`），但该防护**不覆盖同级布局**的 worktree；执行 `git clean -dfx` 前请自行确认目标目录范围。

---

## 许可证

[MIT](LICENSE)

更新说明见 [CHANGELOG.md](CHANGELOG.md)。
