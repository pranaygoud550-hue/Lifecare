/** Ensure Atlas passwords with special characters are URL-encoded. */
export function encodeMongoUri(uri: string): string {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^@]+)@(.+)$/i);
  if (!match) return uri;

  const [, protocol, credentials, rest] = match;
  const colon = credentials.indexOf(':');
  if (colon === -1) return uri;

  const user = credentials.slice(0, colon);
  let password = credentials.slice(colon + 1);

  // Strip accidental angle brackets from Atlas UI copy-paste
  password = password.replace(/^<|>$/g, '');

  try {
    password = encodeURIComponent(decodeURIComponent(password));
  } catch {
    password = encodeURIComponent(password);
  }

  return `${protocol}${user}:${password}@${rest}`;
}

export function isAtlasUri(uri: string): boolean {
  return uri.startsWith('mongodb+srv://');
}

export function maskMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

export function atlasConnectionHints(errorMessage: string): string[] {
  const hints: string[] = [];
  const lower = errorMessage.toLowerCase();

  if (
    lower.includes('ssl') ||
    lower.includes('tls') ||
    lower.includes('whitelist') ||
    lower.includes('server selection')
  ) {
    hints.push('Atlas → Network Access → Add IP → Allow Access from Anywhere (0.0.0.0/0)');
    hints.push('Atlas → Database → Browse Collections → Resume if cluster is paused');
    hints.push('Disable VPN / try another network if TLS errors persist');
  }

  if (lower.includes('authentication') || lower.includes('bad auth')) {
    hints.push('Atlas → Database Access → verify username/password → Edit → Reset password');
    hints.push('Ensure MONGODB_URI includes database name: ...mongodb.net/lifecare-plus?...');
  }

  return hints;
}
