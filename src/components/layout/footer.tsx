
import Link from "next/link";
import { Github, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row">
        <div className="flex items-center space-x-2">
          <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-transparent">
            EDENSTORE
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} EdenStore. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <Link href="#" aria-label="Twitter">
            <Twitter className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
          <Link href="#" aria-label="GitHub">
            <Github className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
          <Link href="https://www.instagram.com/santosh.r.k__?igsh=dDA4eXY0Z2l5bXZj" aria-label="Instagram">
            <Instagram className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

    