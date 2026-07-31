<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { buildPinyinIndex, matchesKeyword, type PinyinEntry } from "../utils/pinyin";

defineProps({
    enterAction: {
        type: Object,
        required: true,
    },
});

// 从服务获取书签和文件夹数据
const bookmarks: Bookmark[] = window.services.getBookmarks();

// 预计算每个书签的拼音索引（title + page_title 聚合）
const pinyinIndex = new Map<number, PinyinEntry>();
for (const b of bookmarks) {
    pinyinIndex.set(b.id, buildPinyinIndex(`${b.bookmark_title ?? ""} ${b.page_title ?? ""}`));
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
const filteredBookmarks = computed(() => {
    let list = bookmarks;
    if (keyword.value.trim()) {
        const k = keyword.value.trim().toLowerCase().replace(/\s+/g, "");
        list = list.filter((b) =>
            matchesKeyword(
                k,
                [b.bookmark_title, b.page_title, b.url],
                pinyinIndex.get(b.id) ?? null,
            ),
        );
    }
    return list;
});

// 当过滤结果变化时，重置选中到第一项，并滚回可见区域
watch(filteredBookmarks, () => {
    selectedIndex.value = 0;
    scrollSelectedIntoView();
});

function scrollSelectedIntoView() {
    nextTick(() => {
        const el = document.querySelector(".bookmark-item.selected");
        el?.scrollIntoView({ block: "nearest" });
    });
}

// 进入插件时，让主应用（书签页面）获得焦点
onMounted(() => {
    window.ztools.subInputBlur();
    nextTick(() => {
        (document.querySelector(".bookmark-list") as HTMLElement | null)?.focus();
    });
});

// 切换选中项，并确保其滚动到可见区域
function moveSelection(delta: number) {
    const count = filteredBookmarks.value.length;
    if (count === 0) return;
    const next = selectedIndex.value + delta;
    if (next < 0 || next >= count) return; // 不循环，边界处停止
    selectedIndex.value = next;
    scrollSelectedIntoView();
}

// 跳到第一行
function moveToFirst() {
    if (filteredBookmarks.value.length === 0) return;
    selectedIndex.value = 0;
    scrollSelectedIntoView();
}

// 跳到最后一行
function moveToLast() {
    const count = filteredBookmarks.value.length;
    if (count === 0) return;
    selectedIndex.value = count - 1;
    scrollSelectedIntoView();
}

// 回车跳转当前选中的书签
function onEnter() {
    const b = filteredBookmarks.value[selectedIndex.value];
    if (b?.url) {
        window.open(b.url, "_blank");
    }
}

// 跳转到指定下标的书签
function openBookmark(index: number) {
    const b = filteredBookmarks.value[index];
    if (b?.url) {
        window.open(b.url, "_blank");
    }
}

// 单击选中该行
function onRowClick(index: number) {
    selectedIndex.value = index;
    scrollSelectedIntoView();
}

// 双击跳转到该行对应的书签
function onRowDblClick(index: number) {
    selectedIndex.value = index;
    openBookmark(index);
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
window.ztools.setSubInput(onChange, "搜索书签", true);
</script>

<template>
    <main class="bookmark-list" tabindex="0" @keydown="onKeydown">
        <div
            v-for="(b, index) in filteredBookmarks"
            :key="b.id"
            class="bookmark-item"
            :class="{ selected: index === selectedIndex }"
            @click="onRowClick(index)"
            @dblclick="onRowDblClick(index)"
        >
            <div class="row-top">
                <span class="title" :title="b.bookmark_title ?? ''">{{ b.bookmark_title }}</span>
                <span class="meta">{{ b.page_title }}</span>
            </div>
            <div class="row-url">
                <a :href="b.url ?? undefined" target="_blank">{{ b.url }}</a>
            </div>
        </div>
    </main>
</template>

<style scoped>
.bookmark-list {
    flex: 1;
    padding: 1rem;
    outline: none;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
}
.bookmark-item {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
}
.bookmark-item.selected {
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
    max-width: 60%;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
