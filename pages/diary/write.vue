<script setup lang="ts">
import {ref} from 'vue';
import {useDiaryStore} from '@/stores/diaryStore';
import {configure, defineRule, ErrorMessage, Field, Form} from 'vee-validate';
import {max, min, required} from '@vee-validate/rules';
import {localize} from '@vee-validate/i18n'

import ko from '@vee-validate/i18n/dist/locale/ko.json'
import en from '@vee-validate/i18n/dist/locale/en.json'
import type {EmotionRequestDTO, EmotionResponseDTO} from "~/server/routes/api/diary/emotion.put";
import type {EmotionRequestReturnDTO, EmotionResponseReturnDTO} from "~/server/routes/api/diary/emotion.post";

definePageMeta({
  layout: 'logged-in'
})

// 규칙 정의
defineRule('required', required)
defineRule('max', max)
defineRule('min', min)

configure({
  generateMessage: localize({
    ko, en
  })
})

localize({
  ko: {
    names: {
      title: '제목', content: '내용'
    }
  },
  en: {
    names: {
      title: 'Title', content: 'Content'
    }
  }
})

const diaryStore = useDiaryStore()
const newTag = ref<string>('')
const isSubmitting = ref(false)
const router = useRouter()

const schema = {
  title: { required: true },
  content: { required: true, max: 2048, min: 10 }
}

// recoveryCode 전송을 위한 POST 요청을 처리하는 함수
const postRecoveryCode = async (recoveryCode: string): Promise<EmotionResponseReturnDTO> => {
  const data: EmotionRequestReturnDTO = {
    recoveryCode
  };

  let retryCount = 0; // 시도 카운트
  const maxRetries = 5; // 최대 시도 횟수

  while (retryCount < maxRetries) {
    try {
      const response = await $fetch.raw('/api/diary/emotion', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });

      console.log(response.status)

      // 응답 상태 체크
      if (response.status == 200) {
        return await response.text; // 성공적으로 응답
      } else if (response.status == 202) {
        // 202 pending 처리 (5초 후 재시도)
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        // 기타 에러 상태 처리
        console.error(`Unexpected response status: ${response.status}`);
        return null; // 필요에 따라 적절한 처리 추가
      }
    } catch (error) {
      console.error('Error sending recovery code:', error);
      retryCount += 1; // 에러 발생 시 시도 카운트 증가
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
    }
  }

  console.error('Max retries exceeded. Could not send recovery code.');
  throw new Error('Failed to send recovery code after multiple attempts.'); // 최대 시도 후 오류 발생
};

// 태그 도우미 API 호출 함수
const fetchEmotionTags = async () => {
  if (diaryStore.currentDiary.content.length == 0) return;

  try {
    const body: EmotionRequestDTO = {
      body: diaryStore.currentDiary.content
    }

    const response = await $fetch('/api/diary/emotion', {
      method: 'PUT',
      body,
      credentials: 'include',
    }) as EmotionResponseDTO

    return await postRecoveryCode(response.recoveryCode)

  } catch (error) {
    console.error('Error fetching emotion tags:', error);
  }
}

const onSubmit = async () => {
  isSubmitting.value = true; // 버튼 비활성화를 위한 설정
  const savedDiary = diaryStore.addDiary();

  try {
    // API에 PUT 요청
    await $fetch('/api/diary', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: savedDiary,
    });

    isSubmitting.value = false; // 제출 완료 후 버튼 활성화
    await router.push('/diary')
  } catch(e) {
    console.error(e)
  }
}

const addTag = () => {
  console.log(newTag.value)
  if (newTag.value.trim()) {
    diaryStore.addTag(newTag.value.trim());
    newTag.value = '';
  }
}

const removeTag = (tag: string) => {
  diaryStore.removeTag(tag);
}

const removeTagLatest = () => {
  if(!isSubmitting.value || newTag.value == '')
    diaryStore.removeTagLatest();
}
</script>

<template>
  <div class="diary-write">
    <h1 class="title">일기 쓰기</h1>

    <Form :validation-schema="schema" @submit="onSubmit">
      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">제목</label>
        <div class="control">
          <Field
              v-model="diaryStore.currentDiary.title"
              name="title"
              as="input"
              type="text"
              class="input is-size-6-mobile is-size-5-tablet"
          />
          <ErrorMessage name="title" class="help is-danger" />
        </div>
      </div>

      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">내용</label>
        <div class="control">
          <Field
              v-model="diaryStore.currentDiary.content"
              name="content"
              as="textarea"
              class="textarea is-size-6-mobile is-size-5-tablet"
          />
          <p class="help is-size-6-mobile is-size-5-tablet">{{ 2048 - diaryStore.currentDiary.content.length }}자 남음</p>
          <ErrorMessage name="content" class="help is-danger" />
        </div>
      </div>

      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">감정 태그</label>
        <div class="control has-addons">
          <div class="tags control">
            <input
                v-model="newTag"
                class="input"
                type="text"
                placeholder="태그 입력 후 Space (예: 행복)"
                @keyup.space.prevent="addTag"
                @keyup.delete="removeTagLatest"
            >
          </div>
          <div class="control">
            <button type="button" class="button" @click="fetchEmotionTags">감정태그 도움받기</button>
          </div>
          <span
              v-for="tag in diaryStore.currentDiary.tags"
              :key="tag"
              class="tag is-size-6">
            #{{ tag }}
            <button
                class="delete is-small"
                @click="removeTag(tag)"/>
          </span>
        </div>
      </div>

      <div class="field">
        <label class="checkbox is-size-6-mobile is-size-5-tablet">
          <input
              v-model="diaryStore.currentDiary.isUseTag"
              name="agreeToUseTags"
              type="checkbox"
              :true-value="true"
              :false-value="false"
          >
          감정 태그 사용에 동의합니다.
        </label>
        <ErrorMessage name="agreeToUseTags" class="help is-danger" />
      </div>

      <div class="control">
        <button class="button button-primary is-size-5" type="submit" :disabled="isSubmitting">
          일기 저장
        </button>
      </div>
    </Form>
  </div>
</template>

<style scoped lang="scss">
@import '@/assets/css/main.scss';

.diary-write {
  padding: 20px;
  background-color: $card-background-paper; /* 카드 색상 */
  border: 1px solid $border-color-pen; /* 부드러운 테두리 */
  border-radius: $border-radius; /* 카드 둥글게 */
  box-shadow: $box-shadow; /* 그림자 */
}

.title {
  font-size: 2rem;
  color: $text-color-pen; /* 펜 글씨 색상 */
}

.field {
  margin-bottom: 20px;
}

.help {
  font-size: 0.9rem;
  color: #666;
}

.tag {
  display: inline-block;
  background-color: $primary; /* 태그 배경 색상 */
  color: white;
  padding: 5px 10px;
  margin: 5px 5px 5px 0;
}

.delete {
  margin-left: 10px;
  cursor: pointer;
}
</style>