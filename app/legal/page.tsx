import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Info, Code } from 'lucide-react';

export default function LegalPage() {
    return (
        <div className="min-h-screen pt-32 pb-20 px-6 md:px-12 max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">About GetLucky</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    A project built to solve the fragmentation of tech job markets.
                </p>
            </div>

            <div className="grid gap-8">
                {/* Project Info */}
                <Card className="bg-card/50 backdrop-blur border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Code className="h-5 w-5 text-primary" />
                            The Engineering
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-4">
                        <p>
                            <strong>GetLucky</strong> is an open-source aggregator built with Next.js, Tailwind CSS and the Model Context Protocol. It reads public, documented job APIs and companies&apos; own Greenhouse, Lever and Ashby boards — no key and no account required.
                        </p>
                        <p>
                            It solves the problem of &quot;tab fatigue&quot; by unifying job listings from multiple fragmented sources into a single, high-performance interface.
                        </p>
                    </CardContent>
                </Card>

                {/* Privacy Note */}
                <Card className="bg-card/50 backdrop-blur border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Shield className="h-5 w-5 text-emerald-500" />
                            Privacy & Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-4">
                        <p>
                            This project is a demonstration of modern web engineering. No personal user data is stored or tracked.
                        </p>
                        <p>
                            Job data is fetched live from public APIs and cached briefly so that a burst of visitors does not become a burst of requests upstream. Sources whose terms ask for attribution are credited on every listing they provide.
                        </p>
                    </CardContent>
                </Card>

                {/* Disclaimer */}
                <Card className="bg-card/50 backdrop-blur border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Info className="h-5 w-5 text-blue-500" />
                            Disclaimer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-4">
                        <p>
                            All job listings are the property of their respective employers and sources, and link back to the original posting. GetLucky stores no listings of its own and no personal data about visitors.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
