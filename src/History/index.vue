<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";

// 从服务获取历史记录
const history: HistoryItem[] = window.services.getHistory();

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
            <img v-if="h.favicon" class="favicon" :src="h.favicon" alt="" />
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
}
.history-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
}
.history-item.selected {
    background-color: #4a4b4d;
}
.favicon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    object-fit: contain;
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
