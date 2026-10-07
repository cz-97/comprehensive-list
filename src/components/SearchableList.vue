<!--
通用可搜索、可键盘导航列表组件（抽象自 useSearchableList）：
- 拼音/子串过滤、↑↓/Home/End/Enter/Backspace 处理、选中、click/dblclick 打开
- 焦点跟随按键切换：进入时列表持有焦点（可直接 ↑↓ 导航），
  在列表里按下可打印字符时把该字符「移交」回宿主子输入框并交还焦点
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
        /** 初始关键词（进入时预填子输入框，不触发搜索） */
        initialKeyword?: string;
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
        initialKeyword: "",
        listClass: "search",
        accent: "white",
        extraKeydown: undefined,
    },
);

// 兼容数组或 getter 函数，统一取当前值
const getItems = () =>
    typeof props.items === "function" ? props.items() : props.items;

const keyword = ref(props.initialKeyword ?? "");
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

// 列表元素当前是否持有 DOM 焦点（= 用户在列表区域操作，而非在宿主子输入框里输入）
function hasListFocus() {
    const el = document.querySelector(
        `.${props.listClass}-list`,
    ) as HTMLElement | null;
    return !!el && document.activeElement === el;
}

// 焦点交还子输入框后，宿主需要一点时间完成真正的 DOM focus，
// 立即重放按键会被子输入框之前的焦点（列表）吞掉。
const FOCUS_HANDOFF_DELAY = 20;

// 重放按键的冷却时间：宿主可能把系统级注入的按键再回送给插件页面，
// 若此刻列表仍持有焦点，会形成「转发 → 重放 → 回送 → 再转发」的死循环，
// 因此转发后一段时间内不再重复转发。
const FORWARD_COOLDOWN = 300;
let lastForwardKey = "";
let lastForwardTime = 0;

// 把宿主按键名（DOM KeyboardEvent.key）映射为 simulateKeyboardTap 认识的键名。
// 宿主原生层只认 'a'~'z'、'0'~'9'、符号键与 left/right/up/down/space/return 等，
// 字母大小写靠 shift 修饰键表达，而不是直接传大写。
function toHostTapKey(key: string): { key: string; shift: boolean } | null {
    // 空格
    if (key === " " || key === "Spacebar") return { key: "space", shift: false };
    if (key.length !== 1) return null;
    // 小写字母
    if (key >= "a" && key <= "z") return { key, shift: false };
    // 大写字母 -> 小写 + shift
    if (key >= "A" && key <= "Z")
        return { key: key.toLowerCase(), shift: true };
    // 数字与符号：原样传递（shift 组合键已在事件里消费，不重复表达）
    if (/^[0-9\-=[\]\\;',./`]$/.test(key)) return { key, shift: false };
    return null;
}

// 焦点在列表时按下可打印字符：把焦点交还子输入框，并让该字符重新走一遍输入法。
//
// 为什么不能直接 setSubInputValue：那是直接改文本，绕过了输入法，
// 中文输入法只从第二个字母开始组字（输入 zh 的候选里没有 z 开头的结果）。
// 正确做法是「重放按键」——simulateKeyboardTap 走宿主原生模块的系统级注入
// （Windows 下是 SendInput），该注入会经过系统 IME/TSF 管线，
// 因此首字母能与后续字母一起正常进入中文组字候选。
function forwardCharToSubInput(e: KeyboardEvent) {
    // 阻止列表自身的默认处理（避免字符被当作搜索关键词本地追加）
    e.preventDefault();
    const tap = toHostTapKey(e.key);
    // 记录本次转发的按键：用于识别宿主回送的同一个按键，避免死循环
    lastForwardKey = e.key;
    lastForwardTime = Date.now();
    // 先把焦点交还子输入框，等宿主完成 focus 后再重放按键
    window.ztools.subInputFocus();
    window.setTimeout(() => {
        if (!tap) {
            // 无法映射的字符（如非美式布局产生的符号）退化为直接写值，至少不丢字符
            const value = (keyword.value + e.key).slice(0, 200);
            window.ztools.setSubInputValue(value);
            keyword.value = value;
            return;
        }
        if (tap.shift) window.ztools.simulateKeyboardTap(tap.key, "shift");
        else window.ztools.simulateKeyboardTap(tap.key);
    }, FOCUS_HANDOFF_DELAY);
}

// 该按键是否刚刚由本组件转发出去（即可能是宿主回送的同一个按键）
function isEchoOfForwardedKey(e: KeyboardEvent) {
    return (
        e.key === lastForwardKey &&
        Date.now() - lastForwardTime < FORWARD_COOLDOWN
    );
}

// 进入时让列表获得焦点：↑↓/Home/End/Enter 等导航键直接可用，
// 需要输入文字时按任意可打印字符即把焦点切回子输入框（见 forwardCharToSubInput）。
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
    // 本组件刚转发出去、又被宿主回送的同一个按键：吞掉，避免再次转发造成死循环
    if (e.key.length === 1 && isEchoOfForwardedKey(e)) {
        e.preventDefault();
        return;
    }

    // 先执行附加的 keydown 处理（如 F5 刷新、回车搜索），若其已消费该按键则不再处理
    props.extraKeydown?.(e);
    if (e.defaultPrevented) return;
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
            // 焦点在宿主子输入框时由宿主自行删除并通过 onChange 回传，这里不重复写入（避免打断输入法组字）
            if (hasListFocus()) {
                e.preventDefault();
                window.ztools.subInputFocus();
                // 已经没有任何字符可删时不必再写值：写值会重置子输入框、打断输入法状态
                if (keyword.value) {
                    const value = keyword.value.slice(0, -1);
                    window.ztools.setSubInputValue(value);
                    keyword.value = value;
                }
                selectedIndex.value = 0;
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
            // 焦点在列表时按下可打印字符：把焦点交还子输入框，
            // 并通过重放按键让该字符经过输入法（否则中文首字母会丢失）
            if (e.key.length === 1 && hasListFocus()) {
                forwardCharToSubInput(e);
                return;
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
// 预填初始关键词到子输入框（仅填充，不触发搜索）
if (keyword.value) window.ztools.setSubInputValue(keyword.value);

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
/* SearchableList 通用骨架样式（scoped；slot 内容样式见 ../styles/search-list.css） */

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

@media (max-width: 720px) {
    .search-list {
        padding: 0.75rem;
    }

    .search-item {
        align-items: flex-start;
        padding: 0.7rem;
    }
}
</style>
