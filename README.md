<p align="center">
  <img src="https://raw.githubusercontent.com/bitwarden/brand/main/screenshots/apps-combo-logo.png" alt="Bitwarden" />
</p>
<p align="center">
  <a href="https://github.com/bitwarden/clients/actions/workflows/build-browser.yml?query=branch:main" target="_blank"><img src="https://github.com/bitwarden/clients/actions/workflows/build-browser.yml/badge.svg?branch=main" alt="GitHub Workflow browser build on main" /></a>
  <a href="https://github.com/bitwarden/clients/actions/workflows/build-cli.yml?query=branch:main" target="_blank"><img src="https://github.com/bitwarden/clients/actions/workflows/build-cli.yml/badge.svg?branch=main" alt="GitHub Workflow CLI build on main" /></a>
  <a href="https://github.com/bitwarden/clients/actions/workflows/build-desktop.yml?query=branch:main" target="_blank"><img src="https://github.com/bitwarden/clients/actions/workflows/build-desktop.yml/badge.svg?branch=main" alt="GitHub Workflow desktop build on main" /></a>
  <a href="https://github.com/bitwarden/clients/actions/workflows/build-web.yml?query=branch:main" target="_blank"><img src="https://github.com/bitwarden/clients/actions/workflows/build-web.yml/badge.svg?branch=main" alt="GitHub Workflow web build on main" /></a>
</p>

---

# Bitwarden Client Applications

This repository houses all Bitwarden client applications except the mobile applications ([iOS](https://github.com/bitwarden/ios) | [android](https://github.com/bitwarden/android)).

Please refer to the [Clients section](https://contributing.bitwarden.com/getting-started/clients/) of the [Contributing Documentation](https://contributing.bitwarden.com/) for build instructions, recommended tooling, code style tips, and lots of other great information to get you started.

## Related projects:

- [bitwarden/server](https://github.com/bitwarden/server): The core infrastructure backend (API, database, Docker, etc).
- [bitwarden/ios](https://github.com/bitwarden/ios): Bitwarden iOS Password Manager & Authenticator apps.
- [bitwarden/android](https://github.com/bitwarden/android): Bitwarden Android Password Manager & Authenticator apps.
- [bitwarden/directory-connector](https://github.com/bitwarden/directory-connector): A tool for syncing a directory (AD, LDAP, Azure, G Suite, Okta) to an organization.

# We're Hiring!

Interested in contributing in a big way? Consider joining our team! We're hiring for many positions. Please take a look at our [Careers page](https://bitwarden.com/careers/) to see what opportunities are [currently open](https://bitwarden.com/careers/#open-positions) as well as what it's like to work at Bitwarden.

# Contribute

Code contributions are welcome! Please commit any pull requests against the `main` branch. Learn more about how to contribute by reading the [Contributing Guidelines](https://contributing.bitwarden.com/contributing/). Check out the [Contributing Documentation](https://contributing.bitwarden.com/) for how to get started with your first contribution.

Security audits and feedback are welcome. Please open an issue or email us privately if the report is sensitive in nature. You can read our security policy in the [`SECURITY.md`](SECURITY.md) file.

---

# 本 Fork 的自定义改动：自管服务器 / Self-managed servers

> 个人 fork,用于自托管场景定制。改动仅涉及 OSS 部分,未修改 `bitwarden_license/`。
> 构建、打包与自动化验收见 [`docs/BUILD.md`](docs/BUILD.md)。

## 功能 / Features

- 移除登录页、注册页内置的官方云服务器(bitwarden.com / bitwarden.eu / Gov)。
- 服务器改为**用户自管列表**:可新增、编辑、删除,每条包含「名称 + 地址」(如 `https://vault.example.com`)。
- 登录页与「创建账户」页的下拉读取同一份列表;另保留「其他服务器」用于临时填写地址。
- 数据仅保存在本地应用数据(`app.getPath("userData")`,可用 `BITWARDEN_APPDATA_DIR` 覆盖其位置)。

## 使用 / Usage

1. 打开桌面端登录页,点击 `Accessing: ...` 旁的服务器下拉。
2. 选择 **Manage servers / 管理服务器**,填写名称与地址后 **Save**。
3. 选中已保存的服务器即切换环境;「创建账户」页下拉会同步出现该服务器。

## 相关代码 / Code

- `libs/common/src/platform/services/custom-environments.service.ts`
- `libs/angular/src/auth/custom-environments-dialog/`
- `libs/angular/src/auth/environment-selector/`
- `libs/auth/src/angular/registration/registration-env-selector/`

## 许可与商标 / License & trademark

- 遵循原仓库 **GPL-3.0**;对外分发修改版需附带源码。
- 「Bitwarden」名称与 logo 为其商标;公开分发请自行改名、替换图标。
