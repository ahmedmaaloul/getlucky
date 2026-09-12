import Link from 'next/link';
import { Github, Globe } from 'lucide-react';
import { PrivacyDialog } from './privacy-dialog';

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm mt-auto">
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <div className="font-bold text-xl tracking-tight">
                            Get<span className="text-primary">Lucky</span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Live tech openings aggregated from public job APIs and company job boards. Searchable by humans and by agents over MCP.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Product</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/" className="hover:text-primary transition-colors">Jobs</Link></li>
                            <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/legal" className="hover:text-primary transition-colors">Disclaimer</Link></li>
                            <li><PrivacyDialog /></li>
                            <li><Link href="/legal" className="hover:text-primary transition-colors">Takedown Request</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} GetLucky. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <a href="https://github.com/ahmedmaaloul/getlucky" aria-label="Source on GitHub" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Github className="h-4 w-4" />
                        </a>
                        <a href="https://ahmedmaaloul.com" aria-label="Ahmed Maaloul's portfolio" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <Globe className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
