// app/jobs/campaigns/[id]/page.tsx
// Campaign detail page with applications table

'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    FileText,
    RefreshCw,
    Mail,
    Building2,
    Clock,
    CheckCircle2,
    XCircle,
    Edit3,
    Trash2,
    Upload,
    Download,
} from 'lucide-react';
import styles from './campaign.module.css';
import { PdfUpload } from '@/components/pdf-upload';

interface Application {
    id: string;
    targetCompany: {
        name: string;
    };
    recipientEmail: string | null;
    status: string;
    sentAt: string | null;
    createdAt: string;
}

interface Campaign {
    id: string;
    name: string;
    targetTitle: string;
    targetLocation: string | null;
    targetIndustry: string | null;
    targetKeywords: string[];
    cvSource: string;
    uploadedCvUrl: string | null;
    status: string;
    isActive: boolean;
    tailoredSummary: string | null;
    lastGeneratedAt: string | null;
    createdAt: string;
    applications: Application[];
    masterProfile: {
        fullName: string;
        headline: string | null;
        email: string | null;
    };
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCampaign();
    }, [id]);

    async function loadCampaign() {
        try {
            const res = await fetch(`/api/jobs/campaigns/${id}`);
            if (!res.ok) {
                throw new Error('Campaign not found');
            }
            const data = await res.json();
            setCampaign(data.campaign);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    async function generatePdf() {
        if (!campaign) return;
        setGenerating(true);
        setError('');

        try {
            const res = await fetch(`/api/jobs/campaigns/${id}/generate-pdf`, {
                method: 'POST',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Generation failed');
            }

            const data = await res.json();

            // Download the PDF
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${data.pdfBase64}`;
            link.download = `${campaign.name.replace(/\s+/g, '-')}-resume.pdf`;
            link.click();

            // Reload to get updated status
            loadCampaign();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setGenerating(false);
        }
    }

    async function updateCvUrl(url: string) {
        await fetch(`/api/jobs/campaigns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadedCvUrl: url, cvSource: 'UPLOADED' }),
        });
        loadCampaign();
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case 'SENT':
                return <CheckCircle2 className={styles.iconSuccess} />;
            case 'FAILED':
                return <XCircle className={styles.iconError} />;
            default:
                return <Clock className={styles.iconMuted} />;
        }
    }

    if (loading) {
        return <div className={styles.loading}>Loading campaign...</div>;
    }

    if (error && !campaign) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <Link href="/jobs" className={styles.backLink}>← Back to Dashboard</Link>
            </div>
        );
    }

    if (!campaign) return null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/jobs" className={styles.backLink}>
                    <ArrowLeft className={styles.icon} />
                    Back to Dashboard
                </Link>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>{campaign.name}</h1>
                    <span className={`${styles.statusBadge} ${styles[campaign.status.toLowerCase()]}`}>
                        {campaign.status}
                    </span>
                </div>
                <p className={styles.subtitle}>
                    {campaign.targetTitle}
                    {campaign.targetLocation && ` • ${campaign.targetLocation}`}
                </p>
            </header>

            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Quick Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <Building2 className={styles.statIcon} />
                    <div>
                        <span className={styles.statValue}>{campaign.applications.length}</span>
                        <span className={styles.statLabel}>Companies Targeted</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <Mail className={styles.statIcon} />
                    <div>
                        <span className={styles.statValue}>
                            {campaign.applications.filter(a => a.status === 'SENT').length}
                        </span>
                        <span className={styles.statLabel}>Emails Sent</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <FileText className={styles.statIcon} />
                    <div>
                        <span className={styles.statValue}>
                            {campaign.cvSource === 'UPLOADED' ? 'Manual' : 'AI Generated'}
                        </span>
                        <span className={styles.statLabel}>CV Source</span>
                    </div>
                </div>
            </div>

            {/* CV Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Resume / CV</h2>

                <div className={styles.cvOptions}>
                    {/* Generate AI PDF */}
                    <div className={styles.cvOption}>
                        <h3>AI-Generated Resume</h3>
                        <p>Let our AI tailor your master profile for this campaign's target role.</p>
                        <button
                            onClick={generatePdf}
                            disabled={generating}
                            className={styles.generateBtn}
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className={`${styles.icon} ${styles.spinning}`} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className={styles.icon} />
                                    Generate Tailored PDF
                                </>
                            )}
                        </button>
                        {campaign.lastGeneratedAt && (
                            <span className={styles.lastGenerated}>
                                Last generated: {new Date(campaign.lastGeneratedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {/* Upload Manual PDF */}
                    <div className={styles.cvOption}>
                        <h3>Upload Your Own CV</h3>
                        <p>Use a manually crafted PDF instead of AI generation.</p>
                        <PdfUpload
                            campaignId={campaign.id}
                            currentUrl={campaign.uploadedCvUrl}
                            onUploadComplete={updateCvUrl}
                            onRemove={() => updateCvUrl('')}
                        />
                    </div>
                </div>
            </section>

            {/* Targeted Companies Table */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Targeted Companies</h2>

                {campaign.applications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Building2 className={styles.emptyIcon} />
                        <p>No applications yet. The AI agent will add companies here when it finds matching opportunities.</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Recipient</th>
                                    <th>Status</th>
                                    <th>Sent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaign.applications.map((app) => (
                                    <tr key={app.id}>
                                        <td className={styles.companyCell}>
                                            <Building2 className={styles.cellIcon} />
                                            {app.targetCompany.name}
                                        </td>
                                        <td className={styles.emailCell}>
                                            {app.recipientEmail || '—'}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusPill} ${styles[app.status.toLowerCase()]}`}>
                                                {getStatusIcon(app.status)}
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className={styles.dateCell}>
                                            {app.sentAt
                                                ? new Date(app.sentAt).toLocaleDateString()
                                                : '—'
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Tailored Content Preview */}
            {campaign.tailoredSummary && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Tailored Summary</h2>
                    <div className={styles.tailoredContent}>
                        <p>{campaign.tailoredSummary}</p>
                    </div>
                </section>
            )}
        </div>
    );
}
