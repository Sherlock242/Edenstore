import React from 'react';

type AnnouncementBarProps = {
  message: string;
};

export function AnnouncementBar({ message }: AnnouncementBarProps) {
  return (
    <div className="bg-background py-2 text-xs text-foreground overflow-x-hidden border-b border-border/40">
      <div className="px-[10%]">
        <div className="animate-marquee whitespace-nowrap">
          <span className="inline-block">{message}</span>
        </div>
      </div>
    </div>
  );
}
