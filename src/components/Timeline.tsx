"use client";

import { TimelineItem } from "@/config/site";
import { useState } from "react";
import Image from "next/image";

interface TimelineProps {
  items: TimelineItem[];
  fontClass: string;
}

export default function Timeline({ items, fontClass }: TimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative border-l border-amber-gold/30 ml-4 md:ml-1/2 md:border-l-0 py-8 select-text">
      {/* Visual centerline for desktop */}
      <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-amber-gold/30" />

      {items.map((item, index) => {
        const isEven = index % 2 === 0;
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={item.key}
            className={`relative mb-16 last:mb-0 md:flex md:w-full items-center ${
              isEven ? "md:justify-start" : "md:justify-end"
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Timeline node/marker */}
            <div
              className={`absolute left-[-21px] md:left-1/2 md:ml-[-10px] w-5 h-5 rounded-full border-2 border-amber-gold bg-warm-cream flex items-center justify-center transition-all duration-500 z-20 ${
                isHovered ? "scale-125 border-deep-terracotta bg-linen-white" : ""
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full bg-amber-gold transition-colors duration-500 ${
                  isHovered ? "bg-deep-terracotta" : ""
                }`}
              />
            </div>

            {/* Timeline content card (Polaroid-style) */}
            <div
              className={`w-full pl-6 md:pl-0 md:w-[45%] transition-all duration-500 ${
                isEven ? "md:pr-12 text-left md:text-right" : "md:pl-12 text-left"
              } ${isHovered ? "translate-y-[-4px]" : ""}`}
            >
              <div className="linen-card overflow-hidden rounded-2xl border border-amber-gold/20 transition-all duration-500 hover:shadow-xl hover:border-amber-gold/45 bg-linen-white">
                {/* Polaroid Image Wrapper */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-deep-espresso/5 border-b border-amber-gold/10">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className={`object-cover transition-transform duration-700 ease-out ${
                      isHovered ? "scale-105" : "scale-100"
                    }`}
                  />
                  {/* Soft paper grain overlay inside the photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-espresso/30 to-transparent pointer-events-none mix-blend-multiply" />
                </div>
                
                {/* Card Text Content */}
                <div className="p-6 sm:p-8">
                  <span className="inline-block font-heading text-xs font-semibold text-amber-gold tracking-widest uppercase mb-2">
                    {item.label}
                  </span>
                  
                  <h3 className={`text-2xl font-bold text-deep-espresso mb-3 transition-colors duration-300 ${fontClass}`}>
                    {item.title}
                  </h3>
                  
                  <p className="font-body text-base sm:text-lg text-deep-espresso/80 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
