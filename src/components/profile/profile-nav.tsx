"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ProfileSection {
  id: string;
  label: string;
}

export function ProfileNav({ sections }: { sections: ProfileSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="flex flex-col gap-1 border-l border-border">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "-ml-px border-l-2 px-4 py-1.5 text-sm transition-colors",
            activeId === section.id
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
