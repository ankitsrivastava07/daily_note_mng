import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import "./CSS/ShortNoteComponent.css";
import "./CSS/ShortNoteViewCss.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DMS_API_BASE_URL = import.meta.env.VITE_DMS_API_BASE_URL;

const DEFAULT_USER_ID = "ankit0397";

interface Attachment {
    fileName: string;
    downloadUrl: string;
    contentType?: string;
}

interface ShortNote {
    id: string;
    name?: string | null;
    title?: string | null;
    content?: string | null;
    categoryId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    downloadUrl: Attachment[];
    [key: string]: any;
}

function ShortNoteView() {
    const { id } = useParams();

    const [shortNote, setShortNote] = useState<ShortNote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attachmentError, setAttachmentError] = useState("");
    const [attachmentLoading, setAttachmentLoading] = useState(true);
    const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);

    // ==========================================
    // FETCH SHORT NOTE AND DMS ATTACHMENTS
    // ==========================================

    useEffect(() => {
        const controller = new AbortController();

        const fetchShortNote = async () => {
            try {
                setLoading(true);
                setAttachmentLoading(true);
                setError("");
                setAttachmentError("");
                setShortNote(null);

                if (!API_BASE_URL) {
                    throw new Error("Note API URL is not configured.");
                }

                if (!DMS_API_BASE_URL) {
                    throw new Error("DMS API URL is not configured.");
                }

                if (!id) {
                    throw new Error("Short note ID is missing.");
                }

                const userId =
                    localStorage.getItem("userId") || DEFAULT_USER_ID;

                // ==========================================
                // STEP 1: FETCH NOTE FROM NOTE SERVICE
                // ==========================================

                const noteResponse = await fetch(
                    `${API_BASE_URL}/api/v1/short-note/${encodeURIComponent(id)}`,
                    {
                        method: "GET",
                        headers: {
                            userid: userId,
                            Accept: "application/json"
                        },
                        signal: controller.signal
                    }
                );

                if (!noteResponse.ok) {
                    throw new Error(
                        await noteResponse.text() ||
                        `Note API failed: ${noteResponse.status}`
                    );
                }

                const noteResult = await noteResponse.json();

                if (!noteResult.success || !noteResult.data) {
                    throw new Error(
                        noteResult.message || "Unable to fetch short note."
                    );
                }

                const note = noteResult.data;
                const referenceId = note.id || id;

                // Display the note content immediately
                setShortNote({
                    ...note,
                    id: referenceId,
                    downloadUrl: []
                });
                setLoading(false);

                // ==========================================
                // STEP 2: FETCH ALL FILES FROM DMS WITH 5S DELAY
                // ==========================================

                try {
                    // Create a minimum 5-second timer for the attachment loading state
                    const minTimerPromise = new Promise((resolve) =>
                        setTimeout(resolve, 5000)
                    );

                    const dmsUrl =
                        `${DMS_API_BASE_URL}/api/v1/${encodeURIComponent(referenceId)}/dms`;

                    const dmsPromise = fetch(dmsUrl, {
                        method: "GET",
                        headers: {
                            userid: userId,
                            Accept: "application/json"
                        },
                        signal: controller.signal
                    });

                    const [dmsResponse] = await Promise.all([
                        dmsPromise,
                        minTimerPromise
                    ]);

                    if (!dmsResponse.ok) {
                        throw new Error(
                            await dmsResponse.text() ||
                            `DMS API failed: ${dmsResponse.status}`
                        );
                    }

                    const dmsResult = await dmsResponse.json();

                    if (dmsResult.success === false) {
                        throw new Error(
                            dmsResult.message || "DMS retrieval failed."
                        );
                    }

                    const files = Array.isArray(dmsResult.data)
                        ? dmsResult.data
                        : Array.isArray(dmsResult.data?.files)
                            ? dmsResult.data.files
                            : [];

                    const attachments: Attachment[] = files
                        .map((file: any, index: number) => {
                            const downloadUrl =
                                typeof file === "string"
                                    ? file
                                    : file.downloadUrl ||
                                      file.presignedUrl ||
                                      file.url;

                            if (
                                typeof downloadUrl !== "string" ||
                                !downloadUrl.startsWith("https://")
                            ) {
                                return null;
                            }

                            let fileName =
                                typeof file === "object"
                                    ? file.fileName ||
                                      file.originalFileName ||
                                      file.name
                                    : null;

                            if (!fileName) {
                                fileName = thisGetFileName(
                                    downloadUrl,
                                    index
                                );
                            }

                            return {
                                fileName,
                                downloadUrl,
                                contentType:
                                    typeof file === "object"
                                        ? file.contentType ||
                                          file.mimeType ||
                                          ""
                                        : ""
                            };
                        })
                        .filter(
                            (file: Attachment | null): file is Attachment =>
                                file !== null
                        );

                    if (!controller.signal.aborted) {
                        setShortNote((prev) =>
                            prev ? { ...prev, downloadUrl: attachments } : null
                        );
                    }

                } catch (dmsError: any) {
                    if (dmsError.name === "AbortError") {
                        throw dmsError;
                    }

                    console.error("DMS error:", dmsError);

                    if (!controller.signal.aborted) {
                        setAttachmentError(
                            dmsError.message ||
                            "Unable to retrieve attachments."
                        );
                    }
                } finally {
                    if (!controller.signal.aborted) {
                        setAttachmentLoading(false);
                    }
                }

            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("Short note error:", err);
                    setError(
                        err.message || "Unable to load short note."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setAttachmentLoading(false);
                }
            }
        };

        fetchShortNote();

        return () => controller.abort();

    }, [id]);

    // ==========================================
    // GET FILE NAME FROM PRESIGNED URL
    // ==========================================

    const thisGetFileName = (url: string, index: number) => {
        try {
            const pathname = new URL(url).pathname;
            const encodedName = pathname.split("/").pop();

            if (!encodedName) {
                return `Attachment ${index + 1}`;
            }

            let fileName = decodeURIComponent(encodedName);
            const uuidPrefix =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

            fileName = fileName.replace(uuidPrefix, "");

            return fileName || `Attachment ${index + 1}`;

        } catch {
            return `Attachment ${index + 1}`;
        }
    };

    // ==========================================
    // FORMAT DATE IN IST
    // ==========================================

    const formatDate = (dateValue?: string) => {
        if (!dateValue) return "Not available";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Invalid date";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        });
    };

    // ==========================================
    // CHECK IMAGE
    // ==========================================

    const isImage = (attachment: Attachment) => {
        if (attachment.contentType?.startsWith("image/")) {
            return true;
        }

        return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
            attachment.fileName
        );
    };

    // ==========================================
    // OPEN DOCUMENT ATTACHMENT
    // ==========================================

    const handleOpenDocument = (attachment: Attachment) => {
        setOpeningAttachment(attachment.downloadUrl);

        const documentWindow = window.open(
            attachment.downloadUrl,
            "_blank"
        );

        if (!documentWindow) {
            setOpeningAttachment(null);
            setAttachmentError(
                "The document could not be opened. Please allow pop-ups and try again."
            );
            return;
        }

        let spinnerCleared = false;
        const clearSpinner = () => {
            if (spinnerCleared) return;
            spinnerCleared = true;
            window.clearTimeout(fallbackTimer);
            setOpeningAttachment((current) =>
                current === attachment.downloadUrl ? null : current
            );
        };

        const fallbackTimer = window.setTimeout(clearSpinner, 15000);

        try {
            documentWindow.addEventListener("load", clearSpinner, { once: true });
        } catch {
            // Fallback timer handles cleanup
        }
    };

    // ==========================================
    // RENDER CLICKABLE URLS
    // ==========================================

    const renderContentLine = (line: string, index: number) => {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const parts = line.split(urlPattern);

        return (
            <p className="short-note-content-line" key={index}>
                {parts.map((part, partIndex) => {
                    if (/^https?:\/\//i.test(part)) {
                        const cleanUrl = part.replace(/[.,;!?]+$/, "");

                        return (
                            <a
                                key={partIndex}
                                href={cleanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="short-note-link"
                            >
                                {cleanUrl} ↗
                            </a>
                        );
                    }

                    return <span key={partIndex}>{part}</span>;
                })}
            </p>
        );
    };

    // ==========================================
    // LOADING STATE (Note itself loads normally)
    // ==========================================

    if (loading) {
        return (
            <main className="short-note-view-container">
                <div className="short-note-state">
                    <span className="short-note-spinner" />
                    <h3>Loading short note...</h3>
                </div>
            </main>
        );
    }

    // ==========================================
    // ERROR STATE
    // ==========================================

    if (error) {
        return (
            <main className="short-note-view-container">
                <div className="short-note-state short-note-error-card">
                    <h2>Unable to load note</h2>
                    <p>{error}</p>

                    <Link
                        to="/get-all-short-notes"
                        className="short-note-back-button"
                    >
                        ← Back to Short Notes
                    </Link>
                </div>
            </main>
        );
    }

    if (!shortNote) {
        return (
            <main className="short-note-view-container">
                <div className="short-note-state">
                    <h2>Short note not found</h2>
                    <Link to="/get-all-short-notes">
                        Back to Short Notes
                    </Link>
                </div>
            </main>
        );
    }

    const contentLines = (shortNote.content || "")
        .split(/\r?\n/)
        .filter((line: string) => line.trim() !== "");

    return (
        <>
            <style>{`
                .short-note-document-open-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 0;
                    padding: 8px;
                    background: transparent;
                    font-size: 2.5rem;
                    cursor: pointer;
                }

                .short-note-document-open-button:disabled {
                    cursor: wait;
                    opacity: 0.75;
                }

                .short-note-document-spinner {
                    display: inline-block;
                    width: 28px;
                    height: 28px;
                    border: 3px solid rgba(100, 116, 139, 0.25);
                    border-top-color: currentColor;
                    border-radius: 50%;
                    animation: short-note-document-spin 0.75s linear infinite;
                }

                .short-note-attachment-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 18px 0;
                    color: #64748b;
                    text-align: center;
                }

                .short-note-dms-loading-gif {
                    display: block;
                    width: 150px;
                    height: 115px;
                    max-width: 100%;
                    object-fit: contain;
                }

                .short-note-attachment-loading p {
                    margin: 0;
                }

                @keyframes short-note-document-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <main className="short-note-view-container">

                <div className="short-note-view-topbar">
                    <Link
                        to="/get-all-short-notes"
                        className="short-note-back-button"
                    >
                        ← Back to Short Notes
                    </Link>

                    <div className="short-note-view-actions">
                        <Link
                            to={`/short-note/${shortNote.id}/edit`}
                            className="short-note-edit-button"
                        >
                            ✎ Edit Note
                        </Link>
                    </div>
                </div>

                <article className="short-note-detail-card">

                    <div className="short-note-detail-header">

                        <div className="short-note-detail-meta">
                            <span className="short-note-category-badge">
                                {shortNote.categoryId || "Uncategorized"}
                            </span>

                            <span className="short-note-type">
                                SHORT NOTE
                            </span>
                        </div>

                        <h1 className="short-note-detail-title">
                            {shortNote.title || "Untitled Note"}
                        </h1>

                        <p className="short-note-detail-subtitle">
                            Your saved note and information
                        </p>

                    </div>

                    <div className="short-note-detail-divider" />

                    <section className="short-note-detail-body">

                        <h3 className="short-note-section-title">
                            Note Content
                        </h3>

                        {contentLines.length > 0 ? (
                            <div className="short-note-formatted-content">
                                {contentLines.map(
                                    (line: string, index: number) =>
                                        renderContentLine(line, index)
                                )}
                            </div>
                        ) : (
                            <p className="short-note-no-content">
                                No content available.
                            </p>
                        )}

                    </section>

                    {/* DMS attachments section with 5-second minimum loading spinner */}
                    {(attachmentLoading || shortNote.downloadUrl.length > 0) && (
                        <>
                            <div className="short-note-detail-divider" />

                            <section className="short-note-attachments">

                                <h3 className="short-note-section-title">
                                    {attachmentLoading
                                        ? "Attachments"
                                        : `Attachments (${shortNote.downloadUrl.length})`}
                                </h3>

                                {attachmentLoading && (
                                    <div className="short-note-attachment-loading">
                                        <img
                                            src="/professional-dms-loader.gif"
                                            alt="Loading attachments"
                                            className="short-note-dms-loading-gif"
                                        />
                                        <p>Retrieving attachments</p>
                                    </div>
                                )}

                                {!attachmentLoading && (
                                    <div className="short-note-attachment-grid">

                                        {shortNote.downloadUrl.map(
                                            (attachment, index) => {

                                                const fileName = attachment.fileName;
                                                const image = isImage(attachment);

                                                return (
                                                    <div
                                                        className="short-note-attachment-card"
                                                        key={`${attachment.downloadUrl}-${index}`}
                                                    >

                                                        {image ? (
                                                            <a
                                                                href={attachment.downloadUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="short-note-image-link"
                                                            >
                                                                <img
                                                                    src={attachment.downloadUrl}
                                                                    alt={fileName}
                                                                    className="short-note-attachment-image"
                                                                    loading="lazy"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <div className="short-note-file-icon">
                                                                <button
                                                                    type="button"
                                                                    className="short-note-document-open-button"
                                                                    onClick={() => handleOpenDocument(attachment)}
                                                                    disabled={openingAttachment === attachment.downloadUrl}
                                                                    aria-label={`Open ${fileName}`}
                                                                    title={`Open ${fileName}`}
                                                                >
                                                                    {openingAttachment === attachment.downloadUrl ? (
                                                                        <span
                                                                            className="short-note-document-spinner"
                                                                            aria-label="Opening document"
                                                                        />
                                                                    ) : (
                                                                        "📄"
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div className="short-note-attachment-info">
                                                            <span
                                                                className="short-note-attachment-name"
                                                                title={fileName}
                                                            >
                                                                {fileName}
                                                            </span>
                                                        </div>

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>
                                )}

                            </section>
                        </>
                    )}

                    {attachmentError && (
                        <div className="short-note-error-card">
                            <p>
                                Unable to retrieve attachments: {attachmentError}
                            </p>
                        </div>
                    )}

                    <div className="short-note-detail-divider" />

                    <section className="short-note-detail-footer">

                        <div className="short-note-info-item">
                            <span className="short-note-info-label">
                                Short ID
                            </span>

                            <span className="short-note-info-value note-id">
                                {shortNote.id}
                            </span>
                        </div>

                        <div className="short-note-info-item">
                            <span className="short-note-info-label">
                                Created At
                            </span>

                            <span className="short-note-info-value">
                                {formatDate(shortNote.createdAt)}
                            </span>
                        </div>

                        {shortNote.updatedAt && (
                            <div className="short-note-info-item">
                                <span className="short-note-info-label">
                                    Updated At
                                </span>

                                <span className="short-note-info-value">
                                    {formatDate(shortNote.updatedAt)}
                                </span>
                            </div>
                        )}

                    </section>

                </article>
            </main>
        </>
    );
}

export default ShortNoteView;