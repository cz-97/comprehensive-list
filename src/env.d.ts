/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare global {
  interface Window {
    services: Services
  }
  interface Bookmark {
    id: number;
    bookmark_title: string | null; // 有些书签可能没有标题
    url: string | null;
    page_title: string | null;     // 页面可能没有标题
    icon_id?: number | null;       // 关联的图标 id
  }
  interface HistoryItem {
    url: string;
    title: string | null;          // 页面可能没有标题
    频次: number;                  // visit_count
    最后访问: string;              // 已经格式化为 datetime 字符串
    icon_id?: number | null;       // 关联的图标 id
  }
}

export {}
