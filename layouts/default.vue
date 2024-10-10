<script setup lang="ts">
import {setLocale} from '@vee-validate/i18n'
const { fetch } = useUserSession()

useHead({
  htmlAttrs: {
    class: 'theme-light'
  }
})

setLocale('ko')

;(async() => {
  await fetch()
})()
</script>

<template>
  <div class="container" style="min-height: 100vh;">
    <NuxtPage />
  </div>
</template>