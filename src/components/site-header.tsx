"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { SignInButton } from "@/components/sign-in-button";
import { fetchMe, type MeResponse } from "@/lib/backend";

export function SiteHeader() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  return (
    <header className="flex items-center justify-between sticky top-0 z-20 border-b bg-background/70 px-6 py-4 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight transition-colors hover:text-primary"
        >
          Groove
        </Link>
        <Link
          href="/#community"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Social
        </Link>
      </div>
      {me?.authenticated && me.user ? (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarImage src={me.user.imageUrl ?? undefined} alt={me.user.displayName ?? "User"} />
            <AvatarFallback>{me.user.displayName?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{me.user.displayName}</span>
          <SignOutButton />
        </div>
      ) : (
        <SignInButton size="sm" />
      )}
    </header>
  );
}
