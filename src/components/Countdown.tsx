"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Calculate immediately on mount to avoid layout delay, deferred to next tick to avoid cascading render lint warning
    const initialTimeout = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 0);

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(timer);
    };
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="text-center font-heading text-xl text-deep-terracotta italic py-6">
        The day has arrived! 🎉
      </div>
    );
  }

  const timeBlocks = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 max-w-2xl mx-auto py-8">
      {timeBlocks.map((block) => (
        <div
          key={block.label}
          className="flex flex-col items-center justify-center min-w-[70px] sm:min-w-[90px] md:min-w-[110px] aspect-square rounded-2xl linen-card relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          {/* Accent decoration inside the card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-gold/50 group-hover:bg-deep-terracotta transition-colors duration-300" />
          
          <span className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-deep-espresso">
            {String(block.value).padStart(2, "0")}
          </span>
          <span className="text-xs sm:text-sm font-body text-amber-gold font-medium uppercase tracking-wider mt-1">
            {block.label}
          </span>
        </div>
      ))}
    </div>
  );
}
