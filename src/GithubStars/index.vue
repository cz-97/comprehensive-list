<!--
根据 GitHub 用户名查询该用户的所有星标仓库（复用 SearchableList 组件）。
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import SearchableList from "../components/SearchableList.vue";

interface StarredRepo {
    id: number;
    full_name: string;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    owner: { login: string };
}

const loading = ref(false);
const error = ref("");
const repos = ref<StarredRepo[]>([]);

// 缓存 key（永不过期，仅按 F5 通过网络覆盖）
const CACHE_KEY = "githubStarsCache";

function readCache() {
    try {
        const raw = window.ztools.dbStorage.getItem(CACHE_KEY) ?? "";
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.repos)) return null;
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

// 进入时只从缓存取，绝不自动请求网络；无缓存则提示按 F5 刷新
onMounted(() => {
    // 预热 GitHub 连接（提前建立 TLS + keep-alive，首次 F5 就不必等完整握手）
    window.services.prewarmGithub();

    const saved = (window.ztools.dbStorage.getItem("githubUsername") ?? "") as string;
    if (!saved.trim()) {
        error.value = "请先在设置页面配置 GitHub 用户名";
        return;
    }
    const cached = readCache();
    if (cached && cached.length) {
        repos.value = cached;
    } else {
        error.value = "暂无缓存，自动拉取中";
    }
    // 后台静默刷新：预热连接并更新缓存，不阻塞、失败不影响当前显示的缓存
    refreshInBackground(saved.trim());
});

// 后台静默从网络刷新（不置空、不报错打扰，结果为下一会话提供新鲜缓存）
async function refreshInBackground(name: string) {
    try {
        const fresh = await window.services.getGithubStars(name);
        if (fresh && fresh.length) {
            repos.value = fresh;
            writeCache(fresh);
        }
    } catch {
        /* 后台刷新失败则保留当前缓存 */
    }
}

// F5 快捷键事件：从缓存刷新为强制从网络拉取
async function onF5Refresh(e: KeyboardEvent) {
    if (e.key !== "F5") return;
    e.preventDefault();
    const saved = (window.ztools.dbStorage.getItem("githubUsername") ?? "") as string;
    if (!saved.trim()) return;
    await loadStars(saved.trim());
}

async function loadStars(name: string) {
    loading.value = true;
    error.value = "";
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

// 响应式数据 getter（传给 SearchableList 以支持异步更新）
const reposGetter = () => repos.value;

// 打开行为：打开仓库页面并记录
function open(r: StarredRepo) {
    if (r.html_url) window.open(r.html_url, "_blank");
}
</script>

<template>
    <div class="gs-root">
        <SearchableList
            :items="reposGetter"
            :id-key="(r) => r.id"
            :pinyin-text="(r) => `${r.name} ${r.description ?? ''}`"
            :search-fields="(r) => [r.name, r.description, r.language]"
            placeholder="搜索星标仓库"
            list-class="search"
            accent="yellow"
            :extra-keydown="onF5Refresh"
            @open="open"
        >
            <template #default="{ item: r }">
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
            </template>
            <template #empty>
                <div class="gs-empty">{{ loading ? "查询中…" : error || "暂无数据" }}</div>
            </template>
        </SearchableList>
        <!-- F5 刷新时的纯显示蒙层：只遮罩提示，不拦截鼠标事件、不影响下方列表操作 -->
        <div v-if="loading" class="gs-overlay">
            <span class="gs-overlay-text">刷新中…</span>
        </div>
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
    position: relative;
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
/* 刷新蒙层：纯显示，pointer-events none 不挡操作 */
.gs-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 1rem;
    background: rgba(0, 0, 0, 0.35);
    pointer-events: none;
}
.gs-overlay-text {
    color: #fff;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.4rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.95em;
}
</style>