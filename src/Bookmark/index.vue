<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";
import { ensureIconsLoaded, iconFor } from "../utils/icons";
import "../styles/search-list.css";

// 从服务获取书签和文件夹数据
const bookmarks: Bookmark[] = window.services.getBookmarks();
// 一次性加载全部图标映射（moz_icons 行数很少）
ensureIconsLoaded();

const { filtered, selectedIndex, onKeydown, onRowClick, onRowDblClick, keyOf } = useSearchableList<Bookmark>({
    items: bookmarks,
    idKey: (b) => b.id,
    pinyinText: (b) => `${b.bookmark_title ?? ""} ${b.page_title ?? ""}`,
    searchFields: (b) => [b.bookmark_title, b.page_title, b.url],
    placeholder: "搜索书签",
    listClass: "search",
});
</script>

<template>
    <main
        class="search-list"
        style="--accent: #43c9ff"
        tabindex="0"
        @keydown="onKeydown"
    >
        <div
            v-for="(b, index) in filtered"
            :key="keyOf(b)"
            class="search-item"
            :class="{ selected: index === selectedIndex }"
            @click="onRowClick(index)"
            @dblclick="onRowDblClick(index)"
        >
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
        </div>
    </main>
</template>