# dsh-git-graph

> A DeepSeek Harness plugin that integrates a **Git** view.

`dsh-git-graph` packages Git operations (status / branches / diff / commit / push-pull /
commit-graph / blame) into a single installable dsh plugin. The host half registers a `/git` JSON API;
the browser half adds a **Git** tab to the session area, opening a panel bound to the current session's
working directory (branch bar + commit graph + changed files + diff view). The UI copy is bilingual
(Chinese / English), following the dsh locale service.

> **Mobile**: the Git tab is also available on phones (via dsh-pocket); on narrow screens the panel
> auto-stacks to a single column (history → changed files → diff), with a compact header and bigger
> touch targets. Wide screens keep the three-column layout.

---

## Features

### Git operations (`/git`)
- **Workspace status**: `status` returns branch info plus the staged / unstaged / untracked split,
  each file annotated with its porcelain status code (`XY`).
- **Branch management**: list local & remote branches (`branches`), switch (`switchBranch`), create
  (`newBranch`), delete (`deleteBranch`), rename (`renameBranch`), merge (`merge`, optional `--no-ff`).
- **Unified branch/tag picker**: one top-bar dropdown groups local branches, remote branches and tags
  (`<optgroup>`); picking a branch runs `switchBranch`, picking a tag runs `switchTag` (a detached-HEAD
  checkout). `tags` annotates the checked-out tag, and the capsule reflects the current ref (the tag name
  instead of `HEAD (no branch)` while on a tag). When the panel points at the **plugin's own repository**,
  picking a tag asks for confirmation first (so the running frontend is not silently swapped for an older
  release); branch picks are not gated, so getting back onto a branch stays one click.
- **Diff & commit**: `diff` (worktree or staged), `stage` / `unstage` / `discard` / `remove`,
  `commit` (selected files or all), `amend`.
- **History & blame**: `log` (oneline list), `graphLog` (commit graph with parents), `fileLog`
  (per-file history), `blame` (line-by-line attribution), `show` / `showStat` / `showFiles` /
  `showFileDiff` (commit details & per-file diff), `catFile` (read a ref or a worktree file).
- **Remote & tags**: `push` / `pull` / `fetch` (optional `prune`), `remotes`, `tags`, `conflicts`.

> Large diffs are truncated to 2 MiB so huge changes cannot freeze transport or the frontend renderer.

### Sub-repositories (inside the session working directory)

- **Discovery**: scans the session working directory's child (depth 1) and grandchild (depth 2) directories for Git repositories; a `.git` directory (main repository) or a `.git` file (linked worktree) is recognized.
- **Grouping**: checkouts are first grouped via `git rev-parse --git-common-dir`, then `git worktree list` lists every checkout in the group (the main repository plus checkouts created by `git worktree add`), each labelled `main` or `linked`.
- **Switching**: the "repo" switcher in the top bar lists the discovered repositories; switching re-points status / branches / diff / commit graph to the chosen checkout.
- **Scope**: only repositories **inside** the session working directory are managed; sibling worktrees outside the scan root never show up, and creating or removing worktrees is out of scope for this version.

---

## Screenshot

![Git panel: branch bar + commit history + changed files + diff view](./docs/screenshots/git-panel.png)

---

## Compatibility

| Item | Requirement |
|---|---|
| dsh (host) | `>= 0.1.0-rc.5` |
| Node.js | `>= 20` |
| git | `>= 2.28` (needed for `git init -b`; day-to-day branch/merge/log works on 2.x) |
| Platform | host (Node) + web (browser) |

---

## Installation

This is a **bundle plugin** (`package.json` declares `dsh.bundle` + `cordis.patch.yml` and
`dsh.client`), so both the host layer and the browser layer are activated automatically once installed.

```sh
# local directory
dsh plugin --profile web add /path/to/dsh-git-graph

# or a published npm package
dsh plugin --profile web add dsh-git-graph
```

---

## Usage

1. Install the plugin and open a workspace (a repository directory) in a session.
2. A **Git** tab appears in the session area (next to the trajectory view); click it to open the panel.
3. Inside the panel: branch bar + commit graph at the top; select a commit to inspect changes / diff;
   select worktree files to stage / commit / discard.
4. The panel binds to the "current session's working directory".
5. When the session working directory contains several repositories, a "repo" switcher appears in the top bar; if the session root is not a repository, the panel automatically enters the first sub-repository.

### Repository switcher

- **When it shows**: at least one repository was discovered, and (there are two or more of them, or the session root itself is not a repository). With a single repository that is the session root, the switcher stays hidden (the single-repo UI is unchanged).
- **Auto-entry into the first sub-repository**: when the session root is not a repository but sub-repositories were found, the panel switches to the first one (sorted by relative path, the root entry `.` first); a non-repository root used to fail with an error.
- **Switching**: a manual switch clears right-pane leftovers (diff, commit details, commit-message draft) so nothing from the previous repository leaks into the new one; the branch capsule, commit graph and diff view then refresh for the new repository.
- **Option labels**: `repository name (branch)`; the root entry gets a `· root` suffix and nested entries a `· relative path` suffix for disambiguation (single-level children get none); a detached HEAD is labelled as such with its short hash.
- **Stale entries**: when the directory still exists but git marks the entry as prunable (e.g. its administrative files are missing), the entry is kept and gets a stale ⚠ marker; registry leftovers whose directory was deleted by hand are filtered out.
- **Truncation notice**: when the list is truncated (more than 50 repositories, more than 5000 visited directory entries, or more than 10 seconds overall), the switcher shows a non-selectable "list truncated" line first; the reason is `repos` (repository cap), `dirs` (directory cap) or `timeout` (partial results kept); `repos` and `dirs` can occur together joined with `+`, while `timeout` overrides the other reasons.

Self-check list (matching the four session layouts above):

1. The session root is a main repository with a sibling worktree: the switcher offers several entries and switching re-points the branch capsule / commit graph / diff to the new repository;
2. The session root is a directory containing sub-repositories: the panel automatically enters the first sub-repository;
3. A single repository that is the session root: the switcher stays hidden (identical to the single-repo version);
4. The session root is not a repository and holds no sub-repository: the previous error message is unchanged.

---

## Multi-repository and worktree layout guide

The panel manages one repository at a time, but it discovers the other repositories and worktrees inside the session working directory for the switcher. Two layouts are supported (the code does not special-case either one):

**Layout A: siblings (good for parallel feature work)**

```
workspace/            # session working directory
├── proj/             # main repository
├── proj-fix/         # worktree of proj (git worktree add ../proj-fix)
└── frontend/         # unrelated repository
```

`workspace/proj`, `workspace/proj-fix` and `workspace/frontend` all show up in the switcher; the two checkouts of `proj` share a group and are labelled `main` and `linked`.

**Layout B: worktree inside the main repository (temporary / hidden worktrees)**

```
workspace/
└── proj/             # main repository
    ├── .git/
    └── worktrees/
        └── fix/      # worktree of proj
```

A worktree directory inside the main repository adds a `?? worktrees/` untracked entry to the main repository's `git status`. After creating the worktree, add `worktrees/` to the main repository's `.git/info/exclude` (machine-local; creates no versioned file) to avoid polluting the status.

**Directories the scan never enters**: `node_modules`, `.git`, `.dsh`, `.dsh-vision-router` and the other ignored directories, plus everything starting with `.` and all symlinks (on Windows, junctions count as symlinks too). So a repository under `node_modules` is never discovered; if a pnpm-style layout keeps repositories there, reorganize the directories.

---

## JSON API

Every request is `POST` with `content-type: application/json`. Uniform response:

```jsonc
// success
{ "ok": true, "value": { /* result */ } }
// failure
{ "ok": false, "error": { "code": "git-error", "message": "..." } }
```

### `/git` operations

| op | request | notes |
|---|---|---|
| `status` | `{ path }` | branch + staged / unstaged / untracked files; `self` flags the plugin's own source tree |
| `staged` | `{ path }` | staged-only (index vs HEAD) files |
| `branches` | `{ path }` | local/remote branches (current, track, ahead/behind) |
| `switchBranch` | `{ path, name }` | switch branch (remote names fall back to the local short name) |
| `switchTag` | `{ path, name }` | switch to a tag (detached-HEAD checkout) |
| `newBranch` | `{ path, name, base?, switch? }` | create a branch, optionally switch to it |
| `deleteBranch` | `{ path, name, force? }` | delete a branch (`force` → `-D`) |
| `renameBranch` | `{ path, name, oldName? }` | rename current or a named branch |
| `merge` | `{ path, name, noFf? }` | merge a branch; `conflicts: true` on conflict |
| `diff` | `{ path, file?, staged? }` | diff (truncated to 2 MiB) |
| `stage` | `{ path, files[] }` | stage the given files |
| `unstage` | `{ path, files[] }` | unstage the given files |
| `discard` | `{ path, files[] }` | discard worktree changes |
| `remove` | `{ path, files[] }` | physically delete (incl. untracked) |
| `log` | `{ path, n? }` | recent commits |
| `graphLog` | `{ path, n? }` | commit graph (parents, author, date, refs) |
| `fileLog` | `{ path, file, n? }` | per-file history |
| `blame` | `{ path, file }` | line-by-line attribution |
| `catFile` | `{ path, file, ref?, workingTree? }` | read a ref or a worktree file |
| `commit` | `{ path, message, files[]? }` | commit selected files (or all by default) |
| `amend` | `{ path, message? }` | amend the last commit |
| `show` | `{ path, hash }` | commit patch |
| `showStat` | `{ path, hash }` | commit metadata + stat + patch |
| `showFiles` | `{ path, hash }` | files changed by a commit |
| `showFileDiff` | `{ path, hash, file }` | per-file diff inside a commit |
| `push` | `{ path, branch?, setUpstream? }` | push |
| `pull` | `{ path, rebase? }` | pull (`--ff-only`) |
| `fetch` | `{ path, prune? }` | fetch remotes |
| `remotes` | `{ path }` | remotes (fetch/push URL) |
| `tags` | `{ path }` | tags; `current` is the checked-out tag (non-empty only on a detached HEAD) |
| `conflicts` | `{ path }` | conflicting files |
| `listRepos` | `{ path, depth? }` | scan `path` for sub-repositories (child/grandchild directories; `depth` defaults to 2, accepts 1–4), grouped by worktree |

`listRepos` result:

- `root`: the normalized scan root; `rootIsRepo`: whether `.git` exists under the root (file or directory).
- `repos[]`: sorted by relative path (the root entry has `relPath` `.` and comes first); each item carries `path` / `relPath` / `name` / `branch` (empty string when detached) / `head` (8-char short hash) / `group` (grouping key) / `worktree.role` (`main` or `linked`) / `prunable` (non-empty = the reason git reports the entry as stale).
- `truncated`: non-empty when a guard truncated the result — `repos`, `dirs` or `timeout`; `repos` and `dirs` can occur together joined with `+`, while `timeout` overrides the other reasons and means partial results were returned.
- Filtering: entries outside the session root, entries whose directory no longer exists, bare entries, and the submodule `.git/modules` gitdir ghost entry are all excluded.
- Guards: repos ≤ 50, visited directory entries ≤ 5000, 10 seconds overall (the scan only reads directories and runs read-only git commands).

---

## Repository layout

```
dsh-git-graph/
├── package.json        # plugin manifest: dsh.bundle + dsh.client + publish metadata
├── cordis.patch.yml    # host activation row (id=git-graph)
├── lib/
│   ├── index.js        # host half: /git route + exported pure helpers (testable)
│   └── client.js       # browser half: Git tab UI (precompiled single-file bundle)
├── test/
│   ├── parse.test.js       # pure-function unit tests (porcelain / branch header)
│   └── integration.test.js # real repo + HTTP end-to-end smoke test
├── .github/workflows/  # CI + npm publish (provenance)
├── README.md           # Chinese docs
├── README.en.md        # English docs
└── LICENSE             # MIT
```

---

## Development

```sh
# run tests (Node's built-in test runner, no extra deps)
npm test

# or a single file
node --test test/parse.test.js
node --test test/integration.test.js
```

- `test/integration.test.js` really runs `git init` on a temp repo, boots `apply()`, and drives `/git`
  over HTTP as an end-to-end smoke test, cleaning up the temp dir afterwards. It requires `git` on
  `PATH`.
- `lib/client.js` is a precompiled artifact (esbuild single-file bundle), reusing the already-built
  bundle from the desktop build; both halves register under the same package name in the dsh client
  module system (`window.__ModuleLoader__.load({ id: "dsh-git-graph", factory })`).
- CI (`.github/workflows/`): runs tests on push/PR (Node 20/22); pushing a `v*` tag publishes to npm
  with provenance (requires an `NPM_TOKEN` secret; the tag version must match package.json).

---

## Security

- Every `/git` operation runs scoped to the requested `path` directory, and never shells out through
  a string (it uses `execFile` with an argument array).
- Request body capped at 1 MiB, `git` output buffer at 64 MiB, diffs truncated at 2 MiB, so huge
  content cannot overwhelm the process.
- `listRepos` is read-only: it performs no writes, is confined to the requested directory (child/grandchild by default, at most 4 levels deep), and is capped at 50 repos / 5000 directories / 10 seconds.
- **`git clean` boundary**: with a worktree nested inside the main repository, `git clean` skips nested repository entries (`Would skip repository`), but that protection does **not** cover sibling-layout worktrees; verify your target directory before running `git clean -dfx`.

---

## License

[MIT](LICENSE)

See [CHANGELOG.en.md](CHANGELOG.en.md) for release notes.
