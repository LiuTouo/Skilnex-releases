# Skilnex

<img src="docs/assets/icon.png" alt="Skilnex" width="72" height="72">

**Keep your agent skills organized. Review every sync.**

Skilnex is a local Agent Skills inventory and sync tool for Windows. Bring skills scattered across your agents into one view: find their sources, read their contents, organize your notes, then review changes before copying a skill to another agent.

**[Download for Windows](https://github.com/LiuTouo/Skilnex-releases/releases/latest) · [Product site & interactive demo](https://liutouo.github.io/Skilnex-releases/en/) · [繁體中文](README.md)**

## Who is it for?

- You use tools such as Codex and Claude Code and want to know where your skills actually live.
- You want to copy a useful skill to another agent without accidentally overwriting local changes.
- Your collection needs search, source grouping, favorites, and notes—not another folder to dig through.

Skilnex manages **the skill files and supporting content that agents read**. It is not a chat interface and does not execute skills on an agent's behalf.

## What can you do?

| Capability                | What it means for you                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Inventory in one place    | See skill sources, agents, global/project locations, and multiple instances; identify shared paths.                             |
| Read and organize         | Search full text, read SKILL.md and attachments, and add favorites, notes, and custom groups.                                   |
| Review before syncing     | Choose a local source and destinations, preview changes across the folder, then confirm a one-way copy.                         |
| Stay in control           | Explicitly approve replacing modified targets; changes after preview block execution; replacements preserve a recoverable copy. |
| Inspect MCP configuration | View existing configurations and agent associations in supported formats; no MCP server startup or configuration writes.        |
| Keep prompts handy        | Categorize, tag, favorite, and copy prompts, with JSON import/export.                                                           |

### Agent integrations

Built-in skill discovery and inventory adapters cover **Codex, Claude Code, OpenCode, Pi, Hermes, and OpenClaw**. You can also register extra instances and custom skill directories.

An adapter does not certify every version, loading rule, or runtime environment. Location and availability indicators are **static checks** of supported conditions, not proof that a skill runs successfully. MCP format support also varies by product.

## Get started

### 1. Choose a download

Open the **[latest Release](https://github.com/LiuTouo/Skilnex-releases/releases/latest)** and select an asset:

| File                         | Choose this for                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `*_x64-setup.exe`            | A regular installation. Application data lives in your user-local application data directory.                                  |
| `*-windows-x64-portable.zip` | Portable use. Extract the entire archive, then run `Skilnex.exe`; keep `portable.flag` and `data` with the app when moving it. |

**Requirements: Windows x64 and Microsoft WebView2 Runtime.** The installer can download WebView2 if it is missing; the portable version also requires the Runtime. You do not need Node.js, Rust, or development tools.

If Windows or an organization policy blocks execution, verify the download source and follow your administrator's policy. Disabling security protections is not recommended.

### 2. Scan and read

Launch Skilnex and scan your local agents. Add Git projects or custom skill directories as needed. Open a skill to inspect its source, content, and attachments.

### 3. Preview and confirm

In the skill's inspection/sync view, select a local source and destination agents. Review the file differences before confirming; replacing an already modified target requires separate approval. Afterwards, use the operation log in Settings to review records and available recovery actions.

> Not ready to download? [Try the sync walkthrough](https://liutouo.github.io/Skilnex-releases/en/#demo). The website uses fictional data only: it does not read or write local files, connect to agents, or call a model.

## Data and operation boundaries

- **Review first, decide second.** No automatic background sync, and a missing source does not automatically delete its targets.
- **You or the original agent still maintain the skills.** Skilnex does not check for upstream updates to external skill copies or update them in place.
- **No arbitrary takeover of other tools' files.** Package-managed, plugin, built-in, and linked directories are not sync overwrite targets. Package-manager lockfiles are not modified.
- **Static hints are not security guarantees.** Manifest, structure, link, and command checks are not runtime verification or cross-agent compatibility certification.
- **Local-first is not the same as fully offline.** Local inventory, reading, and sync operate on local files; GitHub imports, downloads, version checks, and app updates may require a network connection.
- **Recovery checks the current state too.** External changes can block recovery. Sensitive configuration fields are redacted in backups, so reauthentication may be necessary after a restore.
- Downloads currently target Windows x64. No support is claimed for macOS, Linux, remote/WSL environments, private skill sources, or third-party MCP extensions.

## For a closer look at the engineering

Skilnex uses **React/TypeScript → Tauri 2 IPC → Rust → SQLite and the local filesystem**.

Engineering highlights include heterogeneous agent adapters, shared-path deduplication, content hashes and stale-preview checks, explicit conflict confirmation, backups before replacement, and operation records. The desktop project has Rust, Vitest, and Playwright tests, plus GitHub Actions validation, packaging, and release workflows. This does not mean every agent has passed live skill-execution testing.

[Read the engineering overview](https://liutouo.github.io/Skilnex-releases/en/#engineering)

## About this repository

This public repository provides **Windows releases, product information, and the website**. The desktop application's source code is not public. A public download does not imply an open-source or commercial-use license; this page does not add license terms, enterprise compliance claims, or an SLA.

[All releases](https://github.com/LiuTouo/Skilnex-releases/releases) · [Author on GitHub](https://github.com/LiuTouo) · [Website maintenance](CONTRIBUTING.md)
