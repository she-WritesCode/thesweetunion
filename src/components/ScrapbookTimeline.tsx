"use client";

import { TimelineItem } from "@/config/site";
import Image from "next/image";

interface TimelineProps {
  items: TimelineItem[];
  onImageClick: (url: string) => void;
}

export default function ScrapbookTimeline({ items, onImageClick }: TimelineProps) {
  // Pre-configured scattering offsets and angles for a messy scrapbook collage
  const collageStyles = [
    {
      rotation: "rotate-[-3deg]",
      tapeRotation: "rotate-[-10deg] left-[25%] top-[-14px]",
      tapeColor: "washi-tape-terracotta",
      marginOffset: "translate-y-2 lg:translate-x-4",
    },
    {
      rotation: "rotate-[4deg]",
      tapeRotation: "rotate-[8deg] right-[25%] top-[-12px]",
      tapeColor: "washi-tape-gold",
      marginOffset: "-translate-y-4 lg:-translate-x-4",
    },
    {
      rotation: "rotate-[-2deg]",
      tapeRotation: "rotate-[-5deg] left-[30%] top-[-16px]",
      tapeColor: "washi-tape",
      marginOffset: "translate-y-4 lg:translate-x-2",
    },
    {
      rotation: "rotate-[3deg]",
      tapeRotation: "rotate-[12deg] right-[30%] top-[-10px]",
      tapeColor: "washi-tape-terracotta",
      marginOffset: "-translate-y-2 lg:-translate-x-2",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4 select-text">
      {/* Scattered overlapping grid of Polaroid memories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 relative">

        {items.map((item, index) => {
          const style = collageStyles[index % collageStyles.length];

          return (
            <div
              key={item.key}
              className={`relative z-10 w-full max-w-md mx-auto select-none transition-all duration-500 hover:z-20 hover:scale-[1.03] ${style.rotation} ${style.marginOffset}`}
            >
              {/* Piece of washi tape holding this Polaroid memory */}
              <div className={`washi-tape absolute ${style.tapeRotation} ${style.tapeColor}`} />

              {/* The Polaroid Card */}
              <div className="bg-white p-4 pb-8 rounded shadow-xl border border-deep-espresso/5 flex flex-col">
                {/* Photo frame */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-deep-espresso/5 rounded-sm border border-deep-espresso/10 cursor-zoom-in">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    onClick={() => onImageClick(item.imageUrl)}
                  />
                  {/* Subtle shadows & paper details on photo */}
                  <div className="absolute inset-0 bg-linear-to-t from-deep-espresso/10 to-transparent pointer-events-none" />
                </div>

                {/* Handwritten diary entry description */}
                <div className="mt-5 space-y-2.5 text-deep-espresso text-left select-text">
                  <div className="flex items-center justify-between border-b border-amber-gold/15 pb-1">
                    <span className="font-display-cormorant text-2xl font-bold text-deep-terracotta">
                      {item.title}
                    </span>
                    <span className="font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase">
                      {item.label}
                    </span>
                  </div>
                  <p className="font-body text-base text-deep-espresso/80 leading-relaxed italic">
                    &quot;{item.description}&quot;
                  </p>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
