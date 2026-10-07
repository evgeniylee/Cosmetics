import type { Pack } from "@/data/catalog";

// Временная иллюстрация упаковки, пока нет фото товаров. Когда появится поле image,
// компонент заменяется на next/image с фото на прозрачном фоне.
const SHAPES: Record<Pack, { body: string; cap: string; label: string }> = {
  bottle: { body: "w-[30%] h-[56%] rounded-t-[14%] rounded-b-[10%]", cap: "w-[16%] h-[11%] -top-[10%] rounded-t-md", label: "top-[38%] h-[22%]" },
  tube: { body: "w-[27%] h-[62%] rounded-t-[8%] rounded-b-[40%]", cap: "w-[19%] h-[9%] -top-[8%] rounded-md", label: "top-[30%] h-[26%]" },
  jar: { body: "w-[48%] h-[30%] rounded-[12%]", cap: "w-[52%] h-[11%] -top-[10%] rounded-lg", label: "top-[28%] h-[40%]" },
  pump: { body: "w-[31%] h-[52%] rounded-[16%]", cap: "w-[9%] h-[17%] -top-[16%] rounded-sm", label: "top-[36%] h-[24%]" },
  dropper: { body: "w-[28%] h-[44%] rounded-[14%]", cap: "w-[12%] h-[22%] -top-[21%] rounded-t-full", label: "top-[34%] h-[28%]" },
};

export function ProductVisual({ pack, color, brand }: { pack: Pack; color: string; brand?: string }) {
  const s = SHAPES[pack];
  return (
    <div className="relative grid h-full w-full place-items-center" aria-hidden="true">
      <div
        className={`relative mt-[8%] ${s.body}`}
        style={{ background: `linear-gradient(100deg, color-mix(in oklab, ${color} 82%, white) 0%, ${color} 55%, color-mix(in oklab, ${color} 78%, black) 100%)`, boxShadow: "0 18px 30px -18px rgba(17,17,17,.35)" }}
      >
        <span className={`absolute left-1/2 -translate-x-1/2 ${s.cap}`} style={{ background: `color-mix(in oklab, ${color} 35%, #1a1a1a)` }} />
        {pack === "pump" && <span className="absolute -top-[19%] left-1/2 h-[4%] w-[28%] rounded-sm" style={{ background: `color-mix(in oklab, ${color} 35%, #1a1a1a)` }} />}
        <span className={`absolute inset-x-[12%] grid place-items-center rounded-[3px] bg-white/80 ${s.label}`}>
          {brand && <span className="truncate px-1 text-[clamp(6px,1.1vw,10px)] font-bold uppercase tracking-wider text-ink/70">{brand}</span>}
        </span>
      </div>
    </div>
  );
}

/** Фото товара, если оно загружено в админке, иначе нарисованная упаковка. */
export function ProductImage({ p, index = 0, brand = true, className = "" }: { p: { images?: string[]; pack: Pack; color: string; brand: string; name?: string }; index?: number; brand?: boolean; className?: string }) {
  const src = p.images?.[index];
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={p.name ? `${p.brand} ${p.name}` : ""} loading="lazy" draggable={false} className={`h-full w-full object-contain ${className}`} />;
  return <ProductVisual pack={p.pack} color={p.color} brand={brand ? p.brand : undefined} />;
}
