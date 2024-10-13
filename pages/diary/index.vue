<script setup lang="ts">
import dayjs from 'dayjs'
import type { IDiary, DiaryListResponseDTO } from "~/server/routes/api/diary/list.get";
import {useIntersectionObserver} from "@vueuse/core";

definePageMeta({
  layout: 'logged-in'
})

// 목업 데이터
const diaries: Ref<IDiary[]> = ref([])
const page: Ref<number> = ref(1)
const loading = ref(false)

const fetchDiaries = async() => {
  if (loading.value) return
  loading.value = true

  try {
    const response = await $fetch(`/api/diary/list?page=${page.value}`) as DiaryListResponseDTO
    diaries.value = [... diaries.value, ...response.diaries]
    page.value += 1
  } catch (e) {
    console.error(`Failed to fetch diaries: ${e}`)
  } finally {
    loading.value = false
  }
}

const loadMore = ref<HTMLElement | null>(null)
const { stop } = useIntersectionObserver(loadMore, async ([{ isIntersecting }]) => {
  if (isIntersecting) await fetchDiaries()
}, { threshold: 1.0 })

onMounted(async() => {
  await fetchDiaries()
})

</script>

<template>
  <div>
    <h1 class="is-size-4-mobile is-size-2-tablet" style="padding-left: 0.5em;">일기 목록</h1>
    <ul class="diary-list">
      <li v-for="(diary, index) in diaries" :key="index" class="diary-item">
        <h2 class="is-size-6-mobile is-size-4-tablet font-nanum-pen">{{ diary.title }}</h2>
        <p class="is-size-7-mobile is-size-5-tablet font-nanum-pen">작성일: {{ dayjs(diary.date).format("YYYY-MM-DD hh:mm:ss") }}</p>
        <div class="tags">
          <span v-for="(tag, tagIndex) in diary.emotionTags" :key="tagIndex" class="tag is-size-8-mobile is-size-6-tablet">
            #{{ tag }}
          </span>
        </div>
      </li>
    </ul>
    <!-- Intersection Observer를 사용하는 감지기 -->
    <div ref="loadMore" style="height: 20px;" />

    <div v-if="loading" class="loading">Loading...</div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/assets/css/main.scss';

.diary-list {
  list-style: none;
  padding: 20px; // 리스트와 경계 간격 추가
}

.diary-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid $border-color-pen; // 부드러운 갈색 톤의 테두리
  border-radius: $border-radius; // 경계 둥글게
  background-color: $card-background-paper; // 카드 배경은 약간 어두운 종이 느낌
  box-shadow: $box-shadow; // 카드에 약간의 그림자 추가
  font-family: 'Noto Sans', sans-serif; // 부드러운 폰트 적용
}

.diary-item h2 {
  margin: 0 0 5px;
  color: $text-color-pen; // 제목은 진한 회색
  font-size: 1.5rem; // 제목 크기 조정
}

.tags {
  margin-top: 10px;
}

.tag {
  display: inline-block;
  background-color: $primary; // 강조 요소 색상
  color: #fff;
  padding: 5px 10px;
  margin-right: 5px;
  border-radius: 5px;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); // 태그에 약간의 그림자 추가
}

.loading {
  text-align: center;
  margin-top: 20px;
  font-size: 1.2rem;
}
</style>