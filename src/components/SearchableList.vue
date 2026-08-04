<!--
通用可搜索、可键盘导航列表组件（抽象自 useSearchableList）：
- 拼音/子串过滤、↑↓/Home/End/Enter/Backspace 处理、选中、click/dblclick 打开、进入自动聚焦
- 通过 scoped slot 渲染每一行，通过 #empty 渲染空态
-->
<script setup lang="ts" generic="T">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import {
    buildPinyinIndex,
    matchesKeyword,
    type PinyinEntry,
} from "../utils/pinyin";

// 类型定义
type ItemsOrGetter<T> = T[] | (() => T[]);

const props = withDefaults(
    defineProps<{
        /** 待过滤数据：静态数组或 getter 函数（响应异步更新） */
        items: ItemsOrGetter<T>;
        /** 每项唯一 key（用于 v-for :key 和拼音索引） */
        idKey: (item: T) => string | number;
        /** 需参与拼音匹配的字段文本（预计算索引） */
        pinyinText: (item: T) => string;
        /** 搜索时尝试匹配的字段 */
        searchFields: (item: T) => (string | null | undefined)[];
        /** 子输入框占位符 */
        placeholder?: string;
        /** 列表 class 前缀（默认 "search" -> ".search-list"/".search-item"） */
        listClass?: string;
        /** --accent 强调色 */
        accent?: string;
        /** 附加 keydown 处理（如 F5 刷新），在列表带焦点时叠加触发 */
        extraKeydown?: (e: KeyboardEvent) => void;
        /** open行为 */
        open: (item: T) => void;
    }>(),
    {
        placeholder: "关键字",
        listClass: "search",
        accent: "white",
        extraKeydown: undefined,
    },
);

// 兼容数组或 getter 函数，统一取当前值
const getItems = () =>
    typeof props.items === "function" ? props.items() : props.items;

const keyword = ref("");
const selectedIndex = ref(0);

// 预计算拼音索引（仅构建一次）
const pinyinIndex = new Map<string | number, PinyinEntry>();
for (const it of getItems()) {
    pinyinIndex.set(props.idKey(it), buildPinyinIndex(props.pinyinText(it)));
}

// 过滤：普通子串 + 拼音全拼/首字母（getter 形式可响应数据更新）
const filtered = computed(() => {
    let list = getItems();
    if (keyword.value.trim()) {
        const k = keyword.value.trim().toLowerCase().replace(/\s+/g, "");
        list = list.filter((it) =>
            matchesKeyword(
                k,
                props.searchFields(it) as (string | null)[],
                pinyinIndex.get(props.idKey(it)) ?? null,
            ),
        );
    }
    return list;
});

// 过滤结果变化时重置选中并滚回可见
watch(filtered, () => {
    selectedIndex.value = 0;
    scrollSelectedIntoView();
});

function scrollSelectedIntoView() {
    nextTick(() => {
        const el = document.querySelector(`.${props.listClass}-item.selected`);
        el?.scrollIntoView({ block: "nearest" });
    });
}

// 进入时让主应用（列表）获得焦点
onMounted(() => {
    window.ztools.subInputBlur();
    nextTick(() => {
        (
            document.querySelector(
                `.${props.listClass}-list`,
            ) as HTMLElement | null
        )?.focus();
    });
});

// 触发打开指定下标项（具体打开行为由应用组件在 @open 中定义）
function openIndex(index: number) {
    const it = filtered.value[index];
    if (it) props.open(it);
}

function onEnter() {
    openIndex(selectedIndex.value);
}

function moveSelection(delta: number) {
    const count = filtered.value.length;
    if (count === 0) return;
    const next = selectedIndex.value + delta;
    if (next < 0 || next >= count) return; // 不循环，边界处停止
    selectedIndex.value = next;
    scrollSelectedIntoView();
}

function moveToFirst() {
    if (filtered.value.length === 0) return;
    selectedIndex.value = 0;
    scrollSelectedIntoView();
}

function moveToLast() {
    const count = filtered.value.length;
    if (count === 0) return;
    selectedIndex.value = count - 1;
    scrollSelectedIntoView();
}

function onRowClick(index: number) {
    selectedIndex.value = index;
    scrollSelectedIntoView();
}

function onRowDblClick(index: number) {
    selectedIndex.value = index;
    openIndex(index);
}

// 按键去重：宿主在焦点从插件页面切回子输入框时可能重放同一个按键，
// 导致同一按键被处理两次。但只有会触发 subInputFocus() 的按键
// （可打印字符、Backspace）才会转移焦点，存在被重放的可能；
// 方向键等不转移焦点的按键若也去重，会吞掉用户快速连按/按住不放
// （浏览器 repeat 间隔通常小于窗口）导致的正常连续输入。
let lastKey = "";
let lastKeyTime = 0;
const DEDUP_MS = 120;
function shouldIgnoreDuplicatedKey(e: KeyboardEvent) {
    // 不转移焦点到子输入框的按键（方向键、Enter、Home、End 等）不去重
    if (e.key.length > 1 && e.key !== "Backspace") return false;
    // 按住产生的 repeat 事件属于正常连续输入，不去重
    if (e.repeat) return false;
    const now = Date.now();
    if (e.key === lastKey && now - lastKeyTime < DEDUP_MS) return true;
    lastKey = e.key;
    lastKeyTime = now;
    return false;
}

function onKeydown(e: KeyboardEvent) {
    // 先执行附加的 keydown 处理（如 F5），不拦截正常按键
    props.extraKeydown?.(e);
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
            // 主应用获得焦点时，把可打印字符写回子输入框
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
window.ztools.setSubInput(onChange, props.placeholder, true);

defineExpose({
    keyword,
    filtered,
    selectedIndex,
});
</script>

<template>
    <main
        class="search-list"
        :style="{ '--accent': accent }"
        tabindex="0"
        @keydown="onKeydown"
    >
        <template v-if="filtered.length">
            <div
                v-for="(item, index) in filtered"
                :key="idKey(item)"
                :class="['search-item', { selected: index === selectedIndex }]"
                @click="onRowClick(index)"
                @dblclick="onRowDblClick(index)"
            >
                <slot
                    :item="item"
                    :index="index"
                    :selected="index === selectedIndex"
                >
                    {{ item }}
                </slot>
            </div>
        </template>
        <template v-else>
            <slot name="empty"></slot>
        </template>
    </main>
</template>

<style scoped>
/* SearchableList 通用骨架样式（scoped；slot 内的个性化 class 用 :deep 命中） */

.search-list {
    flex: 1;
    padding: 0.8rem;
    outline: none;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
}

.search-item {
    height: 64px;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.5rem;
    padding: 0 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease;
}

.search-item::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    border-radius: 8px 0 0 8px;
    background: var(--accent, #43c9ff);
    box-shadow: 0 0 18px
        color-mix(in srgb, var(--accent, #43c9ff) 80%, transparent);
    opacity: 0.55;
}

.search-item:hover {
    border-color: color-mix(in srgb, var(--accent, #43c9ff) 38%, transparent);
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent, #43c9ff) 11%, transparent),
        rgba(255, 255, 255, 0.045)
    );
}

.search-item.selected {
    border-color: rgba(67, 201, 255, 0.72);
    background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent, #43c9ff) 20%, transparent),
        rgba(154, 124, 255, 0.12)
    );
    box-shadow:
        0 0 0 1px rgba(67, 201, 255, 0.18),
        0 16px 36px rgba(0, 0, 0, 0.32);
}

/* slot 内容（父组件作用域）内的通用骨架 class，用 :deep 穿透命中 */
:deep(.favicon) {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    object-fit: contain;
    border-radius: 6px;
    padding: 3px;
}

:deep(.item-body) {
    flex: 1;
    min-width: 0;
}

:deep(.row-top) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    line-height: 1.35;
}

:deep(.title) {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #f4f8ff;
    font-size: 1rem;
    font-weight: 650;
}

:deep(.meta) {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 45%;
    min-width: 0;
    font-size: 0.78em;
    color: #9aa7b8;
}

:deep(.row-url) {
    margin-top: 0.2rem;
    line-height: 1.2;
    font-size: 0.84em;
    min-width: 0;
}

:deep(.row-url a) {
    color: #43c9ff;
    text-decoration: none;
    display: inline-block;
    max-width: 100%;
    vertical-align: top;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
}

:deep(.row-url a:hover) {
    color: #7fe3ff;
    text-decoration: underline;
}

@media (max-width: 720px) {
    .search-list {
        padding: 0.75rem;
    }

    .search-item {
        align-items: flex-start;
        padding: 0.7rem;
    }

    :deep(.row-top) {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.28rem;
    }

    :deep(.meta) {
        max-width: 100%;
    }
}
</style>
