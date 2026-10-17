# 桌面端构建与发布（Linux / Windows）

> 本文件记录本 fork 在 **Linux 上构建 Linux 版 + 交叉编译 Windows x64 版** 的完整流程。
> 仅涉及 OSS 部分，未改动 `bitwarden_license/`。
>
> 自定义改动见根目录 `README.md`（自管服务器：登录页 / 注册页）。未签名版本仅适合自用/内部分发。

---

## 1. 产物一览

构建完成后位于 `apps/desktop/dist/`：

| 平台    | 命令目标   | 产物                                               |
| ------- | ---------- | -------------------------------------------------- |
| Windows | `nsis`     | `Bitwarden Setup <version>.exe`（离线安装器）      |
| Windows | `portable` | `Bitwarden-Portable-<version>.exe`（绿色版）       |
| Linux   | `AppImage` | `Bitwarden-<version>-x86_64.AppImage`              |
| Linux   | `deb`      | `Bitwarden-<version>-amd64.deb`                    |
| Linux   | `dir`      | `dist/linux-unpacked/`（未打包目录，便于本地调试） |

> `appx`、`snap`、`rpm`、`nsis-web` 未在本流程启用：`appx` 无法在 Linux 构建，`snap` 需 snapcraft，
> `nsis-web` 需要可访问的更新服务器。

---

## 2. 环境准备

### 2.1 Node

- Node 22+（本机：`~/sdk/node-v26.12.0-linux-x64/bin`）
- 安装依赖后在仓库根执行所有 npm 命令。

### 2.2 Rust（原生模块）

- 版本由 `apps/desktop/desktop_native/rust-toolchain.toml` **固定为 1.97.1**，不要用 stable 代替。
- 需要额外组件：
  ```bash
  rustup component add llvm-tools --toolchain 1.97.1-<host-triple>
  ```
  （`cargo-xwin` 会链接 `llvm-lib` → `llvm-ar`，缺该组件会失败。）

### 2.3 Windows 交叉编译（Linux 上）

1. **cargo-xwin**：
   ```bash
   cargo install cargo-xwin --version 0.23.0
   ```
2. **MSVC sysroot**（cargo-xwin 自动下载较慢/易断）：
   - 预下载到 `~/.cache/cargo-xwin/windows-msvc-sysroot`
   - 修正 `include/` 下 `Windows.h` 大小写（Linux 大小写敏感）：
     ```bash
     ln -sf windows.h <sysroot>/include/Windows.h
     ```
     否则 `libsqlite3-sys` 等编译失败。
3. **clang**：需带 x86/x86-64 后端（本机用 `/opt/rocm-7.2.4/lib/llvm/bin` 的 clang）。该 clang 缺 AArch64，
   所以 **arm64 交叉编译不可用**；本 fork 只构建 x64。

### 2.4 wine（Linux 上打 Windows 包必需）

`electron-builder` 在 Linux 打包 Windows 需要 wine（用于 rcedit/NSIS 等）：

```bash
# 无 root 方案：Kron4ek Wine-Builds 解压到本地
# 本机：~/.local/opt/wine-11.19-amd64-wow64/bin
```

运行时必需：

```bash
export WINEPREFIX=~/.cache/wine-prefix
export WINEDLLOVERRIDES="mscoree,mshtml="
export WINEDEBUG=-all
export LANG=C.UTF-8 LC_ALL=C.UTF-8   # 否则 NSIS 报 "main argv conversion failed"
unset DISPLAY                         # 否则 wine 找不到显示器
```

---

## 3. 构建流程

### 3.1 原生模块（native）

```bash
cd apps/desktop

# Windows x64 交叉编译
npm run build-native -- --release --target=x86_64-pc-windows-msvc

# Linux（本机原生）
npm run build-native -- --release
```

产物：

- NAPI 模块：`desktop_native/napi/desktop_napi.<target>.node`
- 代理/辅助：`desktop_native/dist/desktop_proxy.<platform>-<arch>(.exe)`、`libprocess_isolation.so`

> 打包配置（`apps/desktop/electron-builder.json`）会从上述路径取 `extraFiles`。

### 3.2 前端（main / renderer / preload）

```bash
cd apps/desktop
npm run build:oss
```

输出到 `apps/desktop/build/`（electron-builder 的 `directories.app` 即此目录，其中包含 `locales/` 文案）。

### 3.3 打包

Windows（x64）：

```bash
cd apps/desktop
npx electron-builder --win nsis --x64 -p never
npx electron-builder --win portable --x64 -p never
```

Linux（x64）：

```bash
npx electron-builder --linux AppImage deb --x64 -p never
# 仅生成未打包目录（调试用，快）：
npx electron-builder --linux dir --x64 -p never
```

> `-p never` 表示不发布（仅本地产出）。仓库 `build.publish` 指向官方 artifacts，自用请保持 `-p never`。

### 3.4 签名

- 未配置证书时 `apps/desktop/sign.js` 自动 no-op，产物**未签名**。
- Windows 会触发 SmartScreen 警告。拿到证书后按 `sign.js` 约定接入即可。

---

## 4. 常见问题

| 现象                                         | 原因 / 解决                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| AppImage 运行报 `error loading libfuse.so.2` | Ubuntu 24.04+ 装 `libfuse2t64`；或用 `--appimage-extract-and-run`；或改用 `.deb` |
| NSIS 打包报 `main argv conversion failed`    | locale 非 UTF-8 → `LANG=LC_ALL=C.UTF-8`                                          |
| wine 报找不到显示器                          | `unset DISPLAY`                                                                  |
| 编译 Rust 时 `Windows.h` 找不到              | sysroot `include/` 下是大写 `Windows.h`，做小写符号链接（见 2.3）                |
| arm64 / ia32 构建                            | 本机 clang 缺 AArch64，仅做 x64                                                  |
| `npm run build` 成功后却拿不到安装包         | `build` 只做前端；打包需再跑 `electron-builder`                                  |
| shallow clone 下推送/rebase 异常             | `git fetch --unshallow` 补全历史                                                 |

---

## 5. 自动化验收（Playwright + CDP）

无头或有显示器均可，通过 Chromium 远程调试端口驱动已打包的应用：

1. 启动应用（`linux-unpacked` 目录，避免 AppImage/FUSE）：
   ```bash
   dist/linux-unpacked/bitwarden-app \
     --no-sandbox \
     --remote-debugging-port=9223 \
     --enable-features=UseOzonePlatform --ozone-platform=x11 \
     --user-data-dir=/tmp/bw-profile
   ```
2. 用 Playwright 连接：
   ```js
   import { chromium } from "playwright";
   const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
   const page = browser.contexts()[0].pages()[0];
   ```
3. **隔离数据**（关键）：应用用 `app.getPath("userData")` 存状态，`--user-data-dir` 并不隔离它。
   通过环境变量把状态目录指向临时目录，避免污染真实配置：
   ```bash
   BITWARDEN_APPDATA_DIR=/tmp/bw-test-appdata \
   dist/linux-unpacked/bitwarden-app --no-sandbox --remote-debugging-port=9223 ...
   ```
4. 验收点：
   - 登录页不含 `bitwarden.com` / `bitwarden.eu`；
   - 「管理服务器」可新增/编辑/删除，保存后立即出现在下拉；
   - 选中服务器后 `Accessing:` 更新；
   - 「创建账户」页的 `bit-select` 选项为 `[已保存服务器, Other server, Manage servers]`，无官方云。
   - `bit-select` 基于 `ng-select`，选项在 `.ng-option`（不是原生 `<option>`）。

> 生产构建锁定了 `--inspect`（Electron fuses），因此不能用 Playwright 的 `_electron.launch`，
> 必须走 `--remote-debugging-port` + `connectOverCDP`。

---

## 6. 许可与商标

- 遵循 **GPL-3.0**；对外分发修改版需附带源码。
- 「Bitwarden」名称与 logo 为商标，公开分发请改名并替换图标。
