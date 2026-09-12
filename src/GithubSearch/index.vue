<!--
按关键词搜索 GitHub 仓库（复用 SearchableList 组件与 services.searchGithubRepos）。
进入时不发请求：输入关键词后按回车才搜索；回车时若关键词与上次搜索一致，则交回列表打开选中项；F5 重新搜索。
-->
<script setup lang="ts">
import { ref, onMounted } from "vue";
import SearchableList from "../components/SearchableList.vue";
import "../styles/search-list.css";

interface GithubRepo {
    id: number;
    full_name: string;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    owner: { login: string };
}

const props = defineProps({
    enterAction: { type: Object, required: true },
});

const loading = ref(false);
const error = ref("");
const repos = ref<GithubRepo[]>([]);
// 已搜索的关键词：回车时与当前关键词相同则视为“打开选中项”
const searched = ref("");

// 列表实例：读取子输入框当前关键词（SearchableList 为泛型组件，无法直接取 InstanceType）
const listRef = ref<any>(null);

// 参数解析：命令为 over 类型时 payload 为主输入框中命令之后的关键词文本（进入时预填，不自动搜索）
function parseKeyword(action: any): string {
    const payload = action?.payload;
    return typeof payload === "string" ? payload.trim() : "";
}

const initialKeyword = parseKeyword(props.enterAction);

onMounted(() => {
    // 预热 GitHub 连接（提前建立 TLS + keep-alive，回车搜索时不必等完整握手）
    window.services.prewarmGithub();
    if (!initialKeyword) error.value = "输入关键词后按回车搜索";
});

function currentKeyword(): string {
    return (listRef.value?.keyword ?? "").trim();
}

// 回车：关键词变化则发起搜索，否则不拦截，交给列表打开选中项
function onEnter(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    const q = currentKeyword();
    if (loading.value || !q || q === searched.value) return;
    e.preventDefault();
    search(q);
}

// F5：强制按当前关键词重新搜索
function onF5Refresh(e: KeyboardEvent) {
    if (e.key !== "F5") return;
    e.preventDefault();
    const q = currentKeyword() || searched.value;
    if (!q || loading.value) return;
    search(q);
}

function onExtraKeydown(e: KeyboardEvent) {
    onEnter(e);
    onF5Refresh(e);
}

async function search(q: string) {
    loading.value = true;
    error.value = "";
    try {
        repos.value = await window.services.searchGithubRepos(q);
        searched.value = q;
        if (repos.value.length === 0) error.value = "没有找到相关仓库";
    } catch (e: any) {
        error.value = e?.message ?? "搜索失败，请检查关键词或网络";
    } finally {
        loading.value = false;
    }
}

// 响应式数据 getter（传给 SearchableList 以支持异步更新）
const reposGetter = () => repos.value;

// 打开行为：打开仓库页面
function open(r: GithubRepo) {
    if (r.html_url) window.open(r.html_url, "_blank");
}
</script>

<template>
    <div class="gsearch-root">
        <SearchableList
            ref="listRef"
            :items="reposGetter"
            :id-key="(r) => r.id"
            :pinyin-text="(r) => `${r.name} ${r.description ?? ''}`"
            :search-fields="(r) => [r.full_name, r.name, r.description, r.language]"
            :initial-keyword="initialKeyword"
            placeholder="输入关键词，回车搜索"
            list-class="search"
            accent="cyan"
            :extra-keydown="onExtraKeydown"
            :open="open"
        >
            <template #default="{ item: r }">
                <div class="item-body">
                    <div class="row-top">
                        <span class="title" :title="r.full_name">{{ r.full_name }}</span>
                        <span class="meta" v-if="r.language">{{ r.language }}</span>
                    </div>
                    <div class="row-bottom">
                        <span class="gsearch-stars">★ {{ r.stargazers_count }}</span>
                        <span class="gsearch-desc">{{ r.description }}</span>
                    </div>
                </div>
            </template>
            <template #empty>
                <div class="gsearch-empty">{{ loading ? "搜索中…" : error || "暂无数据" }}</div>
            </template>
        </SearchableList>
        <!-- 搜索中的纯显示蒙层：只遮罩提示，不拦截鼠标事件、不影响下方列表操作 -->
        <div v-if="loading" class="gsearch-overlay">
            <span class="gsearch-overlay-text">搜索中…</span>
        </div>
    </div>
</template>

<style scoped>
.gsearch-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.8rem;
    box-sizing: border-box;
    gap: 0.8rem;
    position: relative;
}
.gsearch-stars {
    color: #ffce4d;
    font-weight: 700;
    margin-right: 0.6rem;
    flex-shrink: 0;
}
.gsearch-desc {
    color: #9aa7b8;
}
/* 简介单行省略：中文简介无空格，逐字断行会撑破固定 64px 的行并铺满整个插件 */
.row-bottom {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.gsearch-empty {
    color: #9aa7b8;
    font-size: 0.95em;
    padding: 0.5rem 0;
}
/* 搜索蒙层：纯显示，pointer-events none 不挡操作 */
.gsearch-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 1rem;
    background: rgba(0, 0, 0, 0.35);
    pointer-events: none;
}
.gsearch-overlay-text {
    color: #fff;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.4rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.95em;
}
</style>
