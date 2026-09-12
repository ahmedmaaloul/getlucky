
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Globe, ShieldAlert, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background text-foreground pt-32 pb-20 px-6 overflow-hidden">
            {/* Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-chart-2/5 rounded-full blur-[128px]" />
            </div>

            <div className="max-w-5xl mx-auto">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-4xl md:text-7xl font-bold mb-6 tracking-tight">
                        Built for the <br />
                        <span className="text-primary">Underdogs</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        The job market is broken. We&apos;re here to fix it, one lucky break at a time.
                    </p>
                </motion.div>

                {/* The Story */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold mb-6">The &quot;Blue Giant&quot; Problem</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                Hi, I&apos;m <span className="text-foreground font-semibold">Ahmed Maaloul</span>. As a graduate engineer, I faced the same wall you&apos;re facing now.
                            </p>
                            <p>
                                The &quot;Blue Website&quot; promised connection, but delivered a pay-to-win game. Ghost jobs, algorithmic bias, and premium paywalls turned job hunting into a casino where the house always wins.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-card/50 backdrop-blur border border-border/50 rounded-3xl p-8 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldAlert className="w-32 h-32" />
                        </div>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <XCircle className="text-destructive w-5 h-5" />
                            The Old Way
                        </h3>
                        <ul className="space-y-3">
                            {[
                                "Pay for 'Premium' visibility",
                                "Apply to 100s of ghost jobs",
                                "Fight against hidden algorithms",
                                "Lost in a sea of noise"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-destructive/50" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* The Solution */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="order-2 md:order-1 bg-gradient-to-br from-primary/10 to-chart-2/10 backdrop-blur border border-primary/20 rounded-3xl p-8 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-primary">
                            <CheckCircle2 className="w-5 h-5" />
                            The GetLucky Way
                        </h3>
                        <ul className="space-y-3">
                            {[
                                "100% Free & Transparent",
                                "Curated, high-quality tech roles",
                                "Direct API access (No ghost jobs)",
                                "AI-powered tools for everyone"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="order-1 md:order-2"
                    >
                        <h2 className="text-3xl font-bold mb-6">Democratizing Luck</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                I built <span className="text-primary font-semibold">GetLucky</span> to level the playing field.
                            </p>
                            <p>
                                We aggregate opportunities from the best tech hubs—Germany, UK, USA, Canada, Japan, UAE, Saudi Arabia—and put them right in front of you. No paywalls. No tricks. Just the lucky break you deserve.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Founder Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-2">Ahmed Maaloul</h3>
                        <p className="text-primary font-medium mb-6">Founder & Engineer</p>
                        <p className="text-muted-foreground mb-8">
                            &quot;I&apos;m just an engineer trying to make the world a little bit fairer for builders like us.&quot;
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <Link href="https://ahmedmaaloul.com" target="_blank">
                                    <Globe className="mr-2 h-4 w-4" />
                                    Visit My Portfolio
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="rounded-full hover:bg-secondary/50">
                                <Link href="/">
                                    Start Searching
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
