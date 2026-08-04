<script setup lang="ts">
import SearchableList from "../components/SearchableList.vue";
import { ensureIconsLoaded, iconFor } from "../utils/icons";

// 从服务获取历史记录
const history: HistoryItem[] = window.services.getHistory();
// 一次性加载全部图标映射（moz_icons 行数很少）
ensureIconsLoaded();

// 打开行为：打开 URL 并记录
function open(h: HistoryItem) {
    window.open(h.url, "_blank");
}
</script>

<template>
    <SearchableList
        :items="history"
        :id-key="(h) => h.url"
        :pinyin-text="(h) => `${h.title ?? ''}`"
        :search-fields="(h) => [h.title, h.url]"
        placeholder="搜索历史"
        list-class="search"
        accent="#43c9ff"
        @open="open"
    >
        <template #default="{ item: h }">
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
        </template>
    </SearchableList>
</template>

<style scoped>
/* History 私有：频次徽标 + 访问时间 */
.freq {
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--accent, #8dff7a) 30%, transparent);
    border-radius: 999px;
    padding: 0.16rem 0.45rem;
    color: #b8ffad;
    background: color-mix(in srgb, var(--accent, #8dff7a) 10%, transparent);
    font-weight: 700;
}

.time {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
