"use client";

import Image from "next/image";
import { siteConfig } from "@/config/site";
import FadeInSection from "./FadeInSection";

interface FooterProps {
  onImageClick?: (src: string) => void;
}

export default function Footer({ onImageClick }: FooterProps) {
  return (
    <footer className="bg-linen-white min-h-screen w-full flex flex-col items-center justify-center p-6 border-t border-amber-gold/15 text-center relative">
      <FadeInSection>
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-4xl text-deep-espresso font-semibold font-display-cinzel">
            {siteConfig.couple.hashtag}
          </p>
          <p className="font-body text-base text-deep-espresso/80">
            Thank you for being part of our story. We can&apos;t wait to celebrate our union with you.
          </p>
          <div 
            className={`relative w-[150px] aspect-square mx-auto bg-white p-2 pb-6 rounded shadow border border-deep-espresso/5 rotate-3 scale-90 select-none ${
              onImageClick ? "cursor-zoom-in" : ""
            }`} 
            onClick={() => onImageClick?.("/images/story-4.png")}
          >
            <div className="relative w-full h-full overflow-hidden bg-deep-espresso/5 rounded-sm">
              <Image src="/images/story-4.png" alt="Memory" fill className="object-cover" />
            </div>
          </div>
          <p className="font-body text-xs text-deep-espresso/60 pt-4">
            © 2026 {siteConfig.couple.person1} & {siteConfig.couple.person2}. Handcrafted with love.
          </p>
        </div>
      </FadeInSection>
    </footer>
  );
}
