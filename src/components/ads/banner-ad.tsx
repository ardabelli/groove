"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const ADSENSE_BANNER_SLOT = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT;

// Renders a real AdSense unit once NEXT_PUBLIC_ADSENSE_CLIENT_ID / _BANNER_SLOT are set;
// falls back to a placeholder slot in the meantime so the layout reserves the space.
export function BannerAd() {
  const configured = Boolean(ADSENSE_CLIENT_ID && ADSENSE_BANNER_SLOT);

  useEffect(() => {
    if (!configured) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js may not have finished loading yet; it self-initializes once it does.
    }
  }, [configured]);

  if (!configured) {
    return (
      <div className="flex h-[50px] w-full shrink-0 items-center justify-center border-t border-dashed border-border bg-muted/30 text-[11px] tracking-wide text-muted-foreground/50 uppercase sm:h-[90px]">
        Ad slot — set NEXT_PUBLIC_ADSENSE_CLIENT_ID / NEXT_PUBLIC_ADSENSE_BANNER_SLOT to go live
      </div>
    );
  }

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_BANNER_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
