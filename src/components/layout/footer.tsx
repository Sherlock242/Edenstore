
import Link from "next/link";
import { Github, Twitter, Instagram, Tshirt } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row">
        <div className="flex items-center space-x-2">
          <Tshirt className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-lg">
            EdenStore
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
          <Link href="#" aria-label="Instagram">
            <Instagram className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
