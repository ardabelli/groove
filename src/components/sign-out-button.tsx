"use client";

import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/backend";

export function SignOutButton() {
  async function handleSignOut() {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
