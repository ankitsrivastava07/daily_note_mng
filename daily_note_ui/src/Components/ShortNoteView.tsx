
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
    const [attachmentLoading, setAttachmentLoading] = useState(false);

    // ==========================================
    // FETCH SHORT NOTE AND DMS ATTACHMENTS
    // ==========================================

    useEffect(() => {
        const controller = new AbortController();

        const fetchShortNote = async () => {
            try {
                setLoading(true);
                setError("");
                setAttachmentError("");
                setAttachmentLoading(false);
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

                // Use the ID returned by Note Service.
                const referenceId = note.id || id;

                console.log("Note fetched:", note);
                console.log("DMS reference ID:", referenceId);

                let attachments: Attachment[] = [];

                // ==========================================
                // STEP 2: FETCH ALL FILES FROM DMS
                // ==========================================

                setAttachmentLoading(true);

                try {
                    const dmsUrl =
                        `${DMS_API_BASE_URL}/api/v1/${encodeURIComponent(referenceId)}/dms`;

                    const dmsResponse = await fetch(dmsUrl, {
                        method: "GET",
                        headers: {
                            userid: userId,
                            Accept: "application/json"
                        },
                        signal: controller.signal
                    });

                    if (!dmsResponse.ok) {
                        throw new Error(
                            await dmsResponse.text() ||
                            `DMS API failed: ${dmsResponse.status}`
                        );
                    }

                    const dmsResult = await dmsResponse.json();

                    console.log("DMS response:", dmsResult);

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

                    // ==========================================
                    // STEP 3: EXTRACT ORIGINAL FILE NAMES
                    // ==========================================

                    attachments = files
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

                            // Preserve original filename from S3 URL.
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

                    console.log("Attachments loaded:", attachments);

                } catch (dmsError: any) {
                    if (dmsError.name === "AbortError") {
                        throw dmsError;
                    }

                    console.error("DMS error:", dmsError);

                    setAttachmentError(
                        dmsError.message ||
                        "Unable to retrieve attachments."
                    );
                } finally {
                    if (!controller.signal.aborted) {
                        setAttachmentLoading(false);
                    }
                }

                if (controller.signal.aborted) {
                    return;
                }

                // ==========================================
                // STEP 4: UPDATE NOTE
                // ==========================================

                setShortNote({
                    ...note,
                    id: referenceId,
                    downloadUrl: attachments
                });

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

            // Decode the original S3 object filename.
            let fileName = decodeURIComponent(encodedName);

            // Remove S3 object-key prefix if present.
            // Example: UUID_pasted-image.png
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
    // LOADING STATE
    // ==========================================

    if (loading) {
        return (
            <main className="short-note-view-container">
                <div className="short-note-state">
                    <span className="short-note-spinner" />
                    <h3>Loading short note...</h3>
                    <p>Please wait while we fetch your note.</p>
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

    // ==========================================
    // MAIN UI - ORIGINAL STRUCTURE PRESERVED
    // ==========================================

    return (
        <main className="short-note-view-container">

            {/* Top navigation */}

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

            {/* Main note card */}

            <article className="short-note-detail-card">

                {/* Note header */}

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

                {/* Note content */}

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

                {/* DMS attachments */}

                {shortNote.downloadUrl.length > 0 && (
                    <>
                        <div className="short-note-detail-divider" />

                        <section className="short-note-attachments">

                            <h3 className="short-note-section-title">
                                Attachments ({shortNote.downloadUrl.length})
                            </h3>

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
                                                        📄
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

                        </section>
                    </>
                )}

                {attachmentLoading && (
                    <div className="short-note-state">
                        <span className="short-note-spinner" />
                        <p>Retrieving attachments...</p>
                    </div>
                )}

                {attachmentError && (
                    <div className="short-note-error-card">
                        <p>
                            Unable to retrieve attachments: {attachmentError}
                        </p>
                    </div>
                )}

                <div className="short-note-detail-divider" />

                {/* Footer metadata */}

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
    );
}

export default ShortNoteView;
