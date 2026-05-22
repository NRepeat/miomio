'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  children: ReactNode;
  collapsedHeight?: number;
  showLabel: string;
  hideLabel: string;
};

export function SeoCurtain({
  children,
  collapsedHeight = 280,
  showLabel,
  hideLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div
        style={open ? undefined : { maxHeight: collapsedHeight }}
        className={
          'relative overflow-hidden transition-[max-height] duration-500 ease-out ' +
          (open ? 'max-h-none' : '')
        }
        aria-expanded={open}
      >
        {children}
        {!open && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background"
          />
        )}
      </div>

      <div className="mt-4 mb-10 md:mb-14 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors"
        >
          {open ? hideLabel : showLabel}
          <ChevronDown
            className={
              'h-4 w-4 transition-transform duration-200 ' +
              (open ? 'rotate-180' : '')
            }
          />
        </button>
      </div>
    </div>
  );
}
