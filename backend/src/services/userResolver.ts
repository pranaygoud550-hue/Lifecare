import { User } from '../models/index.js';
import { devUserIdToPhone, ensureDevDemoUserInDb, isDevDemoUserId } from './devAuthFallback.js';

/** Resolve a user by JWT id, including legacy demo tokens that used fixed placeholder ids. */
export async function resolveUserById(userId: string) {
  let user = await User.findById(userId);
  if (user) return user;

  if (isDevDemoUserId(userId)) {
    const phone = devUserIdToPhone(userId);
    if (phone) user = await ensureDevDemoUserInDb(phone);
  }

  return user;
}
