"use client";

import { useState } from "react";

interface AccordionItem {
  key: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {items.map((item) => {
        const isOpen = openKey === item.key;
        return (
          <div
            key={item.key}
            className="linen-card rounded-2xl overflow-hidden transition-all duration-300 border border-amber-gold/15"
          >
            <button
              onClick={() => toggle(item.key)}
              aria-expanded={isOpen}
              className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-heading text-lg font-bold text-deep-espresso hover:text-deep-terracotta transition-colors duration-300 focus:outline-none"
            >
              <span>{item.question}</span>
              <svg
                className={`w-5 h-5 text-amber-gold transition-transform duration-300 shrink-0 ${
                  isOpen ? "rotate-180 text-deep-terracotta" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-[300px] border-t border-amber-gold/10" : "max-h-0"
              }`}
            >
              <div className="px-6 py-5 font-body text-base text-deep-espresso/80 leading-relaxed bg-warm-cream/30">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
