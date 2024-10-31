import {createHash} from "crypto";
import bcrypt from "bcrypt";

export default async function passwordHash(password: string, saltRounds: number) {
    // 비밀번호 해싱 (SHA256 -> bcrypt)
    const sha256Hash = createHash('sha256').update(password).digest('hex');
    const salt = await new Promise((resolve, reject) => {
        bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) return reject(err);
            return resolve(salt);
        });
    })
    return await new Promise((resolve, reject) => {
        bcrypt.hash(sha256Hash, salt, (err, hash) => {
            if (err) return reject(err);
            return resolve(hash);
        })
    })
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
export function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// https://stackoverflow.com/a/1527820/11516704
