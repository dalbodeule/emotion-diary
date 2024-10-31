<script setup lang="ts">
import { setLocale } from '@vee-validate/i18n'

const { user, clear } = useUserSession();
const router = useRouter();

definePageMeta({
  middleware: 'auth'
})

setLocale('ko')

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
        <p v-if="user" class="font-nanum-pen">{{ user.nickname }}</p>
        <button class="button is-small is-danger mt-2 is-size-8-mobile is-size-6-tablet" @click="logout">로그아웃</button>
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

<style lang="scss" scoped>
@import '@/assets/css/main.scss';

.layout-container {
  display: flex;
  min-height: 100vh;
}

/* 좌측 메뉴 스타일 */
.menu {
  width: 250px;
  padding: 20px;
  background-color: $card-background-paper; // 카드 배경으로 종이 느낌
  border-right: 1px solid $border-color-pen; // 부드러운 테두리 추가
  border-radius: 5px;
  box-shadow: $box-shadow; // 약간의 그림자 추가
}

.user-info {
  margin-bottom: 20px;
  text-align: center;
  font-family: 'Noto Sans', sans-serif; // 부드러운 폰트 적용
  color: $text-color-pen; // 텍스트 색상
}

/* 메뉴 아이템 스타일 */
.menu-list {
  list-style: none;
  padding: 0;
}

.menu-list li {
  margin-bottom: 15px;
}

.menu-list li a {
  color: $text-color-pen; // 기본 텍스트 색상
  text-decoration: none; // 링크 밑줄 제거
  padding: 8px 10px; // 패딩 추가로 클릭할 때 더 큰 영역 제공
  display: block; // 블록 형태로 전체 영역 클릭 가능하게
  border-radius: 5px; // 경계 둥글게
  transition: background-color 0.2s ease; // 배경색 변화 부드럽게
}

.menu-list li a:hover {
  background-color: lighten($primary, 40%); // 호버 시 배경색 변경
}

.menu-item-disabled {
  color: #a0a0a0;
  cursor: not-allowed;
}

.is-active {
  font-weight: bold;
  background-color: lighten($primary, 30%) !important; // 활성화된 링크의 배경색
  color: $text-color-pen; // 텍스트 색상
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