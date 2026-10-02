const ENCODED_PATH_SEPARATOR = /%2[fF]|%5[cC]/;
const PARSER_ORIGIN = 'https://pullsheets.invalid';

export const DEFAULT_NEXT = '/editor';

/** C0/C1 control characters, which browsers strip or fold when parsing a URL. */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Narrows an attacker-controlled `?next=` to a same-origin path that is safe to put in a
 * `Location` header or hand to the client router. Anything else — including `/login`, which
 * would loop — falls back to `/editor`.
 *
 * Ported from better-auth's own `isSafeRelativeURL`
 * (`better-auth/dist/auth/trusted-origins.mjs`) so our `redirect()` leg rejects exactly what
 * better-auth's `callbackURL` leg rejects. `startsWith('/') && !startsWith('//')` is not
 * enough: the WHATWG URL parser folds a backslash into a slash for special schemes, so
 * `/\evil.com` resolves to `http://evil.com/`, and `%2f`/`%5c` in the path smuggle the same
 * thing past a naive prefix check.
 */
export function safeNextPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || hasControlCharacter(raw)) return DEFAULT_NEXT;
  const queryOrHash = raw.search(/[?#]/);
  const path = queryOrHash === -1 ? raw : raw.slice(0, queryOrHash);
  if (ENCODED_PATH_SEPARATOR.test(path)) return DEFAULT_NEXT;
  try {
    const url = new URL(raw, PARSER_ORIGIN);
    if (url.origin !== PARSER_ORIGIN || url.pathname === '/login') return DEFAULT_NEXT;
    return raw;
  } catch {
    return DEFAULT_NEXT;
  }
}
