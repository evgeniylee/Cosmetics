"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { Icon } from "./Icon";

/** Секция главной: шлёт section_view, когда блок на ≥50% в экране, и section_click при клике внутри.
 *  С reveal (по умолчанию) плавно появляется при прокрутке. */
export function TrackSection({ id, className = "", children, reveal = true }: { id: string; className?: string; children: React.ReactNode; reveal?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen) {
          seen = true;
          track("section_view", { section_id: id });
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    let ro: IntersectionObserver | null = null;
    if (reveal) {
      ro = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            ro?.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      ro.observe(el);
    }
    return () => { io.disconnect(); ro?.disconnect(); };
  }, [id, reveal]);
  return (
    <section
      ref={ref}
      data-section={id}
      data-reveal={reveal ? "" : undefined}
      className={className}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) track("section_click", { section_id: id });
      }}
    >
      {children}
    </section>
  );
}

export function SectionHeader({ title, href, allLabel, onPrev, onNext }: { title: string; href?: string; allLabel?: string; onPrev?: () => void; onNext?: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3 md:mb-8 md:gap-5">
      <h2 className="h-section">{title}</h2>
      {href && (
        <Link href={href} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-surface pl-3.5 pr-2 text-[14px] hover:bg-line md:h-11 md:text-[16px]">
          {allLabel} <Icon name="chevron" size={18} />
        </Link>
      )}
      {onPrev && (
        <div className="ml-auto hidden gap-2 md:flex">
          <button type="button" onClick={onPrev} aria-label="←" className="grid size-12 place-items-center rounded-full bg-ink/15 text-white transition hover:bg-ink/30">
            <Icon name="arrowL" />
          </button>
          <button type="button" onClick={onNext} aria-label="→" className="grid size-12 place-items-center rounded-full bg-ink/30 text-white transition hover:bg-ink/50">
            <Icon name="arrowR" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Горизонтальная лента со свайпом на мобиле и стрелками на десктопе. */
export function Rail({ title, href, allLabel, children, itemClass = "w-[46%] sm:w-[31%] lg:w-[calc(25%-22px)]" }: { title: string; href?: string; allLabel?: string; children: React.ReactNode[]; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div>
      <SectionHeader title={title} href={href} allLabel={allLabel} onPrev={() => scroll(-1)} onNext={() => scroll(1)} />
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:-mx-[50px] md:scroll-px-[50px] md:gap-[30px] md:px-[50px]">
        {children.map((c, i) => (
          <div key={i} data-stagger style={{ "--i": Math.min(i, 5) } as React.CSSProperties} className={`shrink-0 snap-start ${itemClass}`}>{c}</div>
        ))}
      </div>
    </div>
  );
}
