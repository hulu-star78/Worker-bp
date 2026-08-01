# BPB Panel 部署指南

本项目（BPB Worker Panel）专为 **Cloudflare Workers** 和 **Cloudflare Pages** 设计，
代码使用标准的 `fetch` 入口并仅依赖 Web 标准库，可直接部署到 Cloudflare 边缘网络。

本文档说明如何构建并部署本项目。

---

## 一、准备工作

### 1. 环境要求

- [Node.js](https://nodejs.org/) ≥ 18（用于本地构建）
- 一个 [Cloudflare](https://dash.cloudflare.com/) 账号
- 一个 Cloudflare **KV 命名空间**（面板用它持久化配置，必需）

### 2. 安装依赖

```bash
npm install
```

`wrangler`（Cloudflare 官方 CLI）已作为开发依赖加入，无需单独全局安装。

### 3. 创建 KV 命名空间

面板运行依赖一个名为 `kv` 的 KV 绑定，先创建它：

```bash
npx wrangler kv namespace create bpb_kv
```

命令会返回一个类似下面的结果：

```
🆕  kv namespace created
   id: 3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d
```

复制返回的 `id`，后续在配置中填入。

---

## 二、部署到 Cloudflare Workers（推荐）

### 1. 配置 `wrangler.toml`

打开项目根目录的 `wrangler.toml`，把上一步得到的 KV `id` 填入：

```toml
kv_namespaces = [
  { binding = "kv", id = "3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d" }
]
```

> 可选：在 `[vars]` 下预设 `UUID` / `TR_PASS`，也可在面板 UI 中设置。

### 2. 构建并部署

```bash
npm run deploy
```

该命令会：
1. 执行 `npm run build`，用 esbuild 把 `src/worker.ts` 打包、压缩为 `dist/worker.js`（HTML 资源内联为 base64）。
2. 调用 `wrangler deploy` 将其发布到 Workers。

### 3. 本地开发预览

```bash
npm run dev
```

启动 `wrangler dev` 本地模拟 Worker 运行（含 KV 模拟）。

### 4. 访问面板

部署完成后，访问你的 Worker 地址：

```
https://<your-subdomain>.workers.dev/<secure-path>/panel
```

首次访问会引导你设置管理员密码（secure path 由你在面板中设定）。

---

## 三、部署到 Cloudflare Pages

Pages 的 "函数" 模式使用 `_worker.js` 作为入口。本仓库已提供转换脚本。

### 方式 A：使用 CLI 部署（推荐）

```bash
npm run pages:deploy
```

该命令会：
1. 执行 `npm run pages:build` → 构建 `dist/worker.js`，再经 `scripts/build-pages.js`
   复制为 `dist-pages/_worker.js` 并生成 `dist-pages/_routes.json`。
2. 调用 `wrangler pages deploy dist-pages` 发布。

### 方式 B：连接 Git 仓库自动部署

1. 在 Cloudflare 控制台创建 **Pages** 项目，连接到本仓库。
2. 构建设置：
   - **构建命令**：`npm run pages:build`
   - **输出目录**：`dist-pages`
3. 部署后在 Pages 项目 **设置 → 函数 → KV 命名空间绑定** 中添加绑定：
   - 变量名：`kv`
   - 命名空间：选择之前创建的 KV
4. 重新部署一次使绑定生效。

> 说明：`_routes.json` 已配置为 `include: ["/*"]`、`exclude: []`，
> 让 Pages Function 接管所有请求，避免静态资源缓存干扰面板的动态 KV 读写。

### 访问面板

```
https://<your-pages-project>.pages.dev/<secure-path>/panel
```

---

## 四、KV 绑定说明

| 绑定名 | 类型 | 必需 | 说明 |
| :----- | :--- | :--- | :--- |
| `kv`   | KV Namespace | ✅ | 存储面板配置、订阅、代理设置等 |
| `UUID` | 变量（可选） | ❌ | 预置 VLESS UUID，也可在面板设置 |
| `TR_PASS` | 变量（可选） | ❌ | 预置 Trojan 密码，也可在面板设置 |
| `CF_PAGES` | 环境变量 | ❌ | Pages 平台自动注入，用于区分部署环境 |

---

## 五、注意事项

1. **nodejs_compat**：`wrangler.toml` 已设置 `compatibility_flags = ["nodejs_compat"]`，
   用于支持代码中使用的 `node:crypto`（`createHash` / `generateKeyPairSync`）。请勿移除。
2. **请求限制**：免费版 Worker 每天约 10 万次请求，适合 2–3 人使用；VLESS/Trojan 的 UDP 在 Workers 上不支持（已默认关闭，DoH 默认开启）。
3. **构建产物**：`dist/` 与 `dist-pages/` 为自动生成目录，无需提交到 Git。
4. **版本**：`compatibility_date` 已设为 `2025-07-01`，如需最新特性可酌情上调。

---

## 六、常用命令速查

| 命令 | 作用 |
| :--- | :--- |
| `npm run build` | 仅构建 Worker 产物 `dist/worker.js` |
| `npm run dev` | 本地预览（wrangler dev） |
| `npm run deploy` | 构建并部署到 Workers |
| `npm run pages:build` | 构建 Pages 产物 `dist-pages/` |
| `npm run pages:deploy` | 构建并部署到 Pages |
| `npm run check` | TypeScript 类型检查 |
