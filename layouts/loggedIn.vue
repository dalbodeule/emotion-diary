<script setup lang="ts">
const { user, clear } = useUserSession();
const router = useRouter();

definePageMeta({
  middleware: 'auth'
})

// 로그아웃 함수
const logout = async () => {
  await clear(); // 세션 삭제
  await router.push('/'); // 메인 페이지로 이동
};
</script>

<template>
  <div class="container layout-container" style="min-height: 100vh;">
    <!-- 좌측 메뉴 -->
    <aside class="menu is-size-6-mobile is-size-4-tablet">
      <div class="user-info">
        <p v-if="user">{{ user.nickname }}님, 환영합니다!</p>
        <button @click="logout" class="button is-small is-danger mt-2 is-size-8-mobile is-size-6-tablet">로그아웃</button>
      </div>

      <ul class="menu-list">
        <li><NuxtLink to="/diary" active-class="is-active">일기 목록</NuxtLink></li>
        <li><NuxtLink to="/diary/write" active-class="is-active">일기 쓰기</NuxtLink></li>
        <li><NuxtLink to="/emotion/weather" active-class="is-active">감정 날씨</NuxtLink></li>
        <!-- 비활성화된 감정 예보 (disabled 스타일 적용) -->
        <li><NuxtLink active-class="is-active" disabled>감정 예보</NuxtLink></li>
        <li><NuxtLink to="/" active-class="is-active">메인으로</NuxtLink></li>
      </ul>
    </aside>
    <div class="main-content">
      <NuxtPage />
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  min-height: 100vh;
}

/* 좌측 메뉴 스타일 */
.menu {
  width: 250px;
  padding: 20px;
}

.user-info {
  margin-bottom: 20px;
  text-align: center;
}

/* 메뉴 아이템 스타일 */
.menu-list {
  list-style: none;
  padding: 0;
}

.menu-list li {
  margin-bottom: 15px;
}

.menu-item-disabled {
  color: #a0a0a0;
  cursor: not-allowed;
}

.is-active {
  font-weight: bold;
}

/* 메인 콘텐츠 영역 스타일 */
.main-content {
  flex: 1;
  padding: 20px;
}

/* 모바일 환경에 대한 반응형 스타일 */
@media (max-width: 768px) {
  .layout-container {
    flex-direction: column; /* 모바일에서는 세로 방향으로 배치 */
  }

  .menu {
    width: 100%; /* 메뉴를 화면 전체 폭으로 */
    padding: 10px;
    order: -1; /* 메뉴를 상단에 배치 */
    text-align: center; /* 텍스트 중앙 정렬 */
  }

  .main-content {
    padding: 10px;
  }

  .menu-list li {
    margin-bottom: 10px; /* 메뉴 아이템 간격 */
  }
}
</style>