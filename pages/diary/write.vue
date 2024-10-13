<script setup lang="ts">
import { ref } from 'vue';
import { useDiaryStore } from '@/stores/diaryStore';
import {configure, ErrorMessage, Field, Form} from 'vee-validate';
import { required, max, min } from '@vee-validate/rules';
import { defineRule } from 'vee-validate';
import { localize } from '@vee-validate/i18n'

import ko from '@vee-validate/i18n/dist/locale/ko.json'
import en from '@vee-validate/i18n/dist/locale/en.json'

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

const schema = {
  title: { required: true },
  content: { required: true, max: 2048, min: 10 }
}

const onSubmit = async () => {
  isSubmitting.value = true; // 버튼 비활성화를 위한 설정
  const savedDiary = diaryStore.addDiary();

  // API에 POST 요청
  await useFetch('/api/diary', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: savedDiary,
  });

  resetForm(); // 폼 초기화
  isSubmitting.value = false; // 제출 완료 후 버튼 활성화
};

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
  if(!isSubmitting.value)
    diaryStore.removeTagLatest();
}
</script>

<template>
  <div class="diary-write">
    <h1 class="title">일기 쓰기</h1>

    <Form @submit="onSubmit" :validation-schema="schema">
      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">제목</label>
        <div class="control">
          <Field
              name="title"
              as="input"
              type="text"
              class="input is-size-6-mobile is-size-5-tablet"
              v-model="diaryStore.currentDiary.title"
          />
          <ErrorMessage name="title" class="help is-danger" />
        </div>
      </div>

      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">내용</label>
        <div class="control">
          <Field
              name="content"
              as="textarea"
              class="textarea is-size-6-mobile is-size-5-tablet"
              v-model="diaryStore.currentDiary.content"
          />
          <p class="help is-size-6-mobile is-size-5-tablet">{{ 2048 - diaryStore.currentDiary.content.length }}자 남음</p>
          <ErrorMessage name="content" class="help is-danger" />
        </div>
      </div>

      <div class="field">
        <label class="label font-nanum-pen is-size-6-mobile is-size-5-tablet">감정 태그</label>
        <div class="control">
          <div class="tags">
            <input
                class="input"
                type="text"
                v-model="newTag"
                @keyup.space.prevent="addTag"
                @keyup.delete.prevent="removeTagLatest"
                placeholder="태그 입력 후 Space (예: 행복)"
            />
          </div>
          <span
              class="tag is-size-6"
              v-for="tag in diaryStore.currentDiary.tags"
              :key="tag">
            #{{ tag }}
            <button
                class="delete is-small"
                @click="removeTag(tag)"></button>
          </span>
        </div>
      </div>

      <div class="field">
        <label class="checkbox is-size-6-mobile is-size-5-tablet">
          <input
              name="agreeToUseTags"
              type="checkbox"
              v-model="diaryStore.currentDiary.isUseTag"
              :true-value="true"
              :false-value="false"
          />
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