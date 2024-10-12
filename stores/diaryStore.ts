import { defineStore } from 'pinia'

export interface IDiaryStore {
    id: number;
    title: string;
    content: string;
    tags: string[],
    isUseTag: boolean
}

export const useDiaryStore = defineStore('diary', {
    state: () => ({
        diaries: [] as IDiaryStore[],
        currentDiary: {
            title: '',
            content: '',
            tags: [] as string[],
            isUseTag: false
        } as IDiaryStore,
    }),
    actions: {
        addDiary() {
            const newDiary = { ...this.currentDiary };
            this.diaries.push(newDiary);
            this.resetCurrentDiary();
            return newDiary; // 저장한 일기를 반환
        },

        resetCurrentDiary() {
            this.currentDiary = {
                title: '',
                content: '',
                tags: [],
            };
        },

        addTag(tag: string) {
            if (!this.currentDiary.tags.includes(tag)) {
                this.currentDiary.tags.push(tag);
            }
        },

        removeTag(tag: string) {
            this.currentDiary.tags = this.currentDiary.tags.filter(t => t !== tag);
        },

        removeTagLatest() {
            this.currentDiary.tags.pop()
        },

        changeCheckbox(value: boolean) {
            this.currentDiary.isUseTag = value;
        }
    },
});