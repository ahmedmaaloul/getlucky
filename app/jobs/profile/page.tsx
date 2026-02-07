// app/jobs/profile/page.tsx
// Master Profile Editor

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './profile.module.css';

interface Experience {
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    highlights: string[];
}

interface Education {
    institution: string;
    degree: string;
    field: string;
    year: number;
}

interface MasterProfile {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl: string;
    githubUrl: string;
    summary: string;
    experiences: Experience[];
    education: Education[];
    skills: {
        technical: string[];
        soft: string[];
        languages: string[];
    };
}

const defaultProfile: MasterProfile = {
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    summary: '',
    experiences: [],
    education: [],
    skills: { technical: [], soft: [], languages: [] },
};

export default function ProfilePage() {
    const [profile, setProfile] = useState<MasterProfile>(defaultProfile);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');



    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const res = await fetch('/api/jobs/profile');
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    setProfile({ ...defaultProfile, ...data.profile });
                }
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('/api/jobs/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (res.ok) {
                setMessage('✓ Profile saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const data = await res.json();
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('Failed to save profile');
        } finally {
            setSaving(false);
        }
    }

    function addExperience() {
        setProfile((p) => ({
            ...p,
            experiences: [
                ...p.experiences,
                { company: '', title: '', startDate: '', endDate: '', highlights: [''] },
            ],
        }));
    }

    function updateExperience(index: number, field: keyof Experience, value: string | string[]) {
        setProfile((p) => ({
            ...p,
            experiences: p.experiences.map((exp, i) =>
                i === index ? { ...exp, [field]: value } : exp
            ),
        }));
    }

    function removeExperience(index: number) {
        setProfile((p) => ({
            ...p,
            experiences: p.experiences.filter((_, i) => i !== index),
        }));
    }

    function addEducation() {
        setProfile((p) => ({
            ...p,
            education: [...p.education, { institution: '', degree: '', field: '', year: 2024 }],
        }));
    }

    function updateEducation(index: number, field: keyof Education, value: string | number) {
        setProfile((p) => ({
            ...p,
            education: p.education.map((edu, i) =>
                i === index ? { ...edu, [field]: value } : edu
            ),
        }));
    }

    function removeEducation(index: number) {
        setProfile((p) => ({
            ...p,
            education: p.education.filter((_, i) => i !== index),
        }));
    }

    if (loading) {
        return <div className={styles.loading}>Loading profile...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/jobs" className={styles.backLink}>
                    ← Back to Dashboard
                </Link>
                <h1 className={styles.title}>Master Profile</h1>
                <p className={styles.subtitle}>
                    Your permanent data. Campaigns will tailor this for each job target.
                </p>
            </header>

            <div className={styles.form}>
                {/* Personal Info */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Personal Information</h2>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label>Full Name *</label>
                            <input
                                type="text"
                                value={profile.fullName}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Headline</label>
                            <input
                                type="text"
                                value={profile.headline}
                                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                                placeholder="Senior Software Engineer"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Phone</label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="+49 123 456 7890"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Location</label>
                            <input
                                type="text"
                                value={profile.location}
                                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                placeholder="Berlin, Germany"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>LinkedIn URL</label>
                            <input
                                type="url"
                                value={profile.linkedinUrl}
                                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                                placeholder="https://linkedin.com/in/johndoe"
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Professional Summary</label>
                        <textarea
                            value={profile.summary}
                            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                            placeholder="Brief 2-3 sentence overview of your experience and expertise..."
                            rows={4}
                        />
                    </div>
                </section>

                {/* Experience */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Experience</h2>
                        <button type="button" onClick={addExperience} className={styles.addBtn}>
                            + Add Experience
                        </button>
                    </div>

                    {profile.experiences.map((exp, i) => (
                        <div key={i} className={styles.card}>
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => removeExperience(i)}
                            >
                                ×
                            </button>
                            <div className={styles.grid}>
                                <div className={styles.formGroup}>
                                    <label>Company</label>
                                    <input
                                        type="text"
                                        value={exp.company}
                                        onChange={(e) => updateExperience(i, 'company', e.target.value)}
                                        placeholder="Company Inc."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Job Title</label>
                                    <input
                                        type="text"
                                        value={exp.title}
                                        onChange={(e) => updateExperience(i, 'title', e.target.value)}
                                        placeholder="Software Engineer"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Start Date</label>
                                    <input
                                        type="text"
                                        value={exp.startDate}
                                        onChange={(e) => updateExperience(i, 'startDate', e.target.value)}
                                        placeholder="01/2022"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>End Date</label>
                                    <input
                                        type="text"
                                        value={exp.endDate}
                                        onChange={(e) => updateExperience(i, 'endDate', e.target.value)}
                                        placeholder="Present"
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Key Achievements (one per line)</label>
                                <textarea
                                    value={exp.highlights.join('\n')}
                                    onChange={(e) =>
                                        updateExperience(i, 'highlights', e.target.value.split('\n'))
                                    }
                                    placeholder="Led team of 5 engineers to deliver feature X&#10;Reduced latency by 40% through optimization"
                                    rows={4}
                                />
                            </div>
                        </div>
                    ))}
                </section>

                {/* Education */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Education</h2>
                        <button type="button" onClick={addEducation} className={styles.addBtn}>
                            + Add Education
                        </button>
                    </div>

                    {profile.education.map((edu, i) => (
                        <div key={i} className={styles.card}>
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => removeEducation(i)}
                            >
                                ×
                            </button>
                            <div className={styles.grid}>
                                <div className={styles.formGroup}>
                                    <label>Institution</label>
                                    <input
                                        type="text"
                                        value={edu.institution}
                                        onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                                        placeholder="Technical University of Munich"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Degree</label>
                                    <input
                                        type="text"
                                        value={edu.degree}
                                        onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                                        placeholder="Master's"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Field of Study</label>
                                    <input
                                        type="text"
                                        value={edu.field}
                                        onChange={(e) => updateEducation(i, 'field', e.target.value)}
                                        placeholder="Computer Science"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Year</label>
                                    <input
                                        type="number"
                                        value={edu.year}
                                        onChange={(e) => updateEducation(i, 'year', parseInt(e.target.value))}
                                        placeholder="2024"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Skills */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Skills</h2>
                    <div className={styles.skillsGrid}>
                        <div className={styles.formGroup}>
                            <label>Technical Skills (comma-separated)</label>
                            <textarea
                                value={profile.skills.technical.join(', ')}
                                onChange={(e) =>
                                    setProfile({
                                        ...profile,
                                        skills: {
                                            ...profile.skills,
                                            technical: e.target.value.split(',').map((s) => s.trim()),
                                        },
                                    })
                                }
                                placeholder="Python, TypeScript, React, AWS, PostgreSQL"
                                rows={2}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Soft Skills (comma-separated)</label>
                            <textarea
                                value={profile.skills.soft.join(', ')}
                                onChange={(e) =>
                                    setProfile({
                                        ...profile,
                                        skills: {
                                            ...profile.skills,
                                            soft: e.target.value.split(',').map((s) => s.trim()),
                                        },
                                    })
                                }
                                placeholder="Team Leadership, Problem Solving, Communication"
                                rows={2}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Languages (comma-separated)</label>
                            <textarea
                                value={profile.skills.languages.join(', ')}
                                onChange={(e) =>
                                    setProfile({
                                        ...profile,
                                        skills: {
                                            ...profile.skills,
                                            languages: e.target.value.split(',').map((s) => s.trim()),
                                        },
                                    })
                                }
                                placeholder="English (Native), German (B2), French (A2)"
                                rows={2}
                            />
                        </div>
                    </div>
                </section>

                {/* Save */}
                <div className={styles.actions}>
                    {message && (
                        <span className={message.startsWith('✓') ? styles.success : styles.error}>
                            {message}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={saveProfile}
                        disabled={saving || !profile.fullName}
                        className={styles.saveBtn}
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
}
