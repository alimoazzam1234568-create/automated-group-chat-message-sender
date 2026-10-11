export interface RelayTarget {
  id: string;
  name: string;
  url: string;
  avatarUrl: string | null;
}

export interface Relay extends RelayTarget {
  enabled: boolean;
}

const WEBHOOK_RE =
  /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([\w-]+)/i;

export function validateWebhookUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return 'Paste a webhook URL first';
  if (!/^https:\/\//i.test(url)) return 'URL must start with https://';
  if (!WEBHOOK_RE.test(url))
    return 'Not a Discord webhook URL — it looks like https://discord.com/api/webhooks/…';
  return null;
}

export async function fetchWebhookInfo(rawUrl: string): Promise<RelayTarget> {
  const url = rawUrl.trim();
  const err = validateWebhookUrl(url);
  if (err) throw new Error(err);

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    throw new Error('Could not reach Discord — check your connection');
  }

  if (res.status === 404) throw new Error('Webhook not found — it may have been deleted');
  if (res.status === 401) throw new Error('Invalid webhook token');
  if (!res.ok) throw new Error(`Discord responded with HTTP ${res.status}`);

  const j = (await res.json()) as { id: string | number; name?: string; avatar?: string | null };
  const id = String(j.id);
  return {
    id,
    name: j.name || 'Webhook',
    url,
    avatarUrl: j.avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${j.avatar}.png?size=64`
      : null,
  };
}

/** Minimum gap between posts to one webhook so we stay under Discord rate limits. */
export const RELAY_MIN_GAP_MS = 1100;
