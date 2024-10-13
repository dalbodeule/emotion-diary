import * as schema from '@/server/db/schema'
import { eq } from "drizzle-orm";
import passwordHash from "@/server/utils/passwordHash";

export interface AuthRecoverRequestDTO {
    email: string,
    security_answer: string,
    recovery_code: string,
}

export interface AuthRecoverResponseDTO {
    message: string,
    privateKey: string,
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event) as AuthRecoverRequestDTO

    if (!body) {}

    const db = await useDrizzle()

    // Check if user exists with the specified email
    const user = await db.query.users.findFirst({
        where: eq(schema.users.email, body.email)
    }).execute();

    if (!user) {
        return createError({ status: 404, message: 'User not found.' });
    }

    // Retrieve user credentials
    const credentials = await db.query.user_credentials.findFirst({
        where: eq(schema.user_credentials.user_id, user.id)
    }).execute();

    if (!credentials) {
        return createError({ status: 404, message: 'User credentials not found.' });
    }

    // Validate security answer and recovery code
    const answerMatches = credentials.security_answer === await passwordHash(body.security_answer);
    const codeMatches = credentials.recovery_code === body.recovery_code;

    // Check if at least two validations are true
    if (answerMatches + codeMatches < 2) {
        return createError({ status: 400, message: 'Invalid recovery information.' });
    }

    // Retrieve Shamir shares and reconstruct the private key
    const shares = await db.query.private_key_shares.findSome({
        where: eq(schema.private_key_shares.user_id, user.id)
    }).execute();

    if (shares.length < 3) { // Ensure enough shares are available
        return createError({ status: 400, message: 'Not enough shares to recover the key.' });
    }

    // Combine shares to reconstruct the private key
    const privateKeyHex = combineShares(shares.map(share => share.share));

    // Allow the user to reset their password using the recovered private key
    // Here you can proceed to securely reset the user's password

    const response: AuthRecoverResponseDTO = {
        message: 'Recovery successful, you can now reset your password.',
        privateKey: privateKeyHex
    }

    return response
});