import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { SpotifyIcon } from "@/components/spotify-icon";
import { LikeButton } from "@/components/social/like-button";
import type { PlaylistSummaryDTO } from "@/lib/types";

export function PlaylistCard({
  playlist,
  isAuthenticated,
}: {
  playlist: PlaylistSummaryDTO;
  isAuthenticated: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={playlist.owner.imageUrl ?? undefined} alt={playlist.owner.displayName ?? "User"} />
            <AvatarFallback>{playlist.owner.displayName?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{playlist.owner.displayName ?? "A Groove user"}</span>
        </div>
        <h3 className="font-heading text-lg font-semibold tracking-tight">{playlist.title}</h3>
        <p className="text-sm text-muted-foreground">{playlist.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground italic">&quot;{playlist.curatorNote}&quot;</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-primary/25 bg-primary/15 text-primary">
            {playlist.moodParameters.energy} energy
          </Badge>
          {playlist.moodParameters.descriptors.slice(0, 3).map((descriptor) => (
            <Badge key={descriptor} variant="outline">
              {descriptor}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
            {playlist.trackPreview.map((track) =>
              track.albumImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={track.id}
                  src={track.albumImageUrl}
                  alt={track.name}
                  className="size-10 rounded-md ring-2 ring-card object-cover"
                />
              ) : null
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {playlist.trackCount} track{playlist.trackCount === 1 ? "" : "s"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <LikeButton
          playlistId={playlist.id}
          initialLiked={playlist.likedByViewer}
          initialCount={playlist.likeCount}
          isAuthenticated={isAuthenticated}
        />
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          className="rounded-full"
          render={<a href={playlist.spotifyUrl} target="_blank" rel="noopener noreferrer" />}
        >
          <SpotifyIcon size={12} />
          Open in Spotify
          <ArrowUpRight className="size-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
