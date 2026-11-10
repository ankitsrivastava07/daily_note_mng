
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./CSS/ShortNoteComponent.css";
import "./CSS/ShortNoteViewCss.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ShortNoteView() {
    const { id } = useParams();

    const [shortNote, setShortNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch short note
    useEffect(() => {
        const controller = new AbortController();

        const fetchShortNote = async () => {
            try {
                setLoading(true);
                setError("");
                setShortNote(null);

                if (!API_BASE_URL) {
                    throw new Error("API URL is not configured.");
                }

                if (!id) {
                    throw new Error("Short note ID is missing.");
                }

                const userId = localStorage.getItem("userId") || "ankit0397";

                if (!userId) {
                    throw new Error("User ID not found. Please login.");
                }

                const response = await fetch(
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

                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(
                        message || `Request failed: ${response.status}`
                    );
                }

                const responseData = await response.json();

                if (!responseData.success) {
                    throw new Error(
                        responseData.message || "Unable to fetch short note."
                    );
                }

                const note = responseData.data;

                if (!note) {
                    throw new Error("Short note not found.");
                }

                // API response does not currently include id.
                // Use route ID as fallback.
                const attachments = Array.isArray(note.downloadUrl)
                    ? note.downloadUrl
                    : note.downloadUrl
                        ? [note.downloadUrl]
                        : [];

                setShortNote({
                    ...note,
                    id: note.id || id,
                    downloadUrl: attachments
                });

            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Short note fetch error:", err);
                    setError(err.message || "Unable to load short note.");
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

    // Format date in IST
    const formatDate = (dateValue) => {
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

    // Check image file
    const isImage = (url) => {
        try {
            const pathname = new URL(url).pathname.toLowerCase();

            return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(pathname);
        } catch {
            return false;
        }
    };

    // Get filename from URL
    const getFileName = (url, index) => {
        try {
            const pathname = new URL(url).pathname;
            return decodeURIComponent(pathname.split("/").pop());
        } catch {
            return `Attachment ${index + 1}`;
        }
    };

    // Render clickable URLs in note content
    const renderContentLine = (line, index) => {
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

    // Loading state
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

    // Error state
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
        .filter(line => line.trim() !== "");

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
                            {contentLines.map((line, index) =>
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

                                {shortNote.downloadUrl.map((url, index) => {

                                    const fileName = getFileName(url, index);
                                    const image = isImage(url);

                                    return (
                                        <div
                                            className="short-note-attachment-card"
                                            key={`${url}-${index}`}
                                        >

                                            {image ? (
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="short-note-image-link"
                                                >
                                                    <img
                                                        src={url}
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
                                })}

                            </div>

                        </section>
                    </>
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
