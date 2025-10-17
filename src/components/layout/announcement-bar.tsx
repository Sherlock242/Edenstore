
import React from 'react';

export function AnnouncementBar() {
  const message = "Get 10% off using coupon code AKATSU10";

  return (
    <div className="bg-black text-white py-2 text-sm overflow-x-hidden border-b border-border/40">
      <div className="animate-marquee whitespace-nowrap">
        <span className="inline-block px-8">{message}</span>
      </div>
    </div>
  );
}
