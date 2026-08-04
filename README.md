# Comprehensive List

> 综合列表 ZTools 插件，目前支持 Firefox 书签、浏览历史和 GitHub 星标仓库的查询；插件设置页用于集中配置各功能所需的信息，并可随功能扩展。

## ✨ 功能特性

| 功能           | 触发指令            | 说明                                                |
| -------------- | ------------------- | --------------------------------------------------- |
| **书签**       | `书签` / `bookmark` | 搜索并打开 Firefox 书签，支持关键字过滤             |
| **历史**       | `历史` / `history`  | 浏览 Firefox 历史记录，需先配置配置文件文件夹       |
| **插件设置** | `设置` / `settings` / `配置文件夹` | 集中配置浏览器配置文件夹、GitHub 信息等功能设置，并可随功能扩展 |
| **GitHub 星标** | `GitHub星标` / `github stars` / `星标` | 查询 GitHub 用户的星标仓库 |

### 书签功能

- 支持按名称、标题、URL 关键字过滤
- 键盘导航：`↑` / `↓` 移动选中，`Enter` 打开选中书签，`Home` / `End` 跳到首尾
- `Backspace` 删除搜索内容，普通字符键直接输入进搜索框
- 单击选中，双击跳转打开书签

## 📁 项目结构

```
.
├── dist/                         # 构建产物（gitignore）
│   ├── preload/
│   │   ├── node_modules/         # 预加载脚本依赖
│   │   ├── package.json
│   │   ├── package-lock.json
│       └── services.js
│   └── dist.zip                  # 打包后的插件压缩包
├── node_modules/                 # 项目依赖
├── public/
│   ├── logo.png                  # 插件图标
│   ├── plugin.json               # 插件配置文件
│   |── preload/                  # 预加载脚本（开发用）
│       ├── node_modules/         # 预加载脚本依赖
│       ├── package.json
│       ├── package-lock.json
│       └── services.js           # Node.js 服务（数据库查询、文件读取等）
│── scripts/
│   └── zip.ts                    # 打包脚本（bun）
├── src/
│   ├── main.ts                   # 入口文件
│   ├── main.css                  # 全局样式
│   ├── App.vue                   # 根组件（按功能 code 路由）
│   ├── env.d.ts                  # 类型声明（Bookmark / HistoryItem 等）
│   ├── Bookmark/                 # 书签功能组件
│   │   └── index.vue
│   ├── History/                  # 历史功能组件
│   │   └── index.vue
│   ├── Setting/                  # 插件设置组件
│   │   └── index.vue
│   ├── components/               # 复用组件
│   │   └── SearchableList.vue    # 可搜索列表（含 scoped 骨架样式）
│   ├── assets/                   # 静态资源
│   │   └── default-favicon.png   # 默认 favicon
│   └── utils/                    # 工具函数
│       ├── icons.ts              # 图标工具函数
│       ├── pinyin.ts             # 拼音工具函数
│       └── useSearchableList.ts  # 搜索列表工具函数
├── index.html                    # HTML 模板
├── package.json                  # 项目依赖与脚本
├── bun.lock                      # bun 锁文件
├── README.md                     # 项目文档
├── tsconfig.json                 # TypeScript 配置
└── vite.config.js                # Vite 配置
```

## 🚀 快速开始

### 安装依赖

```bash
bun install
cd public/preload
npm install
```

### 开发模式

```bash
bun run dev
```

开发服务器将在 `http://localhost:5173` 启动，即 `plugin.json` 中 `development.main` 指向的地址。ZTools 会自动加载开发版本。

### 构建生产版本

```bash
bun run build
```

构建产物将输出到 `dist/` 目录。

### 打包为 ZIP

```bash
bun run zip
```

将 `dist/dist.zip` 放入 ZTools 插件目录进行测试。

### 一键构建并打包

```bash
bun run pack
```

等价于 `bun run build && bun run zip`。

## 📖 开发指南

### 1. 插件配置

插件信息与功能入口在 `public/plugin.json` 中声明：

- `name` / `title` / `description` / `author` / `version` — 插件基本信息
- `main` — 主页面入口（指向 `index.html`）
- `preload` — 预加载脚本路径（指向 `preload/services.js`）
- `logo` — 插件图标
- `development.main` — 开发模式下 ZTools 加载的地址
- `features` — 功能列表，每个功能包含：
  - `code` — 功能标识，`App.vue` 据此路由到对应组件
  - `explain` — 功能说明
  - `icon` — 功能图标
  - `cmds` — 触发指令列表（支持字符串或文件选择配置）

### 2. 添加新功能

#### 创建 Vue 组件

在 `src/` 目录下创建功能组件（如 `src/MyFeature/index.vue`），通过 `defineProps` 接收 `enterAction`：

```vue
<!-- src/MyFeature/index.vue -->
<script setup lang="ts">
const props = defineProps({
  enterAction: { type: Object, required: true },
});
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
const fs = require("fs");
const path = require("path");

module.exports = {
  readFile: (filePath) => {
    return fs.readFileSync(filePath, "utf-8");
  },
  // 其他服务
};
```

```ts
const content = window.services.readFile("/path/to/file");
```

当前 `services.js` 已提供以下服务：

| 方法                | 说明                                           |
| ------------------- | ---------------------------------------------- |
| `readFile(file)`    | 读取文件内容                                   |
| `query(sql)`        | 执行 SQL 查询                                  |
| `getBookmarks()`    | 获取书签列表（含 `icon_id`，不含 BLOB）        |
| `getHistory()`      | 获取历史记录列表（含 `icon_id`，不含 BLOB）    |
| `getIcons(fromId?)` | 增量获取图标，返回 `{ byId, byDomain, maxId }` |

### 4. 使用 ZTools API

```ts
window.ztools.onPluginEnter((action) => {
  // action.code 为功能 code
});
window.ztools.setSubInput(
  (input) => {
    // 子输入框内容变化
  },
  "搜索书签",
  true,
);
window.ztools.subInputBlur();
window.ztools.subInputFocus();
// 更多 API 请参考官方文档
```

## 📦 构建与发布

1. 运行 `bun run build` 构建生产版本
2. 将 `dist/` 中的文件放入 ZTools 插件目录进行测试
3. 运行 `bun run zip` 生成 `dist/dist.zip` 方便分发

## 📚 相关资源

- [ZTools 官方文档](https://github.com/ztool-center/ztools)
- [ZTools API 文档](https://github.com/ztool-center/ztools-api-types)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)

## ❓ 常见问题

### Q: 书签/历史显示为空？

确保已通过 `设置` 功能正确配置需要读取的浏览器配置文件夹，并使用 `window.services.getBookmarks()` / `getHistory()` 读取数据。

### Q: 图标不显示？

`getIcons()` 返回的图标数据按 `icon_id` 关联，前端需根据返回的 `byId` / `byDomain` 映射渲染图标。

## 📄 开源协议

MIT License
