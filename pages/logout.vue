<script setup lang="ts">
const { clear } = useUserSession()
const router = useRouter()

;(async() => {
  await clear()
  await router.push('/')
})()
</script>