import { useEffect, useState } from "react";

interface FlipDigitProps {
  value: string;
}

export const FlipDigit = ({ value }: FlipDigitProps) => {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== display) {
      setFlipping(true);
      const t = setTimeout(() => {
        setDisplay(value);
        setFlipping(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [value, display]);

  return (
    <div className="relative w-24 h-32 sm:w-28 sm:h-40 md:w-40 md:h-56 flip-card rounded-2xl overflow-hidden flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px flip-divider z-10" />
      <span
        className={`text-5xl sm:text-6xl md:text-9xl font-semibold tracking-tight text-foreground tabular-nums transition-all duration-300 ${
          flipping ? "opacity-60 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {display}
      </span>
    </div>
  );
};
