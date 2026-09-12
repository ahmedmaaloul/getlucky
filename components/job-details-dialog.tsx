'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Banknote, Building2, Calendar, Clock, ExternalLink, Globe, MapPin } from 'lucide-react';

import { cleanJobTitle, formatRelativeAge, formatSalaryLabel } from '@/lib/format';
import type { NormalizedJob } from '@/lib/sources/types';

interface JobDetailsDialogProps {
    job: NormalizedJob;
    children: React.ReactNode;
}

export function JobDetailsDialog({ job, children }: JobDetailsDialogProps) {
    const salary = formatSalaryLabel(job);
    const age = formatRelativeAge(job.postedAt);

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-card/95 backdrop-blur-2xl border-border/40 overflow-hidden shadow-2xl shadow-black/10">
                <DialogHeader className="p-6 pb-4 border-b border-border/40">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-start">
                            <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-0.5 h-auto bg-background/50 backdrop-blur border-border/40 text-muted-foreground font-medium"
                            >
                                {job.sourceName}
                            </Badge>
                        </div>
                        <div className="flex gap-4 items-start">
                            <Avatar className="h-16 w-16 rounded-xl border border-border/40 bg-white shrink-0 shadow-sm">
                                <AvatarImage
                                    src={job.companyLogo || ''}
                                    alt={job.company}
                                    className="object-contain p-2"
                                />
                                <AvatarFallback className="rounded-xl bg-muted/50 text-muted-foreground/50">
                                    <Building2 className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-foreground mb-2 leading-tight tracking-tight">
                                    {cleanJobTitle(job.title)}
                                </DialogTitle>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-4 w-4 opacity-70" />
                                    <span className="font-medium">{job.company}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                        <div className="flex items-center gap-1.5">
                            {job.remote ? (
                                <Globe className="h-4 w-4 opacity-70" />
                            ) : (
                                <MapPin className="h-4 w-4 opacity-70" />
                            )}
                            <span>{job.location || (job.remote ? 'Remote' : 'Location not stated')}</span>
                        </div>
                        {salary && (
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Banknote className="h-4 w-4 opacity-70" />
                                <span>{salary}</span>
                            </div>
                        )}
                        {job.employmentType && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 opacity-70" />
                                <span>{job.employmentType}</span>
                            </div>
                        )}
                        {age && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 opacity-70" />
                                <span>{age}</span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="space-y-6">
                        {job.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {job.tags.slice(0, 20).map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40 font-medium"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Rendered as text, never as markup. Descriptions are
                            third-party content; injecting them as HTML would hand
                            any source a script tag on our origin. */}
                        {job.description ? (
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {job.description}
                            </p>
                        ) : (
                            <p className="text-sm italic opacity-70">
                                No description provided by the source. Open the posting for the full text.
                            </p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-border/40 bg-background/80 backdrop-blur-xl space-y-3">
                    <Button
                        className="w-full gap-2 rounded-full text-lg h-12 shadow-lg shadow-black/5 bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold"
                        asChild
                    >
                        <a href={job.applyUrl || job.url} target="_blank" rel="noopener noreferrer">
                            Apply Now <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                    {job.attribution && (
                        <p className="text-center text-xs text-muted-foreground">
                            {job.attribution.text} —{' '}
                            {/* Deliberately followed: Remote OK's API terms ask for it. */}
                            <a
                                href={job.attribution.url}
                                target="_blank"
                                rel={job.attribution.rel}
                                className="underline hover:text-foreground"
                            >
                                {job.attribution.url.replace(/^https?:\/\//, '')}
                            </a>
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
