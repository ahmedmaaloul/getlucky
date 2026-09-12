
import Link from "next/link";
import { Clover } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";


export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Clover className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Get<span className="text-primary">Lucky</span></span>
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20 uppercase tracking-wider">
                        Demo Project
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" className="hidden md:flex" asChild>
                        <Link href="/about">About</Link>
                    </Button>
                    <Button variant="default" size="sm" asChild>
                        <a href="https://ahmedmaaloul.com" target="_blank" rel="noopener noreferrer">Built by Ahmed</a>
                    </Button>
                </div>
            </div>
        </nav>
    );
}
