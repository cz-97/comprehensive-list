<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps({
    enterAction: {
        type: Object,
        required: true,
    },
});

const filePath = ref(window.ztools.dbStorage.getItem("profilePath"));
const fileContent = ref("");
const error = ref("");

const handleOpenDialog = () => {
    // 通过 ZTools 的 api 打开文件选择窗口
    const files = window.ztools.showOpenDialog({
        title: "选择Profiles文件夹",
        properties: ["openDirectory"],
    });
    if (!files) return;
    const _filePath = files[0];
    if (_filePath) {
        filePath.value = _filePath;
        try {
            window.ztools.dbStorage.setItem('profilePath', _filePath);
        } catch (err: any) {
            error.value = err.message;
            fileContent.value = "";
        }
    }
};

watch(
    () => props.enterAction,
    (enterAction: any) => {
        if (enterAction.type === "files") {
            // 匹配文件进入，直接读取文件
            const _filePath = enterAction.payload[0].path;
            filePath.value = _filePath;
            try {
                const content = window.services.readFile(_filePath);
                fileContent.value = content;
            } catch (err: any) {
                error.value = err.message;
                fileContent.value = "";
            }
        }
    },
    {
        immediate: true,
    },
);
</script>

<template>
    <div class="read">
        <button @click="handleOpenDialog">选择Profiles路径</button>
        <div class="read-file">Profiles路径：{{ filePath }}</div>
        <template v-if="!!fileContent">
            <pre>
        {{ fileContent }}
      </pre>
        </template>
        <template v-if="!!error">
            <div class="read-error">
                {{ error }}
            </div>
        </template>
    </div>
</template>

<style>
.read {
    padding: 20px;
    box-sizing: border-box;
}

.read > pre {
    background-color: #fff;
    width: 100%;
    overflow: hidden;
    padding: 20px;
    box-sizing: border-box;
    border-radius: 7px;
    margin-top: 20px;
    white-space: break-spaces;
}

.read-file {
    width: 100%;
    margin-top: 20px;
    font-weight: bold;
}

.read-error {
    color: red;
}

@media (prefers-color-scheme: dark) {
    .read > pre {
        background-color: #424242;
    }
}
</style>
