"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TOOL_SECTIONS } from "@/lib/tools";

export default function Home() {
  const everyday = TOOL_SECTIONS.filter((s) => !s.manage);
  const manage = TOOL_SECTIONS.filter((s) => s.manage);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          What do you need to do?
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Pick the situation, then the tool. Press ⌘K to find a tool by name.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {everyday.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Back office</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {manage.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: (typeof TOOL_SECTIONS)[number] }) {
  const Icon = section.icon;
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="scroll-mt-8 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 id={`${section.id}-title`} className="text-[15px] font-semibold text-card-foreground">
            {section.title}
          </h2>
          <p className="text-[13px] text-muted-foreground">{section.summary}</p>
        </div>
      </div>
      <ul className="border-t border-border">
        {section.tools.map((tool) => (
          <li key={tool.href} className="border-b border-border last:border-b-0">
            <Link
              href={tool.href}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[14px] text-card-foreground">{tool.name}</div>
                <div className="text-[13px] text-muted-foreground">{tool.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
