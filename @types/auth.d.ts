declare module '#auth-utils' {
    interface User {
        username: string,
        email: string,
        nickname: string,
        id: number
    }

    interface UserSession {
        username: string,
        email: string,
        nickname: string,
        id: number
    }

    interface SecureSessionData {
        privateKey: string;
    }
}
