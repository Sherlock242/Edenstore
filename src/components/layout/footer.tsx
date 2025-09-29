
import Link from "next/link";
import { Github, Twitter, Instagram } from "lucide-react";

function AkatsukiLogo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor" className="text-red-600">
            <path d="M205.1,121.2c-5.2-22.4-23.3-39-44.5-43.1C142,50.8,112.5,32,80.1,32c-44,0-80,29-80,64.7c0,27.3,16,51.3,40.1,60.9 c-2.5,3.9-4.1,8.3-4.1,13.1c0,13.2,9.9,23.9,22.3,23.9c9.3,0,17.4-6.3,20.8-14.7c11,3,22.9,4.4,35.2,4.4c40.5,0,74.5-23,82-53.7 C245.3,130.3,228.3,113,205.1,121.2z M86.1,141.2c-11.2,0-20.3-8.1-20.3-18.1c0-10,9.1-18.1,20.3-18.1c11.2,0,20.3,8.1,20.3,18.1 C106.4,133,97.3,141.2,86.1,141.2z M170.1,141.2c-11.2,0-20.3-8.1-20.3-18.1c0-10,9.1-18.1,20.3-18.1c11.2,0,20.3,8.1,20.3,18.1 C190.4,133,181.3,141.2,170.1,141.2z"/>
        </svg>
    )
}

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row">
        <div className="flex items-center space-x-2">
          <AkatsukiLogo />
          <span className="font-bold font-headline text-lg uppercase bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
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
