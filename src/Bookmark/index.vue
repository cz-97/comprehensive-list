<script setup lang="ts">
import { useSearchableList } from "../utils/useSearchableList";
import { ensureIconsLoaded, iconFor } from "../utils/icons";

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

<style scoped>
.bookmark-list {
    flex: 1;
    padding: 1rem;
    outline: none;
    overflow-x: hidden;
    overflow-y: auto;
    min-width: 0;
    background:
        radial-gradient(circle at 12% 0%, rgba(67, 201, 255, 0.14), transparent 28%),
        linear-gradient(180deg, #11151d 0%, #0b0e14 100%);
}

.bookmark-item {
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

.bookmark-item::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    border-radius: 8px 0 0 8px;
    background: #43c9ff;
    box-shadow: 0 0 18px rgba(67, 201, 255, 0.8);
    opacity: 0.55;
}

.bookmark-item:hover {
    transform: translateY(-2px);
    border-color: rgba(67, 201, 255, 0.38);
    background: linear-gradient(135deg, rgba(67, 201, 255, 0.11), rgba(255, 255, 255, 0.045));
}

.bookmark-item.selected {
    border-color: rgba(67, 201, 255, 0.72);
    background: linear-gradient(135deg, rgba(67, 201, 255, 0.2), rgba(154, 124, 255, 0.12));
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
    max-width: 48%;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.78em;
    color: #9aa7b8;
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
    .bookmark-list {
        padding: 0.75rem;
    }

    .bookmark-item {
        align-items: flex-start;
        padding: 0.7rem;
    }

    .row-top {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.2rem;
    }

    .meta {
        max-width: 100%;
    }
}
</style>