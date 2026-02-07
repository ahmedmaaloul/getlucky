'use client';

// components/pdf-upload.tsx
// PDF upload component for manual resume uploads to Supabase

import { useState, ChangeEvent, useRef } from 'react';
import { Upload, FileCheck, X, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/supabase/client';

interface PdfUploadProps {
    campaignId: string;
    currentUrl?: string | null;
    onUploadComplete: (url: string) => void;
    onRemove?: () => void;
}

export function PdfUpload({
    campaignId,
    currentUrl,
    onUploadComplete,
    onRemove
}: PdfUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setError('Please select a PDF file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Generate unique path
            const timestamp = Date.now();
            const path = `${campaignId}/${timestamp}-${file.name}`;

            const { url, error: uploadError } = await uploadFile('resumes', path, file);

            if (uploadError) {
                throw new Error(uploadError);
            }

            if (url) {
                setFileName(file.name);
                onUploadComplete(url);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }

    function handleRemove() {
        setFileName(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        onRemove?.();
    }

    // Show uploaded state
    if (currentUrl || fileName) {
        return (
            <div className="pdf-upload-container uploaded">
                <FileCheck className="icon success" />
                <div className="info">
                    <span className="filename">{fileName || 'Uploaded PDF'}</span>
                    <span className="status">Ready to use</span>
                </div>
                <button type="button" onClick={handleRemove} className="remove-btn">
                    <X className="icon-sm" />
                </button>
                <style jsx>{`
          .pdf-upload-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: oklch(0.55 0.15 160 / 10%);
            border: 1px solid oklch(0.55 0.15 160 / 30%);
            border-radius: var(--radius);
          }
          .info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
          }
          .filename {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--foreground);
          }
          .status {
            font-size: 0.75rem;
            color: oklch(0.55 0.15 160);
          }
          .icon.success {
            width: 1.5rem;
            height: 1.5rem;
            color: oklch(0.55 0.15 160);
          }
          .remove-btn {
            padding: 0.375rem;
            background: transparent;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            color: var(--muted-foreground);
            transition: all 0.15s;
          }
          .remove-btn:hover {
            background: var(--destructive);
            color: white;
          }
          .icon-sm {
            width: 1rem;
            height: 1rem;
          }
        `}</style>
            </div>
        );
    }

    // Show upload state
    return (
        <div className="pdf-upload-container">
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                id={`pdf-upload-${campaignId}`}
                className="file-input"
            />
            <label htmlFor={`pdf-upload-${campaignId}`} className="upload-label">
                {uploading ? (
                    <Loader2 className="icon spinning" />
                ) : (
                    <Upload className="icon" />
                )}
                <div className="text">
                    <span className="primary">
                        {uploading ? 'Uploading...' : 'Click to upload PDF'}
                    </span>
                    <span className="secondary">Max 5MB</span>
                </div>
            </label>
            {error && <div className="error">{error}</div>}
            <style jsx>{`
        .pdf-upload-container {
          position: relative;
        }
        .file-input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          overflow: hidden;
        }
        .upload-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background: var(--muted);
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.15s;
        }
        .upload-label:hover {
          border-color: var(--primary);
          background: var(--primary)/5%;
        }
        .icon {
          width: 1.5rem;
          height: 1.5rem;
          color: var(--muted-foreground);
        }
        .icon.spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .primary {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
        }
        .secondary {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }
        .error {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--destructive);
        }
      `}</style>
        </div>
    );
}
