# firefox-bookmark-history

> 基于 Firefox 的书签和浏览记录

一个使用 **Vue 3 + Vite + TypeScript** 构建的 **ZTools** 插件，用于快速搜索并打开 Firefox 浏览器的书签与历史记录，并支持配置 Firefox 配置文件夹。

## ✨ 功能特性

- **书签** - 搜索并打开 Firefox 书签
  - 触发指令：`书签` / `bookmark`
  - 支持按名称、标题、URL 关键字过滤
  - 键盘导航：`↑` / `↓` 移动选中，`Enter` 打开选中书签，`Home` / `End` 跳到首尾
  - `Backspace` 删除搜索内容，普通字符键直接输入进搜索框
  - 单击选中，双击跳转打开书签

- **历史** - 浏览 Firefox 历史记录
  - 触发指令：`历史` / `history`
  - 需要先配置 Firefox 配置文件夹

- **配置文件夹** - 设置 Firefox 浏览器的配置文件夹
  - 触发指令：`配置文件夹`
  - 支持拖拽文件 / 选择文件夹触发
  - 配置后用于读取书签与历史数据

## 📁 项目结构

```
.
├── public/
│   ├── logo.png              # 插件图标
│   ├── plugin.json           # 插件配置文件
│   └── preload/              # Preload 脚本目录
│       ├── package.json      # Preload 依赖配置
│       └── services.js       # Node.js 能力扩展
├── src/
│   ├── main.ts               # 入口文件
│   ├── main.css              # 全局样式
│   ├── App.vue               # 根组件（按功能 code 路由）
│   ├── env.d.ts              # 类型声明（Bookmark / HistoryItem / Window 等）
│   ├── Bookmark/             # 书签功能组件
│   │   └── index.vue
│   ├── History/              # 历史功能组件
│   │   └── index.vue
│   └── Profile/              # 配置文件夹功能组件
│       └── index.vue
├── index.html                # HTML 模板
├── vite.config.js            # Vite 配置
├── tsconfig.json             # TypeScript 配置
├── package.json              # 项目依赖
└── README.md                 # 项目文档
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

开发服务器将在 `http://localhost:5173` 启动，即 `plugin.json` 中 `development.main` 指向的地址。ZTools 会自动加载开发版本。

### 构建生产版本

```bash
pnpm run build
```

构建产物将输出到 `dist/` 目录。

## 📖 开发指南

### 1. 插件配置

插件信息与功能入口在 `public/plugin.json` 中声明：

```json
{
  "name": "firefox-bookmark-history",
  "title": "Firefox书签历史",
  "description": "基于Firefox的书签和浏览记录",
  "author": "cz-97",
  "version": "1.0.0",
  "main": "index.html",
  "preload": "preload/services.js",
  "logo": "logo.png",
  "development": {
    "main": "http://localhost:5173"
  },
  "features": [
    { "code": "bookmark", "explain": "Firefox书签", "icon": "logo.png", "cmds": ["书签", "bookmark"] }
  ]
}
```

`features` 中每个功能的 `code` 会通过 `window.ztools.onPluginEnter` 传入，`src/App.vue` 据此路由到对应组件。

### 2. 添加新功能

#### 创建 Vue 组件

在 `src/` 目录下创建功能组件（如 `src/MyFeature/index.vue`），通过 `defineProps` 接收 `enterAction`：

```vue
<!-- src/MyFeature/index.vue -->
<script setup lang="ts">
const props = defineProps({
  enterAction: { type: Object, required: true },
})
</script>

<template>
  <div>我的新功能</div>
</template>
```

#### 注册路由

在 `src/App.vue` 中导入组件并按键（路由 code）渲染：

```vue
import MyFeature from './MyFeature/index.vue'
```

```vue
<MyFeature v-if="route === 'myfeature'" :enter-action="enterAction" />
```

#### 配置功能

在 `plugin.json` 的 `features` 中新增：

```json
{
  "code": "myfeature",
  "explain": "我的新功能",
  "icon": "logo.png",
  "cmds": ["触发指令"]
}
```

### 3. 使用 Node.js 能力

通过 `public/preload/services.js` 扩展服务，然后在组件中通过 `window.services` 调用：

```javascript
const fs = require('fs')
const path = require('path')

module.exports = {
  readFile: (filePath) => {
    return fs.readFileSync(filePath, 'utf-8')
  },
  // 其他服务
}
```

```ts
const content = window.services.readFile('/path/to/file')
```

### 4. 使用 ZTools API

```ts
window.ztools.onPluginEnter((action) => {
  // action.code 为功能 code
})
window.ztools.setSubInput((input) => {
  // 子输入框内容变化
}, '搜索书签', true)
window.ztools.subInputBlur()
window.ztools.subInputFocus()
// 更多 API 请参考官方文档
```

## 📦 构建与发布

### 1. 构建插件

```bash
pnpm run build
```

### 2. 测试构建产物

将 `dist/` 目录中的文件放入 ZTools 插件目录进行测试。

### 3. 发布到插件市场

1. 确保 `plugin.json` 中信息完整准确
2. 准备插件截图与说明
3. 提交到 ZTools 插件市场

## 📚 相关资源

- [ZTools 官方文档](https://github.com/ztool-center/ztools)
- [ZTools API 文档](https://github.com/ztool-center/ztools-api-types)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)

## ❓ 常见问题

### Q: 书签/历史显示为空？

确保已通过 `配置文件夹` 功能正确设置 Firefox 配置文件夹，并使用 `窗口.services.getBookmarks()` / `getHistory()` 读取。

### Q: 如何调试插件？

使用 `pnpm run dev` 启动开发服务器，在插件界面中选择"打开开发者工具"进行调试。

### Q: 插件图标不显示？

确保 `public/logo.png` 存在，且在 `plugin.json` 中正确配置了 `logo` 字段。

## 📄 开源协议

MIT License

---

**祝你开发愉快！** 🎉
