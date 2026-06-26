/** Strip MongoDB document dumps and secrets from error messages before sending to clients. */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'Something went wrong. Please try again.';

  if (/Can't extract geo keys/i.test(message)) {
    return 'Location data is invalid. Please try again.';
  }

  if (/E11000 duplicate key/i.test(message)) {
    return 'Duplicate entry — resource already exists';
  }

  if (
    message.length > 200 ||
    /ObjectId\(|password:|"\$2[aby]\$"/i.test(message) ||
    /MongoServerError|Plan executor error/i.test(message)
  ) {
    return 'Something went wrong. Please try again.';
  }

  return message;
}

export function shouldExposeErrorInternals(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    !process.env.RENDER &&
    !process.env.VERCEL
  );
}
