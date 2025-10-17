
import React from 'react';

export function AnnouncementBar() {
  const message = "Get 10% off using coupon code AKATSU10";

  return (
    <div className="bg-black py-2 text-xs text-foreground overflow-x-hidden border-b border-border/40">
      <div className="px-[10%]">
        <div className="animate-marquee whitespace-nowrap">
          <span className="inline-block px-8">{message}</span>
        </div>
      </div>
    </div>
  );
}
