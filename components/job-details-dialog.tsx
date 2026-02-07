
"use client";

import { Job } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Building2, Calendar, ExternalLink, Banknote, Clock, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface JobDetailsDialogProps {
    job: Job;
    children: React.ReactNode;
}

export function JobDetailsDialog({ job, children }: JobDetailsDialogProps) {
    // Parse tags if they are a string (from JSON.stringify)
    let tags: string[] = [];
    try {
        if (typeof job.tags === 'string') {
            tags = JSON.parse(job.tags);
        } else if (Array.isArray(job.tags)) {
            tags = job.tags;
        }
    } catch (e) {
        tags = [];
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-card/95 backdrop-blur-2xl border-border/40 overflow-hidden shadow-2xl shadow-black/10">
                <DialogHeader className="p-6 pb-4 border-b border-border/40">
                    <div className="flex flex-col gap-4">
                        {job.source && (
                            <div className="flex justify-start">
                                <Badge variant="outline" className="capitalize text-xs px-2.5 py-0.5 h-auto bg-background/50 backdrop-blur border-border/40 text-muted-foreground font-medium">
                                    {job.source}
                                </Badge>
                            </div>
                        )}
                        <div className="flex gap-4 items-start">
                            <Avatar className="h-16 w-16 rounded-xl border border-border/40 bg-white shrink-0 shadow-sm">
                                <AvatarImage src={job.logoUrl || ''} alt={job.company} className="object-contain p-2" />
                                <AvatarFallback className="rounded-xl bg-muted/50 text-muted-foreground/50">
                                    <Building2 className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-foreground mb-2 leading-tight tracking-tight">{job.title}</DialogTitle>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-4 w-4 opacity-70" />
                                    <span className="font-medium">{job.company}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 opacity-70" />
                            <span>{job.location || 'Remote'}</span>
                        </div>
                        {job.salary && (
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Banknote className="h-4 w-4 opacity-70" />
                                <span>{job.salary}</span>
                            </div>
                        )}
                        {job.jobType && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 opacity-70" />
                                <span>{job.jobType}</span>
                            </div>
                        )}
                        {job.postedAt && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 opacity-70" />
                                <span>{formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}</span>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="space-y-6">
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="bg-muted/50 text-muted-foreground hover:bg-muted border border-border/40 font-medium">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                            {job.description ? (
                                <div dangerouslySetInnerHTML={{ __html: job.description }} />
                            ) : (
                                <p className="italic opacity-70">
                                    No detailed description available. Please visit the job post for more information.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border/40 bg-background/80 backdrop-blur-xl">
                    <Button className="w-full gap-2 rounded-full text-lg h-12 shadow-lg shadow-black/5 bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold" asChild>
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                            Apply Now <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
