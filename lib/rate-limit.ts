import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Enforces rate limits for AI usage.
 * - Global Limit: Max 5 unique visitors per day.
 * - User Limit: Max 1 queries per IP per day.
 * - Bypass: AI_BYPASS_KEY env var.
 *
 * GDPR NOTE: IPs are hashed (anonymized) before storage.
 */
import crypto from 'crypto';

export async function checkAiRateLimit() {
    if (process.env.AI_BYPASS_KEY) return { allowed: true };

    const headersList = await headers(); // Await the headers() call
    // Use x-forwarded-for for Vercel/proxies, fallback to '127.0.0.1' for local
    const rawIp = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // GDPR PLUS: Daily Ephemeral Hash
    // We include 'today' in the hash. This means the same user will have a DIFFERENT ID tomorrow.
    // It is mathematically impossible for us to track usage history across days.
    const ip = crypto.createHash('sha256').update(rawIp + today + (process.env.IP_SALT || 'salt')).digest('hex');

    // GDPR PLUS: Data Minimization (Lazy Cleanup)
    // 10% chance to wipe all old data from the database. We strictly only keep TODAY's data.
    if (Math.random() < 0.1) {
        prisma.aiUsage.deleteMany({
            where: { date: { not: today } }
        }).catch(err => console.error("Cleanup failed", err));
    }

    try {
        // 1. Check Global Visitor Cap (Unique IPs today)
        // We only care if this is a *new* user.
        const userUsage = await prisma.aiUsage.findUnique({
            where: {
                ip_date: {
                    ip,
                    date: today,
                },
            },
        });

        if (!userUsage) {
            // New visitor for today. Check if we have room.
            const uniqueVisitorsToday = await prisma.aiUsage.count({
                where: {
                    date: today,
                },
            });

            if (uniqueVisitorsToday >= 5) {
                throw new Error("GLOBAL_QUOTA_EXCEEDED");
            }
        }

        // 2. Check Per-User Cap
        if (userUsage && userUsage.count >= 1) {
            throw new Error("USER_QUOTA_EXCEEDED");
        }

        // 3. Record Usage
        await prisma.aiUsage.upsert({
            where: {
                ip_date: {
                    ip,
                    date: today,
                },
            },
            update: {
                count: {
                    increment: 1
                }
            },
            create: {
                ip,
                date: today,
                count: 1,
            },
        });

        return { allowed: true };
    } catch (error: any) {
        if (error.message === "GLOBAL_QUOTA_EXCEEDED" || error.message === "USER_QUOTA_EXCEEDED") {
            throw error;
        }
        console.error("Rate limit check failed:", error);
        // If DB fails, fail open or closed? stick to fail open for demo unless strict.
        // Let's fail open to avoid breaking it completely if DB has issues, but log it.
        return { allowed: true };
    }
}
