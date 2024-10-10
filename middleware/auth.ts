export default defineNuxtRouteMiddleware(async (to, from) => {
    const { loggedIn } = useUserSession()

    console.log(loggedIn)

    if (!loggedIn) {
        return navigateTo('/login')
    }
})