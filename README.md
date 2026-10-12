# Skilnex

<img src="docs/assets/icon.png" alt="Skilnex" width="72" height="72">

**讓不同 AI Agent 的技能，整理有序、同步有據。**

Skilnex 是 Windows 本機 Agent Skills 盤點與同步工具。把散落在不同 Agent 的技能放在同一個視野裡：找到來源、閱讀內容、整理筆記，再看過差異、確認後複製到其他 Agent。

**[下載 Windows 版](https://github.com/LiuTouo/Skilnex-releases/releases/latest) · [產品介紹與互動示範](https://liutouo.github.io/Skilnex-releases/) · [English](README.en.md)**

## 適合什麼情境？

- 同時使用 Codex、Claude Code 等工具，想知道技能到底放在哪裡。
- 想把常用技能複製到另一個 Agent，又不想誤蓋掉已修改的內容。
- 技能愈來愈多，需要搜尋、來源分組、收藏與筆記，而不是一直翻資料夾。

Skilnex 管理的是 **Agent 會讀取的技能檔案與附帶內容**，不是 AI 聊天介面，也不會代替 Agent 執行技能。

## 你可以做什麼？

| 功能          | 使用方式                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| 一起盤點      | 查看技能來源、所在 Agent、全域／專案位置與多實例；辨識共享路徑。             |
| 讀懂與整理    | 全文搜尋、閱讀 SKILL.md 與附件、收藏、筆記及自訂分組。                       |
| 檢查後再同步  | 選定本機來源與目標，預覽整個資料夾的檔案差異，再確認單向複製。               |
| 保留控制權    | 目標有修改時需明確確認取代；預覽後檔案變動會阻擋執行；取代前保存可還原副本。 |
| 查看 MCP 設定 | 盤點已支援格式中的既有配置與 Agent 關聯；不啟動 MCP 服務或修改設定。         |
| 收好提示詞    | 分類、標籤、收藏與複製提示詞，支援 JSON 匯入／匯出。                         |

### Agent 適配範圍

內建 **Codex、Claude Code、OpenCode、Pi、Hermes、OpenClaw** 的技能偵測與盤點適配，並可登記額外實例與自訂技能目錄。

適配不代表所有版本、載入規則或執行環境都已實機認證。位置與可用性標示是已支援條件的**靜態檢查**，不是技能執行成功的保證；MCP 格式的支援範圍也依產品而異。

## 快速開始

### 1. 選擇下載方式

前往 **[最新 Release](https://github.com/LiuTouo/Skilnex-releases/releases/latest)**，在 Assets 選擇：

| 檔案                         | 適用情境                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `*_x64-setup.exe`            | 一般安裝。應用資料存放於使用者的本機應用資料目錄。                                   |
| `*-windows-x64-portable.zip` | 免安裝使用。完整解壓後執行 `Skilnex.exe`；移動時一併保留 `portable.flag` 與 `data`。 |

**系統需求：Windows x64 與 Microsoft WebView2 Runtime。** 安裝程式可在缺少 WebView2 時下載安裝；免安裝版也需要這個 Runtime。一般使用者不需要 Node.js、Rust 或開發工具。

若 Windows 或公司端點政策阻擋執行，請先核對下載來源並依管理政策處理；不建議關閉安全保護。

### 2. 掃描與閱讀

啟動 Skilnex，掃描本機 Agent；視需要加入 Git 專案或自訂技能目錄。開啟技能，檢查來源、內容及附件。

### 3. 預覽與確認

在技能的「檢查／同步」選擇本機來源與目標 Agent。看過檔案差異後確認；若目標已有修改，必須另外同意取代。操作完成後，可在設定中的操作日誌查看紀錄與可用的還原操作。

> 還不想下載？[先試一次同步流程](https://liutouo.github.io/Skilnex-releases/#demo)。網頁只使用虛構資料，不讀寫本機、不連接 Agent，也不呼叫模型。

## 資料與操作邊界

- **先看，再決定。** 不背景自動同步，也不因來源消失而自動刪除目標。
- **技能仍由你或原 Agent 維護。** Skilnex 不提供外部技能副本的上游更新檢查或原地更新。
- **不任意接管其他工具的檔案。** 套件、外掛、內建技能及連結目錄不作為同步覆寫目標；不修改套件管理器鎖定檔。
- **靜態提示不是安全保證。** manifest、結構、連結及命令提示檢查，不等於執行驗證或跨 Agent 相容認證。
- **本機優先，不等於完全離線。** 本機盤點、閱讀與同步處理本機檔案；GitHub 匯入、下載與版本／應用更新功能可能需要連網。
- **還原也會檢查現況。** 外部變更可能阻擋還原，備份中的敏感設定會遮蔽，還原後可能需要重新認證。
- 目前下載提供 Windows x64；不宣稱 macOS、Linux、遠端／WSL、私人技能來源或第三方 MCP extension 的支援。

## 給想了解工程設計的人

Skilnex 採用 **React／TypeScript → Tauri 2 IPC → Rust → SQLite 與本機檔案系統**。

工程重點包括異質 Agent 適配、共享目錄去重、內容雜湊與預覽失效檢查、衝突確認、取代前備份，以及操作紀錄。桌面專案有 Rust、Vitest、Playwright 測試與 GitHub Actions 驗證／封裝／發布流程；這不代表每種 Agent 都已通過實際技能執行測試。

[查看工程設計摘要](https://liutouo.github.io/Skilnex-releases/#engineering)

## 關於這個 repository

此公開庫提供 **Windows 發行檔、產品介紹與網站**；Skilnex 桌面應用原始碼未公開。公開可下載不等於開源或已授予商用授權；本頁不新增授權條款、企業合規或 SLA 承諾。

[所有版本](https://github.com/LiuTouo/Skilnex-releases/releases) · [作者 GitHub](https://github.com/LiuTouo) · [網站維護說明](CONTRIBUTING.md)
