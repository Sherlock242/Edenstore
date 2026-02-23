
import { Github, Twitter, Instagram } from "lucide-react";

export function Footer({ siteName }: { siteName: string }) {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row">
        <div className="flex items-center space-x-2">
          <span className="font-body text-lg font-semibold uppercase text-primary">
            {siteName}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <a href="#" aria-label="Twitter">
            <Twitter className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </a>
          <a href="#" aria-label="GitHub">
            <Github className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </a>
          <a href="https://www.instagram.com/santosh.r.k__?igsh=dDA4eXY0Z2l5bXZj" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
            <Instagram className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </a>
        </div>
      </div>
    </footer>
  );
}
