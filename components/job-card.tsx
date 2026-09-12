'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ExternalLink, Eye, Globe, MapPin, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { cleanJobTitle, formatRelativeAge, formatSalaryLabel } from '@/lib/format';
import type { NormalizedJob } from '@/lib/sources/types';
import { JobDetailsDialog } from './job-details-dialog';

interface JobCardProps {
    job: NormalizedJob;
}

export function JobCard({ job }: JobCardProps) {
    const title = cleanJobTitle(job.title);
    const location = job.location || (job.remote ? 'Remote' : 'Location not stated');
    const salary = formatSalaryLabel(job);
    const age = formatRelativeAge(job.postedAt);

    return (
        <Card className="h-full flex flex-col hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-500 border-border/40 bg-card/40 backdrop-blur-md relative overflow-hidden group text-left">
            <div className="absolute inset-0 p-[1px] rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <CardHeader className="pb-3 relative z-10 space-y-3">
                <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-2 w-full">
                        <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 h-5 bg-background/50 backdrop-blur border-border/40 text-muted-foreground shadow-sm font-medium tracking-wide"
                        >
                            {job.sourceName}
                        </Badge>
                        {age && (
                            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider ml-auto font-mono">
                                {age}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-4 items-start w-full">
                        <div className="relative shrink-0 group/avatar">
                            <Avatar className="h-14 w-14 rounded-2xl border border-white/10 bg-white/90 shadow-sm transition-transform duration-500 group-hover/avatar:scale-105 group-hover/avatar:rotate-3">
                                <AvatarImage
                                    src={job.companyLogo || ''}
                                    alt={job.company}
                                    className="object-contain p-2"
                                />
                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 text-muted-foreground/50">
                                    <Building2 className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                            <CardTitle
                                className="text-xl font-bold text-foreground transition-colors group-hover:text-primary line-clamp-2 leading-tight tracking-tight mb-2 text-left"
                                title={title}
                            >
                                {title}
                            </CardTitle>

                            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 text-foreground/80 font-medium">
                                    <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                                    <span className="truncate">{job.company}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs opacity-70">
                                    {job.remote ? (
                                        <Globe className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span className="truncate">{location}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pb-4 flex-1 relative z-10">
                <div className="flex flex-wrap gap-2 justify-start">
                    {/* Only shown when the posting actually says so — an unstated
                        policy is never rendered as a refusal. */}
                    {job.visaSponsorship === true && (
                        <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 pl-2 pr-2.5 h-6 text-[11px] font-semibold transition-colors hover:bg-emerald-500/20"
                        >
                            <Sparkles className="h-3 w-3" /> Visa Sponsorship
                        </Badge>
                    )}
                    {job.seniority && (
                        <Badge
                            variant="outline"
                            className="border-border/40 bg-muted/30 text-muted-foreground h-6 text-[11px] font-medium px-2.5"
                        >
                            {job.seniority}
                        </Badge>
                    )}
                    {salary && (
                        <Badge
                            variant="outline"
                            className="border-border/40 bg-muted/30 text-muted-foreground h-6 text-[11px] font-medium px-2.5"
                        >
                            {salary}
                        </Badge>
                    )}

                    {job.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/5 text-primary/80 border border-primary/10"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="pt-4 pb-5 px-6 border-t border-border/10 relative z-10 bg-gradient-to-b from-transparent to-background/5 flex justify-between gap-3 mt-auto">
                <JobDetailsDialog job={job}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs gap-2 text-muted-foreground hover:text-foreground font-medium hover:bg-white/5 transition-colors group/btn"
                    >
                        <Eye className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform" />
                        Details
                    </Button>
                </JobDetailsDialog>

                <Button
                    size="sm"
                    className="h-9 text-xs gap-2 rounded-full px-6 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-semibold border-0 group/apply"
                    asChild
                >
                    <a href={job.applyUrl || job.url} target="_blank" rel="noopener noreferrer">
                        Apply Now{' '}
                        <ExternalLink className="h-3.5 w-3.5 group-hover/apply:translate-x-0.5 transition-transform" />
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
