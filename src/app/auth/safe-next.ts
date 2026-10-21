// Only allow same-site relative paths, so a link can never bounce the user to another domain.
export function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
