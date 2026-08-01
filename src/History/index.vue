<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";
import { ensureIconsLoaded, iconFor } from "../utils/icons";

// 从服务获取历史记录
const history: HistoryItem[] = window.services.getHistory();
// 一次性加载全部图标映射（moz_icons 行数很少）
ensureIconsLoaded();

const { filtered, selectedIndex, onKeydown, onRowClick, onRowDblClick, keyOf } = useSearchableList<HistoryItem>({
    items: history,
    idKey: (h) => h.url,
    pinyinText: (h) => `${h.title ?? ""}`,
    searchFields: (h) => [h.title, h.url],
    placeholder: "搜索历史",
    listClass: "history",
});
</script>

<template>
    <main class="history-list" tabindex="0" @keydown="onKeydown">
        <div
            v-for="(h, index) in filtered"
            :key="keyOf(h)"
            class="history-item"
            :class="{ selected: index === selectedIndex }"
            @click="onRowClick(index)"
            @dblclick="onRowDblClick(index)"
        >
            <img class="favicon" :src="iconFor(h)" alt="" />
            <div class="item-body">
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
    background:
        radial-gradient(circle at 14% 0%, rgba(67, 201, 255, 0.13), transparent 30%),
        radial-gradient(circle at 90% 12%, rgba(141, 255, 122, 0.08), transparent 26%),
        linear-gradient(180deg, #11151d 0%, #0b0e14 100%);
}

.history-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-bottom: 0.55rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025));
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.history-item::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    border-radius: 8px 0 0 8px;
    background: #8dff7a;
    box-shadow: 0 0 18px rgba(141, 255, 122, 0.65);
    opacity: 0.55;
}

.history-item:hover {
    transform: translateY(-2px);
    border-color: rgba(141, 255, 122, 0.34);
    background: linear-gradient(135deg, rgba(141, 255, 122, 0.1), rgba(255, 255, 255, 0.045));
}

.history-item.selected {
    border-color: rgba(67, 201, 255, 0.72);
    background: linear-gradient(135deg, rgba(67, 201, 255, 0.18), rgba(141, 255, 122, 0.11));
    box-shadow: 0 0 0 1px rgba(67, 201, 255, 0.18), 0 16px 36px rgba(0, 0, 0, 0.32);
}

.favicon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    object-fit: contain;
    border-radius: 6px;
    padding: 3px;
    background: rgba(255, 255, 255, 0.08);
}

.item-body {
    flex: 1;
    min-width: 0;
}

.row-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    line-height: 1.35;
}

.title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #f4f8ff;
    font-size: 1rem;
    font-weight: 650;
}

.meta {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 45%;
    min-width: 0;
    font-size: 0.78em;
    color: #9aa7b8;
}

.freq {
    flex-shrink: 0;
    border: 1px solid rgba(141, 255, 122, 0.3);
    border-radius: 999px;
    padding: 0.16rem 0.45rem;
    color: #b8ffad;
    background: rgba(141, 255, 122, 0.1);
    font-weight: 700;
}

.time {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.row-url {
    margin-top: 0.2rem;
    line-height: 1.2;
    font-size: 0.84em;
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
    color: #7fe3ff;
    text-decoration: underline;
}

@media (max-width: 720px) {
    .history-list {
        padding: 0.75rem;
    }

    .history-item {
        align-items: flex-start;
        padding: 0.7rem;
    }

    .row-top {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.28rem;
    }

    .meta {
        max-width: 100%;
    }
}
</style>