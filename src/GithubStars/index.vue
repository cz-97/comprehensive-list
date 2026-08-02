<!--
根据 GitHub 用户名查询该用户的所有星标仓库（复用 useSearchableList 列表逻辑与 search-list.css 样式）。
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSearchableList } from "../utils/useSearchableList";
import "../styles/search-list.css";

interface StarredRepo {
    id: number;
    full_name: string;
    name: string;
    description: string | null;
    html_url: string;
    url: string;
    language: string | null;
    stargazers_count: number;
    owner: { login: string };
}

const loading = ref(false);
const error = ref("");
const repos = ref<StarredRepo[]>([]);

// 缓存 key 与有效期（毫秒），避免每次进入都重新请求 GitHub API
const CACHE_KEY = "githubStarsCache";
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

function readCache() {
    try {
        const raw = window.ztools.dbStorage.getItem(CACHE_KEY) ?? "";
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.repos)) return null;
        if (Date.now() - data.timestamp > CACHE_TTL) {
            window.ztools.dbStorage.setItem(CACHE_KEY, "");
            return null;
        }
        return data.repos as StarredRepo[];
    } catch {
        return null;
    }
}

function writeCache(data: StarredRepo[]) {
    try {
        window.ztools.dbStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), repos: data }));
    } catch {
        /* 缓存失败不影响查询 */
    }
}

// 进入时若已在配置页预填 GitHub 用户名，则自动查询（优先用缓存）
onMounted(async () => {
    const saved = (window.ztools.dbStorage.getItem("githubUsername") ?? "") as string;
    if (!saved.trim()) {
        error.value = "请先在设置页面配置 GitHub 用户名";
        return;
    }
    const cached = readCache();
    if (cached && cached.length) {
        repos.value = cached;
        return;
    }
    await loadStars(saved.trim());
});

async function loadStars(name: string) {
    loading.value = true;
    error.value = "";
    repos.value = [];
    try {
        repos.value = await window.services.getGithubStars(name);
        if (repos.value.length === 0) error.value = "该用户没有星标仓库";
        else writeCache(repos.value);
    } catch (e: any) {
        error.value = e?.message ?? "查询失败，请检查用户名或网络";
    } finally {
        loading.value = false;
    }
}

// 复用书签的搜索列表逻辑
const { filtered, selectedIndex, onKeydown, onRowClick, onRowDblClick, keyOf } = useSearchableList<StarredRepo>({
    items: () => repos.value,
    idKey: (r) => r.id,
    pinyinText: (r) => `${r.name} ${r.description ?? ""}`,
    searchFields: (r) => [r.name, r.description, r.language],
    placeholder: "搜索星标仓库",
    listClass: "search",
});
</script>

<template>
    <div class="gs-root">
        <main
            class="search-list"
            style="--accent: #43c9ff"
            tabindex="0"
            @keydown="onKeydown"
        >
            <template v-if="filtered.length">
                <div
                    v-for="(r, index) in filtered"
                    :key="keyOf(r)"
                    class="search-item"
                    :class="{ selected: index === selectedIndex }"
                    @click="onRowClick(index)"
                    @dblclick="onRowDblClick(index)"
                >
                    <div class="item-body">
                        <div class="row-top">
                            <span class="title" :title="r.full_name">{{ r.full_name }}</span>
                            <span class="meta" v-if="r.language">{{ r.language }}</span>
                        </div>
                        <div class="row-url">
                            <span class="gs-stars">★ {{ r.stargazers_count }}</span>
                            <span class="gs-desc">{{ r.description }}</span>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="gs-empty">{{ loading ? "查询中…" : error || "暂无数据" }}</div>
            </template>
        </main>
    </div>
</template>

<style scoped>
.gs-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.8rem;
    box-sizing: border-box;
    gap: 0.8rem;
}
.gs-loading {
    color: #9aa7b8;
    font-size: 0.95em;
}
.gs-error {
    color: #ff7a7a;
    font-size: 0.9em;
}
.gs-stars {
    color: #ffce4d;
    font-weight: 700;
    margin-right: 0.6rem;
    flex-shrink: 0;
}
.gs-desc {
    color: #9aa7b8;
}
.gs-empty {
    color: #9aa7b8;
    font-size: 0.95em;
    padding: 0.5rem 0;
}
</style>