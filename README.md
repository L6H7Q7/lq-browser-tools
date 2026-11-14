# LQ 浏览器工具集

一个仓库，两种浏览器增强工具。**按需挑一个装就行，不用两个都装。**

## 📥 安装入口

### ① YouTube 评论翻译 · 去重修复版

> Chrome / Edge 浏览器扩展。修掉 YouTube 评论里「同一条评论译文出现两遍」的问题。

👉 **[点这里查看安装步骤](#-youtube-评论翻译去重修复版扩展)**

---

### ② 油猴脚本合集

> 需要先装 [Tampermonkey](https://www.tampermonkey.net/) 扩展，装好后点下面的链接会**直接弹出安装页面**。

| 脚本 | 作用 |
|---|---|
| 📥 [QQ 邮箱自动登录](https://raw.githubusercontent.com/L6H7Q7/lq-browser-tools/main/tampermonkey/qqmail-oauth-auto.user.js) | QQ 邮箱网页版自动点击「允许」和头像登录，省去手动扫码 |
| 📥 [安卓网页强制横屏](https://raw.githubusercontent.com/L6H7Q7/lq-browser-tools/main/tampermonkey/android-force-landscape.user.js) | 让安卓手机上不支持横屏的网页强制横屏全屏播放 |

---

## ① YouTube 评论翻译去重修复版（扩展）

### 这是什么

原插件是 **YouTube™ Comment Translator Pro 1.17.3**（商店版）。
本版本在本地打了「译文去重」补丁：原版在评论区会出现同一条译文显示两遍的问题，这里修好了。

### 安装步骤

1. **下载本仓库的 ZIP**：[点此下载](https://github.com/L6H7Q7/lq-browser-tools/archive/refs/heads/main.zip)
2. 解压，找到里面的 `youtube-translator` 文件夹，**放到一个固定位置**（别删，删了扩展就失效）
3. 打开扩展管理页：
   - Edge：地址栏输入 `edge://extensions`
   - Chrome：地址栏输入 `chrome://extensions`
4. 打开右上角的「开发者模式」
5. 点「加载解压缩的扩展程序」，选择刚才那个 `youtube-translator` 文件夹
6. **禁用商店里的原版插件**，避免两个版本同时翻译

### 为什么不能一键安装

Chrome / Edge 出于安全限制，**不允许从网页链接直接安装未上架商店的扩展**。只能手动「加载解压缩的扩展」。

### 注意

- 扩展 ID 与商店版不同，语言等设置需要重新设置
- 不会随商店自动更新；原插件升级后如需跟进，可重新对 `Translator.*.js` 打同样的补丁
- 本仓库仅用于个人学习与技术研究，原插件著作权归其作者所有

---

## ② 油猴脚本（Tampermonkey）

### 使用前提

先安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。

### 安装方法

直接点上方的「📥 安装」链接即可，Tampermonkey 会自动拦截并弹出安装页面，点「安装」完成。

### 脚本说明

**qqmail-oauth-auto.user.js**
QQ 邮箱网页版自动登录，自动点击「允许」和头像。

**android-force-landscape.user.js**
让某些在安卓手机上无法横屏的网页强制横屏播放，已实测可用。

---

## 更新记录

- 2026-11-14：创建本仓库，合并原 `youtube-comment-translate-fixed` 与 `Ai.Codex-Tampermonkey` 两个仓库
