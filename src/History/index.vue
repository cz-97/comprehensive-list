<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { buildPinyinIndex, matchesKeyword, type PinyinEntry } from "../utils/pinyin";

defineProps({
    enterAction: {
        type: Object,
        required: true,
    },
});

// 从服务获取历史记录
const history: HistoryItem[] = window.services.getHistory();

// 预计算每条历史的拼音索引（title）
const pinyinIndex = new Map<string, PinyinEntry>();
for (const h of history) {
    pinyinIndex.set(h.url, buildPinyinIndex(h.title ?? ""));
}

const keyword = ref(""),
    selectedIndex = ref(0);

// 记录上一次处理过的按键，避免 focus/blur 切换时同一个按键被触发两次
let lastKey = "";
let lastKeyTime = 0;
const DEDUP_MS = 120;

function shouldIgnoreDuplicatedKey(e: KeyboardEvent) {
    const now = Date.now();
    if (e.key === lastKey && now - lastKeyTime < DEDUP_MS) {
        return true;
    }
    lastKey = e.key;
    lastKeyTime = now;
    return false;
}

// 过滤逻辑：普通子串 + 拼音全拼/首字母匹配
const filteredHistory = computed(() => {
    let list = history;
    if (keyword.value.trim()) {
        const k = keyword.value.trim().toLowerCase().replace(/\s+/g, "");
        list = list.filter((h) =>
            matchesKeyword(
                k,
                [h.title, h.url],
                pinyinIndex.get(h.url) ?? null,
            ),
        );
    }
    return list;
});

// 当过滤结果变化时，重置选中到第一项，并滚回可见区域
watch(filteredHistory, () => {
    selectedIndex.value = 0;
    scrollSelectedIntoView();
});

function scrollSelectedIntoView() {
    nextTick(() => {
        const el = document.querySelector(".history-item.selected");
        el?.scrollIntoView({ block: "nearest" });
    });
}

// 进入插件时，让主应用（历史页面）获得焦点
onMounted(() => {
    window.ztools.subInputBlur();
    nextTick(() => {
        (document.querySelector(".history-list") as HTMLElement | null)?.focus();
    });
});

// 切换选中项，并确保其滚动到可见区域
function moveSelection(delta: number) {
    const count = filteredHistory.value.length;
    if (count === 0) return;
    const next = selectedIndex.value + delta;
    if (next < 0 || next >= count) return; // 不循环，边界处停止
    selectedIndex.value = next;
    scrollSelectedIntoView();
}

// 跳到第一行
function moveToFirst() {
    if (filteredHistory.value.length === 0) return;
    selectedIndex.value = 0;
    scrollSelectedIntoView();
}

// 跳到最后一行
function moveToLast() {
    const count = filteredHistory.value.length;
    if (count === 0) return;
    selectedIndex.value = count - 1;
    scrollSelectedIntoView();
}

// 回车跳转当前选中的历史记录
function onEnter() {
    const h = filteredHistory.value[selectedIndex.value];
    if (h?.url) {
        window.open(h.url, "_blank");
    }
}

// 跳转到指定下标的历史记录
function openHistory(index: number) {
    const h = filteredHistory.value[index];
    if (h?.url) {
        window.open(h.url, "_blank");
    }
}

// 单击选中该行
function onRowClick(index: number) {
    selectedIndex.value = index;
    scrollSelectedIntoView();
}

// 双击跳转到该行对应的历史记录
function onRowDblClick(index: number) {
    selectedIndex.value = index;
    openHistory(index);
}

// 键盘事件处理：上下箭头切换选中，回车跳转
function onKeydown(e: KeyboardEvent) {
    // 同一个按键被重复触发（focus/blur 切换导致）时只处理一次
    if (shouldIgnoreDuplicatedKey(e)) return;

    switch (e.key) {
        case "ArrowDown":
            e.preventDefault();
            window.ztools.subInputBlur();
            moveSelection(1);
            break;
        case "ArrowUp":
            e.preventDefault();
            window.ztools.subInputBlur();
            moveSelection(-1);
            break;
        case "Enter":
            e.preventDefault();
            window.ztools.subInputBlur();
            onEnter();
            break;
        case "Backspace":
            e.preventDefault();
            // 删除搜索内容最后一个字符，并写回子输入框
            {
                const value = keyword.value.slice(0, -1);
                window.ztools.setSubInputValue(value);
                keyword.value = value;
                selectedIndex.value = 0;
                window.ztools.subInputFocus();
            }
            break;
        case "Home":
            e.preventDefault();
            window.ztools.subInputBlur();
            moveToFirst();
            break;
        case "End":
            e.preventDefault();
            window.ztools.subInputBlur();
            moveToLast();
            break;
        default:
            // 当主应用获得焦点时，把可打印字符写回子输入框，使其进入搜索内容
            if (e.key.length === 1) {
                e.preventDefault();
                const value = (keyword.value + e.key).slice(0, 200);
                window.ztools.setSubInputValue(value);
                keyword.value = value;
                selectedIndex.value = 0;
            }
            window.ztools.subInputFocus();
            break;
    }
}

function onChange(input: { text: string }) {
    keyword.value = input.text;
    selectedIndex.value = 0;
}
window.ztools.setSubInput(onChange, "搜索历史", true);
</script>

<template>
    <main class="history-list" tabindex="0" @keydown="onKeydown">
        <div
            v-for="(h, index) in filteredHistory"
            :key="h.url"
            class="history-item"
            :class="{ selected: index === selectedIndex }"
            @click="onRowClick(index)"
            @dblclick="onRowDblClick(index)"
        >
            <div class="row-top">
                <span class="title" :title="h.title ?? ''">{{ h.title }}</span>
                <span class="meta">
                    <span class="freq" v-if="h.频次">{{ h.频次 }}次</span>
                    <span class="time" v-if="h.最后访问">{{ h.最后访问 }}</span>
                </span>
            </div>
            <div class="row-url">
                <a :href="h.url" target="_blank">{{ h.url }}</a>
            </div>
        </div>
    </main>
</template>

<style scoped>
.history-list {
    flex: 1;
    padding: 1rem;
    outline: none;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
}
.history-item {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
}
.history-item.selected {
    background-color: #4a4b4d;
}
.row-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    line-height: 1.3;
}
.title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.meta {
    flex-shrink: 0;
    display: flex;
    gap: 0.75rem;
    font-size: 0.78em;
    color: #999;
}
.row-url {
    margin-top: 0.15rem;
    line-height: 1.1;
    font-size: 0.82em;
    min-width: 0;
}
.row-url a {
    color: #43c9ff;
    text-decoration: none;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.row-url a:hover {
    text-decoration: underline;
}
</style>
