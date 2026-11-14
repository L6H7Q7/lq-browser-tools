# YouTube™ Comment Translator —— 评论译文去重修复版

原插件：**YouTube™ Comment Translator Pro 1.17.3**（Edge / Chrome 商店版）
本仓库：在本地打了「译文去重」补丁的版本，可直接在 Edge / Chrome 以"加载解压缩的扩展"方式安装。

## 问题

在 YouTube 评论区，同一条评论下方会出现**两条完全相同的中文译文**：

```
原文
译文
译文
```

## 原因

插件 `Translator.7f0b6bc1.js` 中存在两套独立的翻译注入逻辑（普通评论 + 流式区域），
各自向评论容器插入 `<hr data-translation-divider>` + `<span data-translation-msg>`。
当 YouTube 懒加载、滚动或重渲染评论节点时，`data-translation-message` 防重标记会丢失，
新译文被再次插入，而旧译文仍留在 DOM 里，于是出现两条。

## 补丁内容

在 `Translator.7f0b6bc1.js` 两处插入译文之前，先清掉同一容器中已有的译文节点：

```js
r.querySelectorAll("[data-translation-msg],[data-translation-divider],[data-translation-error]")
 .forEach(function(x){ x.remove() });
```

- 第 1 处：普通评论翻译（`receivedMsgContainer: "#content-text"`）
- 第 2 处：流式/直播聊天翻译（`receivedStreamMsgContainer`）

效果：新译文总是覆盖旧译文，任何时刻同一条评论只有一条译文。

## 安装

1. 下载/克隆本仓库到本地任意目录
2. Edge 打开 `edge://extensions`（Chrome 为 `chrome://extensions`）
3. 打开右上角「开发者模式」
4. 点「加载解压缩的扩展程序」，选择本仓库根目录
5. **禁用商店原版**，避免两个版本同时运行、各自翻译

## 注意

- 本仓库是**修补版**，功能与原版 1.17.3 一致，只是去掉了重复译文
- 扩展 ID 与商店版不同，语言等设置项需要重新设置
- 不会随商店自动更新；原插件升级后如需跟进，可重新对 `Translator.*.js` 打同样补丁
- 本仓库仅用于个人学习与技术研究，原插件著作权归其作者所有；使用风险自行承担

## 更新记录

- 2026-11-10：基于 1.17.3 增加译文去重补丁
