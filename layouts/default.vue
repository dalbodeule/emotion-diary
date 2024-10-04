<script setup lang="ts">
import {setLocale} from '@vee-validate/i18n'

useHead({
  htmlAttrs: {
    class: 'theme-light'
  }
})

setLocale('ko')
</script>

<template>
  <div class="container" style="min-height: 100vh;">
    <NuxtPage />
  </div>
</template>