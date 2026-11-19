import React, { useState, useRef, useEffect, useCallback } from 'react';
import './CSS/MountainVideoStudioUI.css';

export type RecordingCategory =
    | 'NATURE_ESCAPE'
    | 'CLIENT_DEMO'
    | 'CLIENT_REVIEW'
    | 'FIELD_DISPATCH'
    | 'MIND_RESET_NOTE';

interface CategoryOption {
    value: RecordingCategory;
    label: string;
    hint: string;
    prefix: string;
}

const CATEGORIES: CategoryOption[] = [
    {
        value: 'NATURE_ESCAPE',
        label: 'Nature / Mountain Capture',
        hint: 'Nature visuals, trek, ya outdoor moments ke liye',
        prefix: 'mountain_capture',
    },
    {
        value: 'CLIENT_DEMO',
        label: 'Client Demo / Walkthrough',
        hint: 'Client ko live feature ya flow dikhaane ke liye',
        prefix: 'client_demo',
    },
    {
        value: 'CLIENT_REVIEW',
        label: 'Client Update / Review',
        hint: 'Progress update, feedback, ya review notes ke liye',
        prefix: 'client_review',
    },
    {
        value: 'FIELD_DISPATCH',
        label: 'Field / Trip Dispatch',
        hint: 'Travel ya ground spot ka context aur note',
        prefix: 'field_dispatch',
    },
    {
        value: 'MIND_RESET_NOTE',
        label: 'Personal / Quick Note',
        hint: 'Apne thoughts ya quick notes ke liye',
        prefix: 'quick_note',
    },
];

type StreamState = 'IDLE' | 'PREVIEW_LIVE' | 'RECORDING' | 'UPLOADING' | 'REVIEW' | 'MERGING';
type SourceMode = 'CAMERA' | 'SCREEN';
type VideoResolution = '720P' | '1080P' | '4K';

const DEFAULT_USER_ID = 'ankit0397';
const FALLBACK_REF_ID = 'note_123';
const TARGET_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB OOM-safe buffer
const MAX_RETRIES = 3;

const sanitizeRef = (val: string) =>
    val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');

export const MountainVideoStudioUI: React.FC<{ initialReferenceId?: string }> = ({
    initialReferenceId = '',
}) => {
    const apiBaseUrl = import.meta.env.VITE_DMS_API_BASE_URL || 'http://localhost:9095';
    const userId = localStorage.getItem('userId') || DEFAULT_USER_ID;

    // Step 1: Detail / Context Form State
    const [step, setStep] = useState<'DETAILS' | 'STUDIO'>('DETAILS');
    const [title, setTitle] = useState<string>('');
    const [referenceId, setReferenceId] = useState<string>(initialReferenceId);
    const [category, setCategory] = useState<RecordingCategory>('NATURE_ESCAPE');
    const [description, setDescription] = useState<string>('');
    const [keyPointsText, setKeyPointsText] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);

    // Step 2: Recorder & Playback State
    const [streamState, setStreamState] = useState<StreamState>('IDLE');
    const [sourceMode, setSourceMode] = useState<SourceMode>('CAMERA');
    const [isFullView, setIsFullView] = useState<boolean>(false);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [selectedResolution, setSelectedResolution] = useState<VideoResolution>('1080P');
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [uploadedParts, setUploadedParts] = useState<number>(0);

    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
    const [useRearCamera, setUseRearCamera] = useState<boolean>(true);

    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const studioContainerRef = useRef<HTMLDivElement | null>(null);
    const liveVideoRef = useRef<HTMLVideoElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const currentBatchChunksRef = useRef<Blob[]>([]);
    const currentBatchSizeRef = useRef<number>(0);
    const partCounterRef = useRef<number>(1);
    const baseFileNameRef = useRef<string>('');
    const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
    const hasUploadErrorRef = useRef<boolean>(false);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeRefId = sanitizeRef(referenceId) || FALLBACK_REF_ID;
    const activeCategory = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
    const parsedKeyPoints = keyPointsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const notify = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 4000);
    };

    const stopAllTracks = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);

    const initializeMedia = useCallback(
        async (mode: SourceMode = 'CAMERA', overrideRear?: boolean, resOverride?: VideoResolution) => {
            setErrorMsg(null);
            stopAllTracks();
            setZoomLevel(1);
            setIsCameraOff(false);

            const rear = overrideRear !== undefined ? overrideRear : useRearCamera;
            const res = resOverride || selectedResolution;

            try {
                let stream: MediaStream;
                if (mode === 'SCREEN') {
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { frameRate: { ideal: 30 } },
                        audio: true,
                    });
                    try {
                        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream = new MediaStream([...displayStream.getVideoTracks(), ...mic.getAudioTracks()]);
                    } catch {
                        stream = displayStream;
                    }
                    displayStream.getVideoTracks()[0].onended = () => {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            stopRecording();
                        } else {
                            initializeMedia('CAMERA', rear, res);
                        }
                    };
                } else {
                    const dims =
                        res === '720P'
                            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
                            : res === '4K'
                                ? { width: { ideal: 3840 }, height: { ideal: 2160 } }
                                : { width: { ideal: 1920 }, height: { ideal: 1080 } };

                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: rear ? 'environment' : 'user', ...dims },
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                        });
                    } catch {
                        stream = await navigator.mediaDevices.getUserMedia({ video: dims, audio: true });
                    }
                }

                streamRef.current = stream;
                if (liveVideoRef.current) {
                    liveVideoRef.current.srcObject = stream;
                }
                setSourceMode(mode);
                setStreamState('PREVIEW_LIVE');
            } catch (err) {
                console.error('[MediaStreamError]:', err);
                setErrorMsg(mode === 'SCREEN' ? 'Screen share cancelled or blocked.' : 'Camera/Mic access failed.');
                if (mode === 'SCREEN') setSourceMode('CAMERA');
                setStreamState('IDLE');
            }
        },
        [selectedResolution, stopAllTracks, useRearCamera]
    );

    useEffect(() => {
        if (initialReferenceId) {
            setReferenceId(initialReferenceId);
        }
    }, [initialReferenceId]);

    useEffect(() => {
        if (step === 'STUDIO') {
            initializeMedia('CAMERA', useRearCamera);
        }
        return () => {
            stopAllTracks();
        };
    }, [step]);

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setFormError('Title daalna zaroori hai taaki viewer/client ko context samajh aaye.');
            return;
        }
        const rawSource = referenceId.trim() || title.trim();
        const cleanRef = sanitizeRef(rawSource) || FALLBACK_REF_ID;
        setReferenceId(cleanRef);
        setFormError(null);
        setStep('STUDIO');
    };

    const enqueuePresignedChunkUpload = (chunkBlob: Blob, partIndex: number, baseFile: string): Promise<void> => {
        const runUpload = async () => {
            const contentType = chunkBlob.type || 'video/webm';
            const partFileName = `part_${String(partIndex).padStart(5, '0')}_${Date.now()}.webm`;

            let lastErr: unknown;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const signUrl =
                        `${apiBaseUrl}/api/v1/video/presign-chunk` +
                        `?userId=${encodeURIComponent(userId)}` +
                        `&baseFileName=${encodeURIComponent(baseFile)}` +
                        `&referenceId=${encodeURIComponent(activeRefId)}` +
                        `&fileName=${encodeURIComponent(partFileName)}` +
                        `&contentType=${encodeURIComponent(contentType)}`;

                    const signRes = await fetch(signUrl);
                    if (!signRes.ok) throw new Error(`Presign HTTP ${signRes.status}`);

                    const signData = await signRes.json();
                    const uploadUrl: string | undefined = signData.uploadUrl || signData.data;
                    if (!uploadUrl) throw new Error('Missing uploadUrl');

                    const putRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': contentType },
                        body: chunkBlob,
                    });
                    if (!putRes.ok) throw new Error(`S3 PUT HTTP ${putRes.status}`);

                    setUploadedParts((c) => c + 1);
                    return;
                } catch (err) {
                    lastErr = err;
                    if (attempt < MAX_RETRIES) {
                        await new Promise((r) => setTimeout(r, 600 * attempt));
                    }
                }
            }
            throw lastErr instanceof Error ? lastErr : new Error(`Part ${partIndex} failed`);
        };

        uploadQueueRef.current = uploadQueueRef.current
            .then(runUpload)
            .catch((err) => {
                console.error(`[ChunkUploadError - Part ${partIndex}]:`, err);
                hasUploadErrorRef.current = true;
                setErrorMsg(`Part ${partIndex} upload fail hua. Save block kiya gaya hai.`);
                throw err;
            });

        return uploadQueueRef.current;
    };

    const flushBuffer = (forceFinal: boolean, mimeType: string) => {
        if (currentBatchSizeRef.current === 0) return;
        if (!forceFinal && currentBatchSizeRef.current < TARGET_CHUNK_SIZE) return;

        const blob = new Blob(currentBatchChunksRef.current, { type: mimeType });
        const partIdx = partCounterRef.current++;
        currentBatchChunksRef.current = [];
        currentBatchSizeRef.current = 0;

        enqueuePresignedChunkUpload(blob, partIdx, baseFileNameRef.current);
    };

    const handleMergeChunks = async () => {
        if (hasUploadErrorRef.current) {
            setErrorMsg('Pehle failed upload issue resolve karein, tab video save hogi.');
            setStreamState('REVIEW');
            return;
        }

        setStreamState('MERGING');
        setErrorMsg(null);
        try {
            const res = await fetch(
                `${apiBaseUrl}/api/v1/video/merge-chunks?baseFileName=${encodeURIComponent(baseFileNameRef.current)}&referenceId=${encodeURIComponent(activeRefId)}&userId=${encodeURIComponent(userId)}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            );
            if (!res.ok) throw new Error('Merge failed');

            const data = await res.json();
            const mergedUrl: string = data.finalUrl || data.data;
            if (!mergedUrl) throw new Error('Missing finalUrl');

            setFinalVideoUrl(mergedUrl);
            setStreamState('REVIEW');
            notify('Video save ho gayi aur play ke liye ready hai!');
        } catch (err) {
            console.error('[MergeError]:', err);
            setErrorMsg('Video save karne mein error aaya. Retry Save dabayein.');
            setStreamState('REVIEW');
        }
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        setErrorMsg(null);
        setFinalVideoUrl(null);
        setUploadedParts(0);
        hasUploadErrorRef.current = false;

        try {
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : MediaRecorder.isTypeSupported('video/webm')
                    ? 'video/webm'
                    : 'video/mp4';

            const recorder = new MediaRecorder(streamRef.current, {
                mimeType,
                videoBitsPerSecond: 1800000,
            });

            mediaRecorderRef.current = recorder;
            currentBatchChunksRef.current = [];
            currentBatchSizeRef.current = 0;
            partCounterRef.current = 1;
            uploadQueueRef.current = Promise.resolve();
            baseFileNameRef.current = `${activeCategory.prefix}_${Date.now()}`;

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data && e.data.size > 0) {
                    currentBatchChunksRef.current.push(e.data);
                    currentBatchSizeRef.current += e.data.size;
                    flushBuffer(false, mimeType);
                }
            };

            recorder.onstop = async () => {
                flushBuffer(true, mimeType);
                stopAllTracks();
                setStreamState('UPLOADING');

                try {
                    await uploadQueueRef.current;
                    await handleMergeChunks();
                } catch {
                    setStreamState('REVIEW');
                    notify('Upload fail hua. Retry Save dabakar dobara try karein.', false);
                }
            };

            recorder.start(5000);
            setElapsedSeconds(0);
            setStreamState('RECORDING');

            timerIntervalRef.current = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('[RecorderInitError]:', err);
            setErrorMsg('Recording start nahi ho paayi.');
        }
    };

    const stopRecording = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const toggleFullView = async () => {
        try {
            if (!isFullView) {
                if (studioContainerRef.current?.requestFullscreen) {
                    await studioContainerRef.current.requestFullscreen();
                }
                setIsFullView(true);
            } else {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
                setIsFullView(false);
            }
        } catch {
            setIsFullView((v) => !v);
        }
    };

    const fmtTime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    if (step === 'DETAILS') {
        return (
            <div className="mvs-container">
                <h2>Mountain Video Recorder — Detail Setup</h2>
                <p>Add the video details first so viewers and clients have clear context.</p>

                {formError && <div className="vrc-error-banner">{formError}</div>}

                <form onSubmit={handleDetailsSubmit} className="mvs-form">
                    <div className="mvs-row">
                        <label htmlFor="vid-title">Title *</label>
                        <input
                            id="vid-title"
                            type="text"
                            placeholder="e.g. Kerala Hill View Note ya Client Walkthrough"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="mvs-row">
                        <label htmlFor="vid-cat">Category</label>
                        <select
                            id="vid-cat"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as RecordingCategory)}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                        <small>{activeCategory.hint}</small>
                    </div>

                    <div className="mvs-row">
                        <label htmlFor="vid-ref">Task / Note / Trip Name (Optional)</label>
                        <input
                            id="vid-ref"
                            type="text"
                            placeholder="e.g. Kerala Trip Day 1 ya Client Auth Demo"
                            value={referenceId}
                            onChange={(e) => setReferenceId(e.target.value)}
                        />
                        <small>
                            Khali chhodoge toh title se auto-tag ban jayega (fallback: {FALLBACK_REF_ID}).
                        </small>
                    </div>

                    <div className="mvs-row">
                        <label htmlFor="vid-desc">Summary / Client Context</label>
                        <textarea
                            id="vid-desc"
                            rows={3}
                            placeholder="Is video mein kya dikhaya ya bataya gaya hai..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="mvs-row">
                        <label htmlFor="vid-points">Key Points (Har line ek point)</label>
                        <textarea
                            id="vid-points"
                            rows={3}
                            placeholder={'00:00 Intro\n01:30 Main view / flow\n04:00 Summary'}
                            value={keyPointsText}
                            onChange={(e) => setKeyPointsText(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="vrc-btn vrc-btn--primary">
                        Start Studio
                    </button>
                </form>
            </div>
        );
    }

    const isVideoHidden = isCameraOff || sourceMode === 'SCREEN';
    const videoTransform = `${useRearCamera && sourceMode === 'CAMERA' ? 'scaleX(1)' : 'scaleX(-1)'} scale(${zoomLevel})`;

    return (
        <div className="mvs-studio-wrap">
            {toast && (
                <div
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 9999,
                        backgroundColor: toast.ok ? '#10B981' : '#EF4444',
                        color: '#fff',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    {toast.msg}
                </div>
            )}

            <div className="mvs-detail-card">
                <div className="mvs-detail-top">
                    <div>
                        <strong>{title}</strong>{' '}
                        <span>[{activeCategory.label}]</span>{' '}
                        <span>#{activeRefId}</span>
                    </div>
                    <button type="button" onClick={() => setStep('DETAILS')} className="vrc-btn vrc-btn--secondary">
                        Edit Details
                    </button>
                </div>
                {description && <p>{description}</p>}
                {parsedKeyPoints.length > 0 && (
                    <ul>
                        {parsedKeyPoints.map((pt, i) => (
                            <li key={i}>{pt}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div
                ref={studioContainerRef}
                className={`vrc-shell ${isFullView ? 'vrc-shell--full' : 'vrc-shell--compact'}`}
            >
                <div className="vrc-header">
                    <div className="vrc-header__left">
                        <span className={`vrc-status-dot ${streamState === 'RECORDING' ? 'vrc-status-dot--recording' : ''}`} />
                        <span className="vrc-header__title">
                            {sourceMode === 'SCREEN' ? 'Mountain Screen Studio' : 'Mountain Video Studio'}
                        </span>
                        <span className="vrc-timer-badge">
                            {streamState === 'RECORDING' ? `REC ${fmtTime(elapsedSeconds)}` : fmtTime(elapsedSeconds)}
                        </span>
                    </div>

                    <div className="vrc-header__right">
                        {sourceMode === 'CAMERA' && streamState !== 'REVIEW' && streamState !== 'MERGING' && streamState !== 'UPLOADING' && (
                            <>
                                <select
                                    value={selectedResolution}
                                    onChange={(e) => {
                                        const r = e.target.value as VideoResolution;
                                        setSelectedResolution(r);
                                        initializeMedia(sourceMode, useRearCamera, r);
                                    }}
                                    disabled={streamState === 'RECORDING'}
                                    className="vrc-resolution-select"
                                >
                                    <option value="720P">720p HD</option>
                                    <option value="1080P">1080p FHD</option>
                                    <option value="4K">4K UHD</option>
                                </select>

                                <button
                                    onClick={() => setZoomLevel((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                                    disabled={zoomLevel <= 1}
                                    className="vrc-zoom-btn"
                                >
                                    −
                                </button>
                                <span className="vrc-zoom-label">{zoomLevel.toFixed(1)}x</span>
                                <button
                                    onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
                                    disabled={zoomLevel >= 3}
                                    className="vrc-zoom-btn"
                                >
                                    +
                                </button>
                            </>
                        )}
                        <button onClick={toggleFullView} className="vrc-view-toggle">
                            {isFullView ? 'Short View' : 'Full View'}
                        </button>
                    </div>
                </div>

                <div className="vrc-stage">
                    {errorMsg && <div className="vrc-error-banner">{errorMsg}</div>}

                    {streamState === 'UPLOADING' || streamState === 'MERGING' ? (
                        <div className="vrc-placeholder">
                            <div className="vrc-spinner" />
                            <div className="vrc-placeholder__heading">
                                {streamState === 'UPLOADING'
                                    ? `Saving recording... (${uploadedParts} synced)`
                                    : 'Finalizing & preparing your video...'}
                            </div>
                        </div>
                    ) : streamState !== 'REVIEW' ? (
                        <>
                            <video
                                ref={liveVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`vrc-video-stream ${isVideoHidden ? 'vrc-video-stream--hidden' : ''}`}
                                style={{ transform: videoTransform }}
                            />
                            {sourceMode === 'SCREEN' && (
                                <div className="vrc-placeholder">
                                    <div className="vrc-placeholder__heading">Screen Capture Active</div>
                                </div>
                            )}
                            {sourceMode === 'CAMERA' && isCameraOff && (
                                <div className="vrc-placeholder">
                                    <span className="vrc-avatar-subtext">Camera is off</span>
                                </div>
                            )}
                        </>
                    ) : finalVideoUrl ? (
                        <video
                            src={finalVideoUrl}
                            controls
                            autoPlay
                            playsInline
                            className="vrc-review-stream"
                        />
                    ) : (
                        <div className="vrc-placeholder">
                            <div className="vrc-placeholder__heading">Recording Stopped</div>
                            <p style={{ color: '#94a3b8', margin: 0 }}>
                                {errorMsg
                                    ? 'Video save nahi ho paayi. Neeche "Retry Save" dabayein.'
                                    : 'Aapki video process ho rahi hai...'}
                            </p>
                        </div>
                    )}

                    <div className="vrc-dock">
                        {streamState === 'IDLE' && (
                            <button onClick={() => initializeMedia('CAMERA', useRearCamera)} className="vrc-btn vrc-btn--primary">
                                Enable Camera
                            </button>
                        )}

                        {(streamState === 'PREVIEW_LIVE' || streamState === 'RECORDING') && (
                            <>
                                <button
                                    onClick={() => {
                                        streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
                                        setIsMuted(!isMuted);
                                    }}
                                    className="vrc-dock__icon-btn"
                                >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </button>

                                {sourceMode === 'CAMERA' && (
                                    <button
                                        onClick={() => {
                                            streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
                                            setIsCameraOff(!isCameraOff);
                                        }}
                                        className="vrc-dock__icon-btn"
                                    >
                                        {isCameraOff ? 'Cam On' : 'Cam Off'}
                                    </button>
                                )}

                                {sourceMode === 'CAMERA' && (
                                    <button
                                        onClick={() => {
                                            const next = !useRearCamera;
                                            setUseRearCamera(next);
                                            initializeMedia('CAMERA', next);
                                        }}
                                        disabled={streamState === 'RECORDING' || isCameraOff}
                                        className="vrc-dock__icon-btn"
                                    >
                                        Flip Cam
                                    </button>
                                )}

                                <button
                                    onClick={() => initializeMedia(sourceMode === 'CAMERA' ? 'SCREEN' : 'CAMERA', useRearCamera)}
                                    disabled={streamState === 'RECORDING'}
                                    className="vrc-dock__icon-btn"
                                >
                                    {sourceMode === 'SCREEN' ? 'Camera' : 'Screen'}
                                </button>

                                {streamState === 'PREVIEW_LIVE' ? (
                                    <button onClick={startRecording} className="vrc-btn vrc-btn--record">
                                        Start
                                    </button>
                                ) : (
                                    <button onClick={stopRecording} className="vrc-btn vrc-btn--stop">
                                        Stop
                                    </button>
                                )}
                            </>
                        )}

                        {streamState === 'REVIEW' && (
                            <>
                                <button
                                    onClick={() => {
                                        setFinalVideoUrl(null);
                                        setErrorMsg(null);
                                        setElapsedSeconds(0);
                                        initializeMedia('CAMERA', useRearCamera);
                                    }}
                                    className="vrc-btn vrc-btn--secondary"
                                >
                                    Record New
                                </button>
                                {!finalVideoUrl && errorMsg && (
                                    <button onClick={handleMergeChunks} className="vrc-btn vrc-btn--save">
                                        Retry Save
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MountainVideoStudioUI;