'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadClaim, getAssessment } from '@/services/api';
import { formatFileSize } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/constants';

type UploadStage = 'idle' | 'preview' | 'uploading' | 'assessing' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const [stage, setStage] = useState<UploadStage>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const onDrop = useCallback((accepted: File[], rejected: import('react-dropzone').FileRejection[]) => {
    setValidationError('');

    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === 'file-too-large') {
        setValidationError(`File too large. Maximum size is 20 MB.`);
      } else if (err.code === 'file-invalid-type') {
        setValidationError('Unsupported format. Upload a JPG, PNG, or WEBP image.');
      } else {
        setValidationError('Unable to process this file. Try a different image.');
      }
      return;
    }

    if (accepted.length > 0) {
      const f = accepted[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setStage('preview');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: stage === 'uploading' || stage === 'assessing',
  });

  const handleSubmit = async () => {
    if (!file) return;

    setStage('uploading');
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 90) { clearInterval(progressInterval); return 90; }
        return p + Math.random() * 15;
      });
    }, 200);

    try {
      const { claimId, imageUrl } = await uploadClaim(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Brief pause then switch to assessing
      await new Promise((r) => setTimeout(r, 400));
      setStage('assessing');

      // Trigger assessment in background, redirect to results
      router.push(`/results/${claimId}?imageUrl=${encodeURIComponent(imageUrl || '')}`);
    } catch (err) {
      clearInterval(progressInterval);
      setStage('error');
      setErrorMessage('Upload failed. Check your connection and try again.');
      console.error('Upload error:', err);
    }
  };

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setStage('idle');
    setValidationError('');
  };

  const handleRetry = () => {
    setStage(file ? 'preview' : 'idle');
    setErrorMessage('');
  };

  return (
    <div className="max-w-[1400px] mx-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* ── Page Header ──────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-data-sm">WORKSPACE</span>
          <span style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-data-sm" style={{ color: 'var(--brand-primary)' }}>NEW ASSESSMENT</span>
        </div>
        <h1 className="text-display-md mb-2">Start a damage assessment</h1>
        <p className="text-body-md" style={{ color: 'var(--text-secondary)' }}>
          Upload a clear photo of the damaged vehicle. The AI reads the image and returns a full assessment in under 90 seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        {/* ── Upload Zone ───────────────────────────── */}
        <div>
          <AnimatePresence mode="wait">
            {stage === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  {...getRootProps()}
                  className={`upload-zone flex flex-col items-center justify-center cursor-pointer transition-all ${isDragActive ? 'drag-over' : ''}`}
                  style={{ minHeight: '420px', padding: '48px 32px' }}
                  aria-label="Drop zone for vehicle damage photos"
                  id="upload-dropzone"
                >
                  <input {...getInputProps()} aria-label="File upload input" />

                  {/* Annotation dot — quieter version of scan motif */}
                  <div className="relative mb-8">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: isDragActive ? 'var(--brand-primary)' : 'var(--brand-primary-light)',
                        border: `2px dashed ${isDragActive ? 'transparent' : 'var(--brand-primary)'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <svg
                        className="w-10 h-10"
                        style={{ color: isDragActive ? 'white' : 'var(--brand-primary)' }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    {/* Pulsing ring — annotation motif */}
                    <div
                      className="absolute inset-0 rounded-2xl border-2 border-dashed animate-ping"
                      style={{ borderColor: 'var(--brand-primary)', opacity: isDragActive ? 0 : 0.3, animationDuration: '2s' }}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-heading-sm mb-1">
                      {isDragActive ? 'Drop to analyse' : 'Drop a damage photo here'}
                    </p>
                    <p className="text-body-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      or click to browse your files
                    </p>
                    <div className="text-data-sm">
                      JPG · PNG · WEBP &nbsp;·&nbsp; Max 20 MB
                    </div>
                  </div>
                </div>

                {validationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                    style={{ backgroundColor: 'var(--severity-severe-bg)', color: 'var(--severity-severe-text)', border: '1px solid var(--severity-severe)' }}
                    role="alert"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {validationError}
                  </motion.div>
                )}
              </motion.div>
            )}

            {stage === 'preview' && preview && file && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card overflow-hidden">
                  {/* Image preview */}
                  <div className="relative" style={{ aspectRatio: '16/9', maxHeight: '360px' }}>
                    <img
                      src={preview}
                      alt="Uploaded damage photo preview"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }}
                    />
                    {/* File info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                      <div>
                        <div className="text-white font-medium text-sm truncate max-w-[200px]">{file.name}</div>
                        <div className="text-white/70 text-data-sm">{formatFileSize(file.size)}</div>
                      </div>
                      <div className="flex gap-2">
                        <label
                          htmlFor="replace-file-input"
                          className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                          </svg>
                          Replace
                        </label>
                        <input
                          id="replace-file-input"
                          type="file"
                          className="sr-only"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            const newFile = e.target.files?.[0];
                            if (newFile) {
                              URL.revokeObjectURL(preview);
                              setFile(newFile);
                              setPreview(URL.createObjectURL(newFile));
                            }
                          }}
                          aria-label="Replace uploaded file"
                        />
                        <button
                          onClick={handleRemove}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: 'white', backdropFilter: 'blur(4px)', border: '1px solid rgba(239,68,68,0.4)' }}
                          aria-label="Remove uploaded file"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zm0 1.5h2.5c.69 0 1.25.56 1.25 1.25v.5a49.37 49.37 0 00-5 0v-.5c0-.69.56-1.25 1.25-1.25zm-3.5 5.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5zm5-.75a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="p-5 flex items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                      Photo ready for assessment. The AI will scan for damage, estimate repair cost, and check for fraud indicators.
                    </div>
                    <button
                      onClick={handleSubmit}
                      className="btn-primary flex-shrink-0"
                      style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}
                      id="start-assessment-btn"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Run assessment
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === 'uploading' && preview && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card overflow-hidden"
              >
                <div className="relative" style={{ aspectRatio: '16/9', maxHeight: '360px' }}>
                  <img
                    src={preview}
                    alt="Uploading damage photo"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/20">
                    <div className="text-white font-semibold text-lg">Uploading...</div>
                    <div className="w-64">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: 'white' }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ ease: 'easeOut', duration: 0.3 }}
                        />
                      </div>
                      <div className="text-white/80 text-sm text-center mt-2 font-mono">
                        {Math.round(uploadProgress)}%
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === 'assessing' && preview && (
              <motion.div
                key="assessing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card overflow-hidden"
              >
                {/* Preview of scan motif — quieter version */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '360px' }}>
                  <img
                    src={preview}
                    alt="Assessing damage"
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.7)' }}
                  />
                  {/* Scan line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.4), var(--brand-primary), rgba(37,99,235,0.4), transparent)',
                      boxShadow: '0 0 20px 4px rgba(37,99,235,0.3)',
                    }}
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Placeholder annotation dots */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative inline-flex items-center justify-center mb-4">
                        <div className="w-4 h-4 rounded-full bg-blue-500" />
                        <div
                          className="absolute w-10 h-10 rounded-full border-2 border-blue-400 animate-ping"
                          style={{ animationDuration: '1.5s' }}
                        />
                      </div>
                      <div className="text-white font-semibold text-lg">Analysing damage...</div>
                      <div className="text-white/70 text-sm mt-1 font-mono">AI model processing</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    />
                    <span className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
                      Scanning damage zones · Estimating repair cost · Checking fraud indicators
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card flex flex-col items-center justify-center py-20 px-8 text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--severity-severe-bg)', border: '1px solid var(--severity-severe)' }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--severity-severe)" strokeWidth="1.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <h3 className="text-heading-md mb-2">Upload failed</h3>
                <p className="text-body-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                  {errorMessage}
                </p>
                <div className="flex gap-3">
                  <button onClick={handleRetry} className="btn-primary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try again
                  </button>
                  <button onClick={handleRemove} className="btn-secondary">
                    Start over
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Instructions Panel ────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-heading-sm mb-4">Photo requirements</h2>
            <ul className="space-y-3">
              {[
                { ok: true, text: 'Full vehicle visible from the damaged side' },
                { ok: true, text: 'Photo taken in daylight or good artificial light' },
                { ok: true, text: 'Minimum 1MP resolution (2MP+ recommended)' },
                { ok: false, text: 'Dark, blurry, or obstructed photos' },
                { ok: false, text: 'Cropped images showing only part of the damage' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      backgroundColor: item.ok ? 'var(--fraud-clear-bg)' : 'var(--severity-severe-bg)',
                    }}
                  >
                    {item.ok ? (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="var(--fraud-clear)" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 5.5l2.5 2.5 4.5-5" />
                      </svg>
                    ) : (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="var(--severity-severe)" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l6 6M8 2L2 8" />
                      </svg>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-heading-sm mb-3">What you&#39;ll get</h2>
            <ul className="space-y-2.5">
              {[
                'Annotated damage map',
                'Severity classification',
                'Estimated repair cost',
                'AI confidence score',
                'Fraud risk assessment',
                'Downloadable PDF report',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-xl p-4 border"
            style={{ backgroundColor: 'var(--brand-primary-light)', borderColor: 'var(--brand-primary)30' }}
          >
            <div className="flex gap-2.5">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="var(--brand-primary)" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm" style={{ color: 'var(--brand-primary)' }}>
                <strong>Data security:</strong> Photos are processed in-memory and never stored permanently. Assessment data is retained for claim record only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
