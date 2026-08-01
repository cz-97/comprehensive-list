import { ref } from "vue";
import defaultFavicon from "../assets/default-favicon.svg";

/** 按图标 id 索引：iconId -> data URL */
export const byId = ref<Record<string, string>>({});
/** 按域名索引：hostname(去 www) -> data URL，供没有关联关系时按域名回退 */
export const byDomain = ref<Record<string, string>>({});

// 本次会话已增量加载到的最大图标 id（moz_icons.id 自增）
let loadedMaxId = 0;

interface IconItem {
    icon_id?: number | null;
    url?: string | null;
}

/** 合并新增的 byId/byDomain 到响应式映射，并更新 loadedMaxId */
function merge(res: any) {
    let changed = false;
    if (res.byId) {
        const merged = { ...byId.value };
        for (const [id, v] of Object.entries(res.byId)) {
            if (id && v && typeof v !== "number" && (v as any).url) merged[id] = (v as any).url;
        }
        if (Object.keys(merged).length !== Object.keys(byId.value).length) changed = true;
        byId.value = merged;
    }
    if (res.byDomain) {
        const merged = { ...byDomain.value };
        for (const [h, v] of Object.entries(res.byDomain)) {
            if (h && v && typeof v !== "number" && (v as any).url) merged[h] = (v as any).url;
        }
        if (Object.keys(merged).length !== Object.keys(byDomain.value).length) changed = true;
        byDomain.value = merged;
    }
    return changed;
}

/**
 * 增量加载图标映射：每次只拉取 id > loadedMaxId 的新图标并合并。
 * 返回 true 表示本次有新增。会记录已加载到的最大 id，供下次继续增量。
 */
export function ensureIconsLoaded(): boolean {
    const res = window.services.getIcons(loadedMaxId);
    if (!res) return false;
    const changed = merge(res);
    if (typeof res.maxId === "number" && res.maxId > loadedMaxId) loadedMaxId = res.maxId;
    return changed;
}

/** 提取 url 的域名（去掉前缀 www.），失败返回空串 */
function hostOf(url?: string | null): string {
    try {
        return (new URL(url || "").hostname || "").replace(/^www\./, "");
    } catch {
        return "";
    }
}

/**
 * 取某条记录的图标：
 * 优先按 icon_id 查；查不到时退回按 url 的域名在 byDomain 里找；
 * 仍无则返回默认图标 default-favicon.svg。
 */
export function iconFor(item: IconItem): string {
    if (item.icon_id != null) {
        const u = byId.value[String(item.icon_id)];
        if (u) return u;
    }
    const h = hostOf(item.url);
    const byDomainUrl = h ? byDomain.value[h] ?? "" : "";
    return byDomainUrl || defaultFavicon;
}
