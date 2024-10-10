<script setup lang="ts">
const { fetch } = useUserSession()
const router = useRouter()

// 로그인 입력 필드 상태 관리
const username = ref('');
const password = ref('');

// 서버 응답 및 에러 상태
const error = ref<string | null>(null);

// 로그인 요청 함수
const login = async () => {
  // 로그인 요청 데이터
  const requestData = {
    username: username.value,
    password: password.value,
  };

  try {
    // 로그인 API 요청
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: requestData,
      credentials: 'include',
    });

    // 성공적으로 로그인한 후 추가 로직 (e.g., 페이지 이동)
    console.log('Login successful:');
    await fetch()
    await navigateTo('/')
  } catch (err) {
    console.log(err)
    error.value = 'An unexpected error occurred.';
  }
};
</script>

<template>
  <div class="section is-fullheight">
    <div class="container">
      <div class="column is-half is-offset-one-quarter">
        <!-- Title -->
        <div class="block has-text-centered mb-6">
          <h1 class="title is-3 has-text-grey-dark is-family-primary">일기 계속쓰기</h1>
        </div>

        <!-- Form -->
        <form class="box" @submit.prevent="login">
          <!-- 아이디 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark">아이디</label>
            <div class="control has-icons-left">
              <input
                  v-model="username"
                  class="input is-medium"
                  type="text"
                  placeholder="아이디를 입력하세요"
              >
              <span class="icon is-left">
              <i class="fas fa-user"/>
            </span>
            </div>
          </div>

          <!-- 비밀번호 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark">비밀번호</label>
            <div class="control has-icons-left">
              <input
                  v-model="password"
                  class="input is-medium"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
              >
              <span class="icon is-left">
              <i class="fas fa-lock"/>
            </span>
            </div>
          </div>

          <!-- 에러 메시지 -->
          <div v-if="error" class="notification is-danger">
            {{ error }}
          </div>

          <!-- 로그인 버튼 -->
          <div class="field mt-5">
            <div class="control">
              <button
                  class="button is-warning is-fullwidth is-medium"
              >
                로그인
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

</template>

<style scoped>

</style>