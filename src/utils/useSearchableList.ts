import { ref, computed, watch, nextTick, onMounted } from "vue";
import { buildPinyinIndex, matchesKeyword, type PinyinEntry } from "./pinyin";

export interface SearchableListOptions<T> {
    /** 待过滤的数据。可传静态数组，也可传 getter 函数（如 () => repos.value）以响应异步更新。 */
    items: T[] | (() => T[]);
    /** 每项的唯一 key（用于 v-for :key 和拼音索引） */
    idKey: (item: T) => string | number;
    /** 需要参与拼音匹配的字段文本（用于预计算拼音索引） */
    pinyinText: (item: T) => string;
    /** 搜索时尝试匹配的字段（普通子串 + 拼音） */
    searchFields: (item: T) => (string | null | undefined)[];
    /** 子输入框占位符 */
    placeholder: string;
    /** 列表 class 前缀，用于焦点与选中项的 DOM 选择（如 "bookmark" -> ".bookmark-list"/".bookmark-item"） */
    listClass: string;
}

/**
 * 通用可搜索、可键盘导航列表逻辑：
 * 拼音/子串过滤、↑↓/Home/End/Enter/Backspace 处理、选中、click/dblclick 打开、进入自动聚焦。
 */
export function useSearchableList<T>(o: SearchableListOptions<T>) {
    const keyword = ref("");
    const selectedIndex = ref(0);

    // 兼容数组或 getter 函数，统一取当前值
    const getItems = () => (typeof o.items === "function" ? (o.items as () => T[])() : o.items);

    // 预计算拼音索引（仅构建一次）
    const pinyinIndex = new Map<string | number, PinyinEntry>();
    for (const it of getItems()) {
        pinyinIndex.set(o.idKey(it), buildPinyinIndex(o.pinyinText(it)));
    }

    // 过滤：普通子串 + 拼音全拼/首字母（getter 形式可响应数据更新）
    const filtered = computed(() => {
        let list = getItems();
        if (keyword.value.trim()) {
            const k = keyword.value.trim().toLowerCase().replace(/\s+/g, "");
            list = list.filter((it) =>
                matchesKeyword(k, o.searchFields(it) as (string | null)[], pinyinIndex.get(o.idKey(it)) ?? null),
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
            const el = document.querySelector(`.${o.listClass}-item.selected`);
            el?.scrollIntoView({ block: "nearest" });
        });
    }

    // 进入时让主应用（列表）获得焦点
    onMounted(() => {
        window.ztools.subInputBlur();
        nextTick(() => {
            (document.querySelector(`.${o.listClass}-list`) as HTMLElement | null)?.focus();
        });
    });

    // 打开指定下标项
    function openIndex(index: number) {
        const it = filtered.value[index];
        const url = it ? (it as any).url : null;
        if (url) window.open(url, "_blank");
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
    window.ztools.setSubInput(onChange, o.placeholder, true);

    return {
        keyword,
        filtered,
        selectedIndex,
        onKeydown,
        onRowClick,
        onRowDblClick,
        keyOf: o.idKey,
    };
}
