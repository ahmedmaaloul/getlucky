'use client'

import { useState, useEffect } from 'react'
import { Job } from "@prisma/client"
import { JobCard } from "./job-card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, RefreshCw, Lock } from "lucide-react"
import { getJobs, syncJobs } from "@/app/actions"
import { motion, AnimatePresence } from "framer-motion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

export function JobList() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [query, setQuery] = useState("")
    const [country, setCountry] = useState("All")
    const [language, setLanguage] = useState("All")
    const [seniority, setSeniority] = useState("All")
    const [visaOnly, setVisaOnly] = useState(false)
    const [skip, setSkip] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [showQuotaDialog, setShowQuotaDialog] = useState(false)
    const TAKE = 20

    const fetchJobs = async (reset = false) => {
        if (reset) {
            setLoading(true)
            setSkip(0)
        }

        const currentSkip = reset ? 0 : skip
        const result = await getJobs(query, {
            country,
            language,
            seniority,
            visaSponsorship: visaOnly,
            skip: currentSkip,
            take: TAKE
        })

        if (result.success && result.data) {
            if (reset) {
                setJobs(result.data)
            } else {
                setJobs(prev => [...prev, ...result.data])
            }
            setHasMore(result.data.length === TAKE)
            setSkip(prev => reset ? TAKE : prev + TAKE)

            // Check Quota
            if ((result as any).quotaExceeded) {
                setShowQuotaDialog(true)
            }
        }
        setLoading(false)
    }

    const handleSync = async () => {
        setSyncing(true)
        await syncJobs()
        await fetchJobs(true)
        setSyncing(false)
    }

    useEffect(() => {
        fetchJobs(true)
    }, [country, language, seniority, visaOnly])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchJobs(true)
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <div className="sticky top-24 z-30 p-4 -mx-4 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/5 ring-1 ring-black/5 transition-all">
                <div className="flex flex-col gap-4">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-foreground transition-colors" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search for your lucky break..."
                                className="pl-11 h-12 rounded-full bg-background/50 border-border/40 focus-visible:ring-foreground/20 transition-all hover:bg-background/80"
                            />
                        </div>
                        <Button type="submit" size="lg" className="h-12 px-8 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-lg shadow-black/5 font-medium">
                            Search
                        </Button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                        <Select value={country} onValueChange={setCountry}>
                            <SelectTrigger className="w-[140px] h-10 rounded-full bg-background/50 border-border/40 hover:bg-background/80 transition-all">
                                <SelectValue placeholder="Country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Countries</SelectItem>
                                <SelectItem value="Germany">Germany</SelectItem>
                                <SelectItem value="USA">USA</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
                                <SelectItem value="Japan">Japan</SelectItem>
                                <SelectItem value="UK">UK</SelectItem>
                                <SelectItem value="UAE">UAE</SelectItem>
                                <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                                <SelectItem value="France">France</SelectItem>
                                <SelectItem value="Global/Remote">Global/Remote</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-[140px] h-10 rounded-full bg-background/50 border-border/40 hover:bg-background/80 transition-all">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Languages</SelectItem>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="German">German</SelectItem>
                                <SelectItem value="French">French</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={seniority} onValueChange={setSeniority}>
                            <SelectTrigger className="w-[140px] h-10 rounded-full bg-background/50 border-border/40 hover:bg-background/80 transition-all">
                                <SelectValue placeholder="Seniority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Levels</SelectItem>
                                <SelectItem value="Junior">Junior</SelectItem>
                                <SelectItem value="Mid">Mid-Level</SelectItem>
                                <SelectItem value="Senior">Senior</SelectItem>
                                <SelectItem value="Lead">Lead</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant={visaOnly ? "default" : "outline"}
                            onClick={() => setVisaOnly(!visaOnly)}
                            className={`h-10 rounded-full transition-all border-border/40 ${visaOnly ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-background/50 hover:bg-background/80'}`}
                        >
                            Visa Sponsored
                        </Button>

                        <div className="flex-1" />

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-full border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all"
                            onClick={handleSync}
                            disabled={syncing}
                            title="Sync Jobs"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {loading && jobs.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {jobs.length > 0 ? (
                                jobs.map((job, i) => (
                                    <motion.div
                                        key={`${job.id}-${i}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: (i % TAKE) * 0.05 }}
                                    >
                                        <JobCard job={job} />
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 text-muted-foreground">
                                    No jobs found. Try adjusting your search.
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {hasMore && jobs.length > 0 && (
                        <div className="flex justify-center pt-4 pb-12">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => fetchJobs(false)}
                                className="rounded-full px-8 h-12 bg-background/50 backdrop-blur hover:bg-foreground hover:text-background transition-all border-border/40 font-medium"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Load More Jobs
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Quota Exceeded Dialog */}
            <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <DialogTitle className="text-center text-xl">Demo Limits Reached</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            To ensure fair access for everyone during this public demo, we've limited the number of AI-powered searches.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-sm text-muted-foreground space-y-4">
                        <p>
                            You've hit the daily limit for AI enhancements. Basic search is still available!
                        </p>
                        <div className="p-4 bg-muted/50 rounded-lg text-foreground">
                            <p className="font-medium mb-1">Passionate about this project?</p>
                            <p className="text-xs text-muted-foreground">
                                I'd love to give you a full unrestricted demo. Please reach out!
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button type="button" variant="default" onClick={() => setShowQuotaDialog(false)} asChild>
                            <a href="mailto:ahmed.maaloul@myyahoo.com?subject=GetLucky%20Demo%20Request">
                                Request Full Demo
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
