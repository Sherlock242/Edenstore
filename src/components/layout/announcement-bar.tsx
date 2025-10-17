import React from 'react';

export function AnnouncementBar() {
  const message = "Get 10% off using coupon code AKATSU10";

  return (
    <div className="bg-primary text-primary-foreground py-2 text-sm font-semibold overflow-x-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="mx-8">{message}</span>
        {/* We can add more spans if the message is short and needs to fill the space before repeating */}
        <span className="mx-8">{message}</span>
        <span className="mx-8">{message}</span>
        <span className="mx-8">{message}</span>
      </div>
    </div>
  );
}
