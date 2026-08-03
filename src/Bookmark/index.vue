<script setup lang="ts">
import SearchableList from "../components/SearchableList.vue";
import { ensureIconsLoaded, iconFor } from "../utils/icons";

// 从服务获取书签和文件夹数据
const bookmarks: Bookmark[] = window.services.getBookmarks();
// 一次性加载全部图标映射（moz_icons 行数很少）
ensureIconsLoaded();

// 打开行为：打开 URL 并记录
function open(b: Bookmark) {
    if (b.url) window.open(b.url, "_blank");
}
</script>

<template>
    <SearchableList
        :items="bookmarks"
        :id-key="(b) => b.id"
        :pinyin-text="(b) => `${b.bookmark_title ?? ''} ${b.page_title ?? ''}`"
        :search-fields="(b) => [b.bookmark_title, b.page_title, b.url]"
        placeholder="搜索书签"
        list-class="search"
        accent="#43c9ff"
        @open="open"
    >
        <template #default="{ item: b }">
            <img class="favicon" :src="iconFor(b)" alt="" />
            <div class="item-body">
                <div class="row-top">
                    <span class="title" :title="b.bookmark_title ?? ''">{{ b.bookmark_title }}</span>
                    <span class="meta">{{ b.page_title }}</span>
                </div>
                <div class="row-url">
                    <a :href="b.url ?? undefined" target="_blank">{{ b.url }}</a>
                </div>
            </div>
        </template>
    </SearchableList>
</template>
