export interface ChannelInfo {
  channelId: string;
  channelTitle: string;
  channelHandle: string | null;
  channelThumbnailUrl: string | null;
  subscriberCount: number | null;
}

interface ChannelsResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      customUrl?: string;
      thumbnails?: Record<string, { url: string } | undefined>;
    };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
  error?: { message: string };
}

/** The channel owned by the authorised Google account, or null if it has none. Costs 1 quota unit. */
export async function getMyChannel(accessToken: string): Promise<ChannelInfo | null> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as ChannelsResponse;
  if (!res.ok) throw new Error(`YouTube channels.list: ${json.error?.message ?? res.status}`);

  const channel = json.items?.[0];
  if (!channel) return null;

  const thumbs = channel.snippet.thumbnails ?? {};
  const stats = channel.statistics;
  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    channelHandle: channel.snippet.customUrl ?? null,
    channelThumbnailUrl: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? null,
    subscriberCount: stats && !stats.hiddenSubscriberCount && stats.subscriberCount ? Number(stats.subscriberCount) : null,
  };
}
