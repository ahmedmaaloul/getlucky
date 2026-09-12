'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Cookie, Lock } from "lucide-react";

export function PrivacyDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors text-left">
                    Privacy & Legal
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        Privacy & Compliance
                    </DialogTitle>
                    <DialogDescription>
                        GetLucky is a public demo. Here is how we handle your data.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Cookie className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm">No Cookies</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                We do not use tracking cookies, analytics, or third-party pixels.
                                We respect your &quot;Do Not Track&quot; signals by default.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Lock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <h4 className="font-medium text-sm">Ephemeral Daily IDs + Auto-Deletion</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                We use <strong>Daily Rotating Hashes</strong>. Your anonymous ID changes every 24 hours.
                                We cannot track your history across days.
                                Additionally, all data older than 24 hours is <strong>automatically verified and deleted</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p>
                            <strong>Legal Basis (GDPR):</strong> Legitimate Interest (Security & Abuse Prevention).
                        </p>
                        <p className="mt-1">
                            <strong>Data Retention:</strong> Anonymized logs are cleared periodically.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => document.body.click()}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
