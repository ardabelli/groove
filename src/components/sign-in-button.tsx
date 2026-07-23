import { Button } from "@/components/ui/button";
import { SpotifyIcon } from "@/components/spotify-icon";
import { BACKEND_URL } from "@/lib/backend";

export function SignInButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <Button
      size={size}
      nativeButton={false}
      className="rounded-full hover:bg-[#1ed760]"
      render={<a href={`${BACKEND_URL}/api/auth/login`} />}
    >
      <SpotifyIcon size={14} />
      Connect with Spotify
    </Button>
  );
}
