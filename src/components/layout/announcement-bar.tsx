
import React from 'react';

export function AnnouncementBar() {
  const message = "Get 10% off using coupon code AKATSU10";

  return (
    <div className="bg-black text-primary-foreground py-2 text-sm font-semibold overflow-x-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="inline-block px-8">{message}</span>
      </div>
    </div>
  );
}
