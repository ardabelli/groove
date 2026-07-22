import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/backend";

export function SignInButton({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <Button
      size={size}
      className="bg-[#1db954] hover:bg-[#1ed760] text-black"
      render={<a href={`${BACKEND_URL}/api/auth/login`} />}
    >
      Connect with Spotify
    </Button>
  );
}
