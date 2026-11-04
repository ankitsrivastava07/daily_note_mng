
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CSS/GetAllShortNotes.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_SIZE = 10;

type ShortNote = {
    id: string;
    title?: string;
    category?: string;
    createdAt?: string;
};

type ListResponse = {
    success?: boolean;
    message?: string;
    data?: {
        items?: ShortNote[];
        lastEvaluatedKey?: Record<string, unknown> | null;
    };
};

type DeleteResponse = {
    success?: boolean;
    message?: string;
};

function GetAllShortNotes() {
    const navigate = useNavigate();

    const [shortNotes, setShortNotes] = useState<ShortNote[]>([]);
    const [lastEvaluatedKey, setLastEvaluatedKey] =
        useState<Record<string, unknown> | null>(null);

    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [hasMore, setHasMore] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [sortOrder, setSortOrder] =
        useState<"newest" | "oldest">("newest");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState<ShortNote | null>(null);
    const [deleteError, setDeleteError] = useState("");

    const userId = localStorage.getItem("userid") || "ankit0397";

    // Fetch short notes
    const fetchShortNotes = useCallback(
        async (cursor: Record<string, unknown> | null = null) => {
            if (!userId) {
                setError(
                    "Your session could not be identified. Please sign in again."
                );
                return;
            }

            setLoading(true);
            setError("");

            try {
                let url =
                    `${API_BASE_URL}/api/v1/short-note?limit=${PAGE_SIZE}`;

                if (cursor) {
                    url +=
                        `&lastKey=${encodeURIComponent(JSON.stringify(cursor))}`;
                }

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        userid: userId,
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error(
                        response.status === 502 ||
                            response.status === 503 ||
                            response.status === 504
                            ? "The notes service is temporarily unavailable. Please try again."
                            : response.status === 401 ||
                                response.status === 403
                                ? "Your session may have expired. Please sign in again."
                                : "Unable to load your notes. Please try again."
                    );
                }

                const responseData: ListResponse =
                    await response.json();

                if (responseData.success === false) {
                    throw new Error(
                        responseData.message || "Unable to load your notes."
                    );
                }

                const result = responseData.data;

                if (!result) {
                    throw new Error(
                        "The server returned an unexpected response."
                    );
                }

                const items = result.items || [];
                const nextKey = result.lastEvaluatedKey || null;

                setShortNotes(previous =>
                    cursor ? [...previous, ...items] : items
                );

                setLastEvaluatedKey(nextKey);
                setHasMore(Boolean(nextKey));
            } catch (err) {
                console.error("Fetch short notes error:", err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load notes. Please try again."
                );
            } finally {
                setLoading(false);
            }
        },
        [userId]
    );

    useEffect(() => {
        void fetchShortNotes();
    }, [fetchShortNotes]);

    // Categories
    const categories = useMemo(() => {
        const values = shortNotes
            .map(note => note.category?.trim())
            .filter((value): value is string => Boolean(value));

        return [
            "ALL",
            ...Array.from(new Set(values)).sort((a, b) =>
                a.localeCompare(b)
            )
        ];
    }, [shortNotes]);

    // Search, filter and sort
    const visibleNotes = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return [...shortNotes]
            .filter(note => {
                const matchesSearch =
                    !query ||
                    (note.title || "").toLowerCase().includes(query) ||
                    (note.category || "").toLowerCase().includes(query) ||
                    note.id.toLowerCase().includes(query);

                const matchesCategory =
                    selectedCategory === "ALL" ||
                    (note.category || "").toLowerCase() ===
                    selectedCategory.toLowerCase();

                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                const aTime = a.createdAt
                    ? new Date(a.createdAt).getTime()
                    : 0;

                const bTime = b.createdAt
                    ? new Date(b.createdAt).getTime()
                    : 0;

                return sortOrder === "newest"
                    ? bTime - aTime
                    : aTime - bTime;
            });
    }, [shortNotes, searchTerm, selectedCategory, sortOrder]);

    // Only Open button navigates
    const handleOpen = (noteId: string) => {
        navigate(`/short-note/${encodeURIComponent(noteId)}`);
    };

    // Show confirmation modal
    const openDeleteModal = (note: ShortNote) => {
        if (deletingId) return;

        setSelectedNote(note);
        setDeleteError("");
        setShowDeleteModal(true);
    };

    // Close confirmation modal
    const closeDeleteModal = () => {
        if (deletingId) return;

        setShowDeleteModal(false);
        setSelectedNote(null);
        setDeleteError("");
    };

    // Confirm deletion
    const confirmDelete = async () => {
        if (!selectedNote || deletingId) return;

        if (!userId) {
            setDeleteError(
                "Your session could not be identified. Please sign in again."
            );
            return;
        }

        const noteId = selectedNote.id;

        setDeletingId(noteId);
        setDeleteError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/v1/short-note/${encodeURIComponent(noteId)}`,
                {
                    method: "DELETE",
                    headers: {
                        userid: userId,
                        Accept: "application/json"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 502 ||
                        response.status === 503 ||
                        response.status === 504
                        ? "The notes service is temporarily unavailable. Please try again."
                        : "Unable to delete this note. Please try again."
                );
            }

            // Supports JSON response and HTTP 204 No Content.
            const responseText = await response.text();

            if (responseText.trim()) {
                const responseData: DeleteResponse =
                    JSON.parse(responseText);

                if (responseData.success === false) {
                    throw new Error(
                        responseData.message ||
                        "Unable to delete this note."
                    );
                }
            }

            // Remove note only after successful API response.
            setShortNotes(previous =>
                previous.filter(note => note.id !== noteId)
            );

            setShowDeleteModal(false);
            setSelectedNote(null);
            setDeleteError("");
        } catch (err) {
            console.error("Delete short note error:", err);

            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "Unable to delete this note. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateValue?: string) => {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "—";

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    };

    const getCategoryClass = (category?: string) => {
        const normalized = (category || "other")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");

        return `sn-category sn-category-${normalized}`;
    };

    const handleLoadMore = () => {
        if (!loading && hasMore && lastEvaluatedKey) {
            void fetchShortNotes(lastEvaluatedKey);
        }
    };

    const handleRetry = () => {
        if (!loading) {
            void fetchShortNotes();
        }
    };

    return (
        <main className="sn-page">
            {/* Page Header */}
            <section className="sn-page-heading">
                <div>
                    <div className="sn-eyebrow">
                        WORKSPACE / NOTES
                    </div>

                    <h1>Short notes</h1>

                    <p className="sn-subtitle">
                        Capture ideas, keep important details, and find
                        them when you need them.
                    </p>
                </div>

                <button
                    type="button"
                    className="sn-primary-button"
                    onClick={() => navigate("/short-note")}
                >
                    <span className="sn-plus">+</span>
                    Create note
                </button>
            </section>

            {/* Summary */}
            <section
                className="sn-summary-strip"
                aria-label="Notes overview"
            >
                <div className="sn-summary-item">
                    <span className="sn-summary-label">
                        TOTAL NOTES
                    </span>

                    <strong>{shortNotes.length}</strong>

                    <span className="sn-summary-caption">
                        Notes in this collection
                    </span>
                </div>

                <div className="sn-summary-divider" />

                <div className="sn-summary-item">
                    <span className="sn-summary-label">
                        CATEGORIES
                    </span>

                    <strong>
                        {Math.max(categories.length - 1, 0)}
                    </strong>

                    <span className="sn-summary-caption">
                        Distinct categories
                    </span>
                </div>

                <div className="sn-summary-divider" />

                <div className="sn-summary-item">
                    <span className="sn-summary-label">
                        CURRENT VIEW
                    </span>

                    <strong>{visibleNotes.length}</strong>

                    <span className="sn-summary-caption">
                        Matching notes
                    </span>
                </div>
            </section>

            {/* Notes Content */}
            <section className="sn-content-card">
                <div className="sn-content-heading">
                    <div>
                        <h2>All notes</h2>
                        <p>Manage and organize your saved notes.</p>
                    </div>

                    <span className="sn-count-pill">
                        {visibleNotes.length} shown
                    </span>
                </div>

                {/* Toolbar */}
                <div className="sn-toolbar">
                    <label className="sn-search">
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" />
                        </svg>

                        <input
                            type="search"
                            placeholder="Search by title, category or ID..."
                            value={searchTerm}
                            onChange={event =>
                                setSearchTerm(event.target.value)
                            }
                            aria-label="Search notes"
                        />
                    </label>

                    <div className="sn-toolbar-filters">
                        <label className="sn-select-wrap">
                            <span>Category</span>

                            <select
                                value={selectedCategory}
                                onChange={event =>
                                    setSelectedCategory(event.target.value)
                                }
                            >
                                {categories.map(category => (
                                    <option
                                        key={category}
                                        value={category}
                                    >
                                        {category === "ALL"
                                            ? "All categories"
                                            : category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="sn-select-wrap">
                            <span>Sort</span>

                            <select
                                value={sortOrder}
                                onChange={event =>
                                    setSortOrder(
                                        event.target.value as
                                        "newest" | "oldest"
                                    )
                                }
                            >
                                <option value="newest">
                                    Newest first
                                </option>

                                <option value="oldest">
                                    Oldest first
                                </option>
                            </select>
                        </label>
                    </div>
                </div>

                {/* Load Error */}

                {/* Load Error */}
                {error && (
                    <div className="sn-error-card" role="alert">
                        <div className="sn-error-icon" aria-hidden="true">
                            !
                        </div>

                        <div className="sn-error-content">
                            <h3>Unable to load your notes</h3>

                            <p>{error}</p>

                            <span className="sn-error-hint">
                                Your notes are safe. Please try again in a moment.
                            </span>
                        </div>

                        <button
                            type="button"
                            className="sn-error-retry"
                            onClick={handleRetry}
                            disabled={loading}
                        >
                            <span aria-hidden="true">↻</span>
                            {loading ? "Retrying..." : "Try again"}
                        </button>
                    </div>
                )}

                {/* Loading / Empty / Table */}
                {loading && shortNotes.length === 0 ? (
                    <div className="sn-state">
                        <span className="sn-spinner" />

                        <strong>Loading your notes</strong>

                        <span>
                            Please wait while we fetch your collection.
                        </span>
                    </div>
                ) : shortNotes.length === 0 && !error ? (
                    <div className="sn-state">
                        <div className="sn-empty-icon">✎</div>

                        <strong>Your notes start here</strong>

                        <span>
                            Create a short note to keep useful
                            information close at hand.
                        </span>

                        <button
                            type="button"
                            className="sn-primary-button sn-empty-cta"
                            onClick={() => navigate("/short-note")}
                        >
                            Create your first note
                        </button>
                    </div>
                ) : visibleNotes.length === 0 && !error ? (
                    <div className="sn-state sn-compact-state">
                        <strong>No matching notes</strong>

                        <span>
                            Try another search term or change the
                            category filter.
                        </span>

                        <button
                            type="button"
                            className="sn-text-button"
                            onClick={() => {
                                setSearchTerm("");
                                setSelectedCategory("ALL");
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="sn-table-scroll">
                            <table className="sn-table">
                                <thead>
                                    <tr>
                                        <th className="sn-note-column">
                                            NOTE
                                        </th>

                                        <th>CATEGORY</th>

                                        <th>CREATED</th>

                                        <th className="sn-actions-column">
                                            ACTIONS
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {visibleNotes.map(note => (
                                        <tr
                                            key={note.id}
                                            className="sn-row"
                                        >
                                            {/* Plain text title */}
                                            <td>
                                                <span className="sn-note-title">
                                                    {note.title ||
                                                        "Untitled note"}
                                                </span>

                                                <span className="sn-note-id">
                                                    ID: {note.id}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={getCategoryClass(
                                                        note.category
                                                    )}
                                                >
                                                    {note.category ||
                                                        "Uncategorized"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="sn-date">
                                                    {formatDate(
                                                        note.createdAt
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="sn-row-actions">
                                                    <button
                                                        type="button"
                                                        className="sn-open-button"
                                                        onClick={() =>
                                                            handleOpen(note.id)
                                                        }
                                                        aria-label={`Open ${note.title ||
                                                            "note"
                                                            }`}
                                                    >
                                                        Open{" "}
                                                        <span aria-hidden="true">
                                                            ↗
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="sn-delete-button"
                                                        onClick={() =>
                                                            openDeleteModal(
                                                                note
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                        aria-label={`Delete ${note.title ||
                                                            "note"
                                                            }`}
                                                    >
                                                        {deletingId === note.id
                                                            ? "Deleting…"
                                                            : "Delete"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <footer className="sn-table-footer">
                            <span>
                                Showing{" "}
                                <strong>
                                    {visibleNotes.length}
                                </strong>{" "}
                                of{" "}
                                <strong>
                                    {shortNotes.length}
                                </strong>{" "}
                                loaded notes
                            </span>

                            {hasMore ? (
                                <button
                                    type="button"
                                    className="sn-load-more"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Loading…"
                                        : "Load more notes"}

                                    {!loading && (
                                        <span aria-hidden="true">
                                            {" "}↓
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <span className="sn-end-label">
                                    You’re all caught up
                                </span>
                            )}
                        </footer>
                    </>
                )}
            </section>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedNote && (
                <div
                    className="sn-modal-backdrop"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="sn-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sn-delete-modal-title"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="sn-modal-header">
                            <div className="sn-modal-title-group">
                                <div className="sn-modal-icon">
                                    <span>!</span>
                                </div>

                                <div>
                                    <h3 id="sn-delete-modal-title">
                                        Delete Short Note?
                                    </h3>

                                    <p>Please confirm this action.</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="sn-modal-close"
                                onClick={closeDeleteModal}
                                disabled={Boolean(deletingId)}
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="sn-modal-body">
                            <p>
                                Are you sure you want to delete this
                                Short Note?
                            </p>

                            <div className="sn-modal-note-preview">
                                <span>NOTE TITLE</span>

                                <strong>
                                    {selectedNote.title ||
                                        "Untitled note"}
                                </strong>
                            </div>

                            <p className="sn-delete-warning">
                                This action cannot be undone.
                            </p>

                            {deleteError && (
                                <p
                                    className="sn-modal-error"
                                    role="alert"
                                >
                                    {deleteError}
                                </p>
                            )}
                        </div>

                        <div className="sn-modal-footer">
                            <button
                                type="button"
                                className="sn-modal-cancel"
                                onClick={closeDeleteModal}
                                disabled={Boolean(deletingId)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="sn-modal-confirm-delete"
                                onClick={() => void confirmDelete()}
                                disabled={Boolean(deletingId)}
                            >
                                {deletingId
                                    ? "Deleting..."
                                    : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default GetAllShortNotes;
