<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";
import { ensureIconsLoaded, iconFor } from "../utils/icons";
import "../styles/search-list.css";

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
    listClass: "search",
});
</script>

<template>
    <main
        class="search-list"
        style="--accent: #8dff7a"
        tabindex="0"
        @keydown="onKeydown"
    >
        <div
            v-for="(h, index) in filtered"
            :key="keyOf(h)"
            class="search-item"
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