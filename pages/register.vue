<script setup lang="ts">
import { ErrorMessage, Field, Form, configure, defineRule } from "vee-validate"
import { min, max, required, url, email, regex } from '@vee-validate/rules'
import { localize } from '@vee-validate/i18n'

import ko from '@vee-validate/i18n/dist/locale/ko.json'
import en from '@vee-validate/i18n/dist/locale/en.json'
import type {UsernameIsExistsResponseDTO} from "~/server/routes/api/auth/username/[username].get";

const router = useRouter()

defineRule('min', min)
defineRule('max', max)
defineRule('required', required)
defineRule('url', url)
defineRule('email', email)
defineRule('regex', regex)
defineRule('unique', async(value: string) => {
  if (!value) return true
  try {
    const data: UsernameIsExistsResponseDTO = await $fetch(`/api/auth/username/${value}`, {
      method: 'GET',
    })
    return !data.exists
  } catch(e) {
    return true
  }
})

configure({
  generateMessage: localize({
    ko,
    en
  }),
});

localize({
  ko: {
    names: {
      username: '아이디',
      password: '비밀번호',
      email: '이메일',
      nickname: '닉네임',
      security_question: '보안질문',
      security_answer: '보안답변'
    }
  },
  en: {
    names: {
      username: 'ID',
      password: 'Password',
      email: 'Email',
      nickname: 'Nickname',
      security_question: 'Security question',
      security_answer: 'Security answer',
    }
  }
})

// 유효성 검사 스키마
const schema = {
  username: { regex: /^[a-zA-Z0-9-_]*$/, min: 8, max: 20, required: true, unique: true
  },
  password: {
    regex: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, min: 8, max: 20, required: true
  },
  email: { email: true, required: true },
  nickname:{ regex: /^[a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣\b\-_]*$/, min: 2, max: 15, required: true },
  security_question: { required: true, min: 5, max: 30 },
  security_answer: { required: true, min: 2, max: 30 }
}

const onSubmit = async(values) => {
  try {
    const { data, error } = await useFetch('/api/auth/register', {
      method: 'PUT',
      body: values,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if(error.values) {
      console.error(`Register error: ${error.values}`)
    }

    if(data.value) {
      console.log(`Register done: ${data.value}`)
      await router.push("/")
    }
  } catch (error) {
    console.error(`Request error: ${error}`)
  }
}
</script>

<template>
  <div class="section is-fullheight">
    <div class="container">
      <div class="column is-half is-offset-one-quarter">
        <!-- 타이틀 -->
        <div class="block has-text-centered mb-4">
          <h1 class="title is-3 has-text-grey-dark is-family-primary font-nanum-pen">회원가입</h1>
        </div>

        <!-- Form -->
        <Form v-slot="{ errors }" class="box" :validation-schema="schema" @submit="onSubmit">
          <!-- 아이디 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">아이디</label>
            <div class="control">
              <Field
                  name="username"
                  type="text"
                  placeholder="아이디를 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="username">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 비밀번호 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">비밀번호</label>
            <div class="control">
              <Field
                  name="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="password">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 이메일 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">이메일</label>
            <div class="control">
              <Field
                  name="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="email">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 닉네임 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">닉네임</label>
            <div class="control">
              <Field
                  name="nickname"
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="nickname">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 보안질문 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">보안질문</label>
            <div class="control">
              <Field
                  name="security_question"
                  type="text"
                  placeholder="보안질문을 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="nickname">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 보안답변 입력 -->
          <div class="field">
            <label class="label is-family-primary has-text-grey-dark font-nanum-pen">보안답변</label>
            <div class="control">
              <Field
                  name="security_answer"
                  type="text"
                  placeholder="보안답변을 입력하세요"
                  class="input is-medium"
              />
            </div>
            <ErrorMessage v-slot="{ message }" name="nickname">
              <p class="help is-danger">{{ message }}</p>
            </ErrorMessage>
          </div>

          <!-- 회원가입 버튼 -->
          <div class="field mt-4">
            <div class="control">
              <button type="submit" class="button is-link is-fullwidth is-medium">
                회원가입
              </button>
            </div>
          </div>

          <!-- 약관 동의 문구 -->
          <div class="field mt-4">
            <p class="is-family-primary has-text-grey-dark has-text-centered">
              회원가입을 하면
              <a href="/terms" target="_blank">약관</a> 및
              <a href="/privacy-policy" target="_blank">개인정보 처리방침</a>에 동의하는 것으로 간주합니다.
            </p>
          </div>
        </Form>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>