"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Globe, Sparkles, Clover, Zap } from "lucide-react";
import { JobList } from "@/components/job-list";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-30 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/40 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-chart-2/40 rounded-full blur-[128px] animate-pulse delay-1000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm rounded-full border-primary/20 bg-primary/10 text-primary backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse" />
            Your Lucky Break Awaits
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 drop-shadow-sm"
        >
          Get <span className="text-primary relative inline-block">
            Lucky
            <svg className="absolute -bottom-2 left-0 w-full h-2 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span> with <br />
          Your Next <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-primary to-emerald-400 bg-300% animate-gradient">Dream Job</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
        >
          Stop searching, start finding. We aggregate the best tech opportunities from across the globe, so you can get lucky.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="w-full relative z-10"
        >
          <JobList />
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Clover,
              title: "Serendipity Engine",
              desc: "Our algorithms work in the background to bring the best opportunities directly to you."
            },
            {
              icon: Globe,
              title: "Global Reach",
              desc: "From Berlin to Dubai, we scout the top tech hubs so you don't have to."
            },
            {
              icon: Zap,
              title: "Instant Magic (Coming Soon)",
              desc: "Generate tailored cover letters in seconds. It feels like luck, but it's AI."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group p-8 rounded-2xl border border-border/50 bg-card/50 backdrop-blur hover:bg-card/80 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
