<script setup lang="ts">
import dayjs from 'dayjs'

definePageMeta({
  layout: 'logged-in'
})

// 목업 데이터
const diaries = ref([
  {
    title: '오늘의 일기',
    date: new Date('2024-09-15'),
    emotionTags: ['기쁨', '활기참'],
  },
  {
    title: '공부하면서 느낀 점',
    date: new Date('2024-09-30'),
    emotionTags: ['지루함', '집중'],
  },
  {
    title: '친구와의 대화',
    date: new Date('2024-10-05'),
    emotionTags: ['화남', '평화'],
  },
]);

diaries.value.sort((a, b) => b.date - a.date)
</script>

<template>
  <div>
    <h1 class="is-size-4-mobile is-size-2-tablet" style="padding-left: 0.5em;">일기 목록</h1>
    <ul class="diary-list">
      <li v-for="(diary, index) in diaries" :key="index" class="diary-item">
        <h2 class="is-size-6-mobile is-size-4-tablet">{{ diary.title }}</h2>
        <p class="is-size-7-mobile is-size-5-tablet">작성일: {{ dayjs(diary.date).format("YYYY-MM-DD hh:mm:ss") }}</p>
        <div class="tags">
          <span v-for="(tag, tagIndex) in diary.emotionTags" :key="tagIndex" class="tag is-size-8-mobile is-size-6-tablet">
            #{{ tag }}
          </span>
        </div>
      </li>
    </ul>
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
</style>