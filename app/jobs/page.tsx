// app/jobs/page.tsx
// Campaign Dashboard - Main page for getlucky.jobs

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './jobs.module.css';

interface Campaign {
    id: string;
    name: string;
    targetTitle: string;
    targetLocation: string | null;
    status: string;
    isActive: boolean;
    createdAt: string;
    _count: { applications: number };
    masterProfile: { fullName: string };
}

interface QuotaData {
    quota: {
        canSendApplication: boolean;
        remaining: number;
    };
    limits: {
        appsPerDay: number;
        maxCampaigns: number;
    };
    usage: {
        applicationsToday: number;
        activeCampaigns: number;
    };
}

export default function JobsDashboard() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);



    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [campaignsRes, quotaRes] = await Promise.all([
                fetch('/api/jobs/campaigns'),
                fetch('/api/jobs/quota'),
            ]);

            if (campaignsRes.ok) {
                const data = await campaignsRes.json();
                setCampaigns(data.campaigns || []);
            }
            if (quotaRes.ok) {
                setQuota(await quotaRes.json());
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function generatePdf(campaignId: string) {
        const res = await fetch(`/api/jobs/campaigns/${campaignId}/generate-pdf`, {
            method: 'POST',
        });

        if (res.ok) {
            const data = await res.json();
            // Download the PDF
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${data.pdfBase64}`;
            link.download = `resume-${campaignId}.pdf`;
            link.click();
            loadData();
        }
    }

    const statusColors: Record<string, string> = {
        SETUP: 'oklch(0.75 0.14 85)',      // Gold
        TAILORING: 'oklch(0.6 0.15 250)',   // Blue
        READY: 'oklch(0.55 0.15 160)',      // Primary green
        ACTIVE: 'oklch(0.55 0.15 160)',     // Primary green
        PAUSED: 'oklch(0.5 0 0)',           // Gray
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading campaigns...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>🍀 GetLucky.Jobs</h1>
                    <p className={styles.subtitle}>Automated Reverse Recruiting</p>
                </div>
                <Link href="/jobs/profile" className={styles.profileLink}>
                    Edit Profile →
                </Link>
            </header>

            {/* Quota Stats */}
            {quota && (
                <div className={styles.quotaBar}>
                    <div className={styles.quotaStat}>
                        <span className={styles.quotaLabel}>Today</span>
                        <span className={styles.quotaValue}>
                            {quota.usage.applicationsToday}/{quota.limits.appsPerDay}
                        </span>
                    </div>
                    <div className={styles.quotaDivider} />
                    <div className={styles.quotaStat}>
                        <span className={styles.quotaLabel}>Campaigns</span>
                        <span className={styles.quotaValue}>
                            {quota.usage.activeCampaigns}/{quota.limits.maxCampaigns}
                        </span>
                    </div>
                    <div className={styles.quotaDivider} />
                    <div className={styles.quotaStat}>
                        <span className={styles.quotaLabel}>Status</span>
                        <span
                            className={styles.quotaStatus}
                            data-status={quota.quota.canSendApplication ? 'ok' : 'limit'}
                        >
                            {quota.quota.canSendApplication ? '✓ Ready' : '⏳ Limit'}
                        </span>
                    </div>
                </div>
            )}

            {/* Campaigns Grid */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Your Campaigns</h2>
                    <button
                        className={styles.createBtn}
                        onClick={() => setShowCreateModal(true)}
                        disabled={!!(quota && quota.usage.activeCampaigns >= quota.limits.maxCampaigns)}
                    >
                        + New Campaign
                    </button>
                </div>

                {campaigns.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📋</div>
                        <h3>No campaigns yet</h3>
                        <p>Create your first campaign to start job hunting</p>
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Campaign
                        </button>
                    </div>
                ) : (
                    <div className={styles.campaignsGrid}>
                        {campaigns.map((campaign) => (
                            <div key={campaign.id} className={styles.campaignCard}>
                                <div className={styles.cardHeader}>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ background: statusColors[campaign.status] }}
                                    >
                                        {campaign.status}
                                    </span>
                                    <span className={styles.appCount}>
                                        {campaign._count.applications} apps
                                    </span>
                                </div>

                                <h3 className={styles.campaignName}>{campaign.name}</h3>
                                <p className={styles.campaignTarget}>
                                    {campaign.targetTitle}
                                    {campaign.targetLocation && ` • ${campaign.targetLocation}`}
                                </p>

                                <div className={styles.cardActions}>
                                    {campaign.status === 'SETUP' && (
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => generatePdf(campaign.id)}
                                        >
                                            🎯 Generate CV
                                        </button>
                                    )}
                                    {campaign.status === 'READY' && (
                                        <>
                                            <button className={styles.actionBtn} onClick={() => generatePdf(campaign.id)}>
                                                📄 Download CV
                                            </button>
                                            <button className={styles.actionBtnPrimary}>
                                                🚀 Start Campaign
                                            </button>
                                        </>
                                    )}
                                    {campaign.status === 'ACTIVE' && (
                                        <button className={styles.actionBtnSecondary}>
                                            ⏸ Pause
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateCampaignModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

interface CreateModalProps {
    onClose: () => void;
    onCreated: () => void;
}

function CreateCampaignModal({ onClose, onCreated }: CreateModalProps) {
    const [name, setName] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetLocation, setTargetLocation] = useState('');
    const [keywords, setKeywords] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/jobs/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    targetTitle,
                    targetLocation: targetLocation || null,
                    targetKeywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create campaign');
            }

            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>New Campaign</h2>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Campaign Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Data Science Search"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Target Job Title</label>
                        <input
                            type="text"
                            value={targetTitle}
                            onChange={(e) => setTargetTitle(e.target.value)}
                            placeholder="Senior Data Scientist"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Location (optional)</label>
                        <input
                            type="text"
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value)}
                            placeholder="Berlin, Germany"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Keywords (comma-separated)</label>
                        <input
                            type="text"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder="Python, Machine Learning, TensorFlow"
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.cancelBtn}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className={styles.submitBtn}>
                            {submitting ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
