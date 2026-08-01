<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";

// 从服务获取书签和文件夹数据
const bookmarks: Bookmark[] = window.services.getBookmarks();

const { filtered, selectedIndex, onKeydown, onRowClick, onRowDblClick, keyOf } = useSearchableList<Bookmark>({
    items: bookmarks,
    idKey: (b) => b.id,
    pinyinText: (b) => `${b.bookmark_title ?? ""} ${b.page_title ?? ""}`,
    searchFields: (b) => [b.bookmark_title, b.page_title, b.url],
    placeholder: "搜索书签",
    listClass: "bookmark",
});
</script>

<template>
    <main class="bookmark-list" tabindex="0" @keydown="onKeydown">
        <div
            v-for="(b, index) in filtered"
            :key="keyOf(b)"
            class="bookmark-item"
            :class="{ selected: index === selectedIndex }"
            @click="onRowClick(index)"
            @dblclick="onRowDblClick(index)"
        >
            <img v-if="b.favicon" class="favicon" :src="b.favicon" alt="" />
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

<style scoped>
.bookmark-list {
    flex: 1;
    padding: 1rem;
    outline: none;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
}
.bookmark-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #ddd;
    cursor: pointer;
}
.bookmark-item.selected {
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
    max-width: 60%;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
