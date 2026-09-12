<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Hello from './Bookmark/index.vue'
import History from './History/index.vue'
import Profile from './Setting/index.vue'
import GithubStars from './GithubStars/index.vue'
import GithubSearch from './GithubSearch/index.vue'

const route = ref('')
const enterAction = ref<any>({})

onMounted(() => {
  window.ztools.onPluginEnter((action) => {
    route.value = action.code
    enterAction.value = action
  })
  window.ztools.onPluginOut(() => {
    route.value = ''
  })
})
</script>

<template>
  <Hello v-if="route === 'bookmark'" :enter-action="enterAction" />
  <History v-if="route === 'history'" :enter-action="enterAction" />
  <Profile v-if="route === 'setting'" :enter-action="enterAction" />
  <GithubStars v-if="route === 'github-stars'" />
  <GithubSearch v-if="route === 'github-search'" :enter-action="enterAction" />
</template>
