'use client';

// components/mode-switcher.tsx
// Toggle between AI Agent and Manual Search modes

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Search, ChevronDown } from 'lucide-react';
import { features } from '@/lib/config/features';

type Mode = 'agent' | 'search';

const modes = [
    {
        id: 'agent' as Mode,
        label: 'Agent Mode',
        shortLabel: 'Agent',
        icon: Bot,
        href: '/jobs',
        description: 'AI applies for you',
        enabled: features.ENABLE_AI_AGENT,
    },
    {
        id: 'search' as Mode,
        label: 'Manual Search',
        shortLabel: 'Search',
        icon: Search,
        href: '/',
        description: 'Browse jobs yourself',
        enabled: features.ENABLE_MANUAL_SEARCH,
    },
];

export function ModeSwitcher() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Determine current mode from URL
    const currentMode: Mode = pathname.startsWith('/jobs') ? 'agent' : 'search';

    // Filter to only enabled modes
    const enabledModes = modes.filter((m) => m.enabled);

    // If only one mode is enabled, don't show switcher
    if (enabledModes.length <= 1) {
        return null;
    }

    const current = modes.find((m) => m.id === currentMode) || modes[0];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium"
            >
                <current.icon className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">{current.shortLabel}</span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-card border border-border rounded-xl shadow-lg z-50 backdrop-blur-xl">
                        {enabledModes.map((mode) => {
                            const isActive = mode.id === currentMode;
                            return (
                                <Link
                                    key={mode.id}
                                    href={mode.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors ${isActive ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        <mode.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                                            {mode.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {mode.description}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                    )}
                                </Link>
                            );
                        })}

                        <div className="border-t border-border mt-2 pt-2 px-4">
                            <p className="text-xs text-muted-foreground">
                                {currentMode === 'agent'
                                    ? '🤖 AI sends personalized applications'
                                    : '🔍 Browse and apply manually'
                                }
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
