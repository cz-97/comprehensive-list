<script lang="ts" setup>
defineProps({
    enterAction: {
        type: Object,
        required: true,
    },
});
const history = window.ztools.dbStorage.getItem("profilePath")? window.services.getHistory() : [];
</script>

<template>
    <div class="hello">
        <h2>{{ JSON.stringify(history) }}</h2>
    </div>
</template>

<style>
.hello {
    padding: 10px 28px;
}
</style>
