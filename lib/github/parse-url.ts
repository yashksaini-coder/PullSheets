export function parsePrUrl(u: string): { owner: string; repo: string; number: number } | null {
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i.exec((u ?? '').trim());
  return m ? { owner: m[1], repo: m[2], number: Number(m[3]) } : null;
}
