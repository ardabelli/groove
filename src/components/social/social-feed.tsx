"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaylistCard } from "@/components/social/playlist-card";
import { BACKEND_URL, fetchMe } from "@/lib/backend";
import type { PlaylistSummaryDTO, SocialListResult } from "@/lib/types";

const FEED_PAGE_SIZE = 12;

async function fetchSocialList(path: string): Promise<SocialListResult> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { credentials: "include" });
    return (await res.json()) as SocialListResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export function SocialFeed() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [popular, setPopular] = useState<PlaylistSummaryDTO[] | null>(null);
  const [feed, setFeed] = useState<PlaylistSummaryDTO[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((me) => setIsAuthenticated(me.authenticated));

    Promise.all([
      fetchSocialList(`/api/social/popular?limit=6`),
      fetchSocialList(`/api/social/feed?limit=${FEED_PAGE_SIZE}&offset=0`),
    ]).then(([popularResult, feedResult]) => {
      if (popularResult.ok) setPopular(popularResult.data.playlists);
      if (feedResult.ok) {
        setFeed(feedResult.data.playlists);
        setHasMore(feedResult.data.hasMore);
      }
      setIsInitialLoading(false);
    });
  }, []);

  function handleLoadMore() {
    setIsLoadingMore(true);
    fetchSocialList(`/api/social/feed?limit=${FEED_PAGE_SIZE}&offset=${feed.length}`).then((result) => {
      if (result.ok) {
        setFeed((prev) => [...prev, ...result.data.playlists]);
        setHasMore(result.data.hasMore);
      }
      setIsLoadingMore(false);
    });
  }

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {popular && popular.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Popular playlists</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {popular.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Shared by the community</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No playlists have been shared yet — be the first to curate a vibe and share it.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {feed.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        )}
        {hasMore && (
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="self-center rounded-full"
          >
            {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
            Load more
          </Button>
        )}
      </section>
    </div>
  );
}
