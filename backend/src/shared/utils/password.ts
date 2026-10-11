import { compare as bcryptCompare, hash as bcryptHash } from 'bcryptjs';
import { env } from '../../config/env';

/**
 * Password hashing.
 *
 * Argon2id is preferred (env PASSWORD_HASH_ALGO=argon2id). It is a native
 * dependency, so it is loaded lazily and the bcrypt fallback is used when it is
 * not installed on the host. Hashes are self-describing, so verification works
 * regardless of which driver produced the stored hash.
 */

const BCRYPT_ROUNDS = 12;

interface Argon2Module {
  hash: (password: string, options?: { type?: number }) => Promise<string>;
  verify: (hash: string, password: string) => Promise<boolean>;
}

let argon2: Argon2Module | null = null;
let argon2Loaded = false;

function loadArgon2(): Argon2Module | null {
  if (argon2Loaded) {
    return argon2;
  }
  argon2Loaded = true;
  if (env.PASSWORD_HASH_ALGO !== 'argon2id') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    argon2 = require('argon2') as Argon2Module;
  } catch {
    argon2 = null;
  }
  return argon2;
}

export async function hashPassword(password: string): Promise<string> {
  const driver = loadArgon2();
  if (driver) {
    return driver.hash(password);
  }
  return bcryptHash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (hash.startsWith('$argon2')) {
    const driver = loadArgon2();
    if (!driver) {
      return false;
    }
    return driver.verify(hash, password);
  }
  return bcryptCompare(password, hash);
}
