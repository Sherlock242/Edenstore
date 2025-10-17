import React from 'react';

export function AnnouncementBar() {
  const message = "Get 10% off using coupon code AKATSU10";
  
  // To create a seamless loop, we repeat the message enough times to fill the screen and beyond.
  const repetitions = 5;

  return (
    <div className="bg-primary text-primary-foreground py-2 text-sm font-semibold">
      <div className="relative flex overflow-x-hidden">
        <div className="animate-marquee whitespace-nowrap">
          {Array(repetitions).fill(null).map((_, i) => (
            <span key={i} className="mx-8">
              {message}
            </span>
          ))}
        </div>

        <div className="absolute top-0 animate-marquee2 whitespace-nowrap">
           {Array(repetitions).fill(null).map((_, i) => (
            <span key={i} className="mx-8">
              {message}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
