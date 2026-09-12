'use client';

import { useEffect, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, Lock, Search, Sparkles } from 'lucide-react';

import { Input } from './ui/input';
import { Button } from './ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { JobCard } from './job-card';

import { getJobs, type JobsResult } from '@/app/actions';
import type { NormalizedJob } from '@/lib/sources/types';

const PAGE_SIZE = 20;

/**
 * Countries the normalizer can actually resolve. Offering a filter for a value
 * nothing is ever tagged with would just return an empty page.
 */
const COUNTRIES = [
    'Germany',
    'France',
    'United Kingdom',
    'United States',
    'Canada',
    'Netherlands',
    'Switzerland',
    'Ireland',
    'Spain',
    'Portugal',
    'Poland',
    'Sweden',
    'Australia',
    'Japan',
    'United Arab Emirates',
];

export function JobList() {
    const [jobs, setJobs] = useState<NormalizedJob[]>([]);
    const [meta, setMeta] = useState<Omit<JobsResult, 'data'> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, startFetch] = useTransition();

    const [query, setQuery] = useState('');
    const [submittedQuery, setSubmittedQuery] = useState('');
    const [country, setCountry] = useState('All');
    const [language, setLanguage] = useState('All');
    const [seniority, setSeniority] = useState('All');
    const [visaOnly, setVisaOnly] = useState(false);
    const [remoteOnly, setRemoteOnly] = useState(false);

    const [skip, setSkip] = useState(0);
    const [showQuotaDialog, setShowQuotaDialog] = useState(false);

    const filters = {
        country,
        language,
        seniority,
        visaSponsorship: visaOnly,
        remote: remoteOnly,
    };

    // A filter change restarts pagination from the top. `cancelled` guards
    // against a slow earlier request landing after a newer one and overwriting
    // results the visitor has already moved on from.
    useEffect(() => {
        let cancelled = false;

        startFetch(async () => {
            const result = await getJobs(submittedQuery, {
                country,
                language,
                seniority,
                visaSponsorship: visaOnly,
                remote: remoteOnly,
                skip: 0,
                take: PAGE_SIZE,
            });
            if (cancelled) return;

            const { data, ...rest } = result;
            setJobs(data);
            setMeta(rest);
            setSkip(PAGE_SIZE);
            if (result.quotaExceeded) setShowQuotaDialog(true);
        });

        return () => {
            cancelled = true;
        };
    }, [submittedQuery, country, language, seniority, visaOnly, remoteOnly]);

    /** "Load more" appends; it runs from a click, never from an effect. */
    async function loadMore() {
        setLoadingMore(true);
        const result = await getJobs(submittedQuery, { ...filters, skip, take: PAGE_SIZE });

        const { data, ...rest } = result;
        setJobs((previous) => [...previous, ...data]);
        setMeta(rest);
        setSkip((previous) => previous + PAGE_SIZE);
        setLoadingMore(false);
    }

    const loading = isFetching && jobs.length === 0;

    const degraded = meta?.sources.filter((source) => source.error) ?? [];

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <div className="sticky top-24 z-30 p-4 -mx-4 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/5 ring-1 ring-black/5 transition-all">
                <div className="flex flex-col gap-4">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            setSubmittedQuery(query);
                        }}
                        className="flex gap-4"
                    >
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-foreground transition-colors" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search for your lucky break..."
                                className="pl-11 h-12 rounded-full bg-background/50 border-border/40 focus-visible:ring-foreground/20 transition-all hover:bg-background/80"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 px-8 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-lg shadow-black/5 font-medium"
                        >
                            Search
                        </Button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                        <Select value={country} onValueChange={setCountry}>
                            <SelectTrigger className="w-[170px] h-10 rounded-full bg-background/50 border-border/40 hover:bg-background/80 transition-all">
                                <SelectValue placeholder="Country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Countries</SelectItem>
                                {COUNTRIES.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
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
                                <SelectItem value="Spanish">Spanish</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={seniority} onValueChange={setSeniority}>
                            <SelectTrigger className="w-[140px] h-10 rounded-full bg-background/50 border-border/40 hover:bg-background/80 transition-all">
                                <SelectValue placeholder="Seniority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Levels</SelectItem>
                                <SelectItem value="Intern">Intern</SelectItem>
                                <SelectItem value="Junior">Junior</SelectItem>
                                <SelectItem value="Mid">Mid-Level</SelectItem>
                                <SelectItem value="Senior">Senior</SelectItem>
                                <SelectItem value="Lead">Lead</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant={remoteOnly ? 'default' : 'outline'}
                            onClick={() => setRemoteOnly((value) => !value)}
                            className={`h-10 rounded-full transition-all border-border/40 ${remoteOnly ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-background/50 hover:bg-background/80'}`}
                        >
                            Remote
                        </Button>

                        <Button
                            variant={visaOnly ? 'default' : 'outline'}
                            onClick={() => setVisaOnly((value) => !value)}
                            title="Only postings that explicitly mention sponsorship"
                            className={`h-10 rounded-full transition-all border-border/40 ${visaOnly ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-background/50 hover:bg-background/80'}`}
                        >
                            Visa Sponsored
                        </Button>
                    </div>

                    {meta && !loading && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                                {meta.total} opening{meta.total === 1 ? '' : 's'} from{' '}
                                {meta.sources.filter((source) => !source.error).length} live source
                                {meta.sources.length === 1 ? '' : 's'}
                            </span>
                            {meta.aiEnhanced && (
                                <span className="inline-flex items-center gap-1 text-primary">
                                    <Sparkles className="h-3 w-3" /> AI-expanded query
                                </span>
                            )}
                            {degraded.length > 0 && (
                                <span
                                    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-500"
                                    title={degraded.map((s) => `${s.name}: ${s.error}`).join('\n')}
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    {degraded.length} source unavailable
                                </span>
                            )}
                        </div>
                    )}
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
                                jobs.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: (index % PAGE_SIZE) * 0.05 }}
                                    >
                                        <JobCard job={job} />
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 text-muted-foreground">
                                    {meta?.error ?? 'No jobs found. Try adjusting your search.'}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {meta?.hasMore && jobs.length > 0 && (
                        <div className="flex justify-center pt-4 pb-6">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => void loadMore()}
                                disabled={loadingMore}
                                className="rounded-full px-8 h-12 bg-background/50 backdrop-blur hover:bg-foreground hover:text-background transition-all border-border/40 font-medium"
                            >
                                {loadingMore && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Load More Jobs
                            </Button>
                        </div>
                    )}

                    {/* Several sources grant API access on condition of a credit
                        link. Rendering it is part of using them honestly. */}
                    {meta && meta.attributions.length > 0 && (
                        <p className="text-center text-xs text-muted-foreground pb-8">
                            Job data from{' '}
                            {meta.attributions.map((attribution, index) => (
                                <span key={attribution.url}>
                                    {index > 0 && ', '}
                                    <a
                                        href={attribution.url}
                                        target="_blank"
                                        rel={attribution.rel}
                                        className="underline hover:text-foreground"
                                    >
                                        {attribution.text.replace(/^Sourced from /, '')}
                                    </a>
                                </span>
                            ))}
                        </p>
                    )}
                </div>
            )}

            <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <DialogTitle className="text-center text-xl">AI daily limit reached</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            The optional AI layer that expands your query into related terms has a
                            daily budget. Search itself is unaffected — these results are live.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 text-center text-sm text-muted-foreground">
                        <p>
                            Running your own copy removes the limit entirely: the AI layer is
                            optional and every job source is free and key-free.
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button variant="default" onClick={() => setShowQuotaDialog(false)} asChild>
                            <a
                                href="https://github.com/ahmedmaaloul/getlucky#quick-start"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Run it yourself
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
