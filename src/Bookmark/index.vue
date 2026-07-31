<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";

defineProps({
    enterAction: {
        type: Object,
        required: true,
    },
});

// 从服务获取书签和文件夹数据
const bookmarks: Bookmark[] = window.services.getBookmarks();

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

// 过滤逻辑：先按文件夹，再按搜索
const filteredBookmarks = computed(() => {
    let list = bookmarks;
    if (keyword.value.trim()) {
        const k = keyword.value.trim().toLowerCase();
        list = list.filter(
            (b) =>
                (b.bookmark_title ?? "").toLowerCase().includes(k) ||
                (b.url ?? "").toLowerCase().includes(k) ||
                (b.page_title ?? "").toLowerCase().includes(k),
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
        const el = document.querySelector("tr.selected");
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
        <table>
            <thead>
                <tr>
                    <th>名称</th>
                    <th>标题</th>
                    <th>URL</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(b, index) in filteredBookmarks"
                    :key="b.id"
                    :class="{ selected: index === selectedIndex }"
                    @click="onRowClick(index)"
                    @dblclick="onRowDblClick(index)"
                >
                    <td>{{ b.bookmark_title }}</td>
                    <td>{{ b.page_title }}</td>
                    <td>
                        <a :href="b.url" target="_blank">{{ b.url }}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    </main>
</template>

<style scoped>
.bookmark-list {
    flex: 1;
    padding: 1rem;
    outline: none;
}
.bookmark-list table {
    width: 100%;
    border-collapse: collapse;
}
.bookmark-list th,
.bookmark-list td {
    border: 1px solid #ddd;
    padding: 0.5rem;
}
.bookmark-list a {
    color: #43c9ff;
    text-decoration: none;
}
.bookmark-list a:hover {
    text-decoration: underline;
}
.bookmark-list tr.selected {
    background-color: #4a4b4d;
}
</style>
