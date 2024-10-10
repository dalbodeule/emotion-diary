<script setup lang="ts">
const { loggedIn, fetch } = useUserSession()
</script>

<template>
  <!-- Header Section -->
  <div class="section">
    <div class="has-text-centered">
      <h1 class="title is-2 has-text-grey-dark">Em0ti</h1>
    </div>
  </div>

  <!-- Buttons Section -->
  <div class="section has-text-centered">
    <div v-if="loggedIn" class="buttons is-centered">
      <NuxtLink to="/diary" class="button is-yellow is-medium">
        이어쓰기
      </NuxtLink>

      <!-- Register Button -->
      <NuxtLink to="/logout" class="button is-blue is-medium">
        로그아웃
      </NuxtLink>
    </div>
    <div v-else class="buttons is-centered">
      <!-- Login Button -->
      <NuxtLink to="/login" class="button is-yellow is-medium">
        이어쓰기 (로그인)
      </NuxtLink>

      <!-- Register Button -->
      <NuxtLink to="/register" class="button is-blue is-medium">
        새로쓰기 (회원가입)
      </NuxtLink>
    </div>
  </div>

  <!-- Benefits Section -->
  <div class="section">
    <div class="content">
      <!-- Benefits Title -->
      <h2 class="title is-4 has-text-grey-dark">
        Em0ti를 쓰면 좋은 점
      </h2>

      <!-- Benefits List -->
      <ul class="benefits font-nanum-pen is-size-4 is-size-6-mobile">
        <li class="has-text-grey-dark">
          내 감정을 모르는 사람에게 추천합니다. 내 감정순간을 돌아보는 기회가 됩니다.
        </li>
        <li class="has-text-grey-dark">
          내 감정을 알고있다면, 감정일기를 모아 내 감정을 분석해볼 수 있습니다.
        </li>
        <li class="has-text-grey-dark">
          감정 분석을 통해 내가 주로 느끼는 감정을 간단하게 정리하세요!
        </li>
        <li class="has-text-grey-dark">
          당신에게 감정적 위기가 찾아올 때 전문가와 연결될 수 있도록 준비하고 있답니다!
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.benefits {
  list-style: decimal;
  line-height: 1.75;
}
</style>