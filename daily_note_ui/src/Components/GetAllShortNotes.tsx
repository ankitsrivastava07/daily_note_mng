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

function GetAllShortNotes() {
    const navigate = useNavigate();

    const [shortNotes, setShortNotes] = useState<ShortNote[]>([]);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    const userId = localStorage.getItem("userid") || "ankit0397";

    const fetchShortNotes = useCallback(async (cursor: Record<string, unknown> | null = null) => {
        if (!userId) {
            setError("Your session could not be identified. Please sign in again.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let url = `${API_BASE_URL}/api/v1/short-note?limit=${PAGE_SIZE}`;
            if (cursor) {
                url += `&lastKey=${encodeURIComponent(JSON.stringify(cursor))}`;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: { userid: userId, Accept: "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Unable to load notes (HTTP ${response.status}).`);
            }

            const responseData: ListResponse = await response.json();

            if (responseData.success === false) {
                throw new Error(responseData.message || "Unable to load your notes.");
            }

            const result = responseData.data;
            if (!result) throw new Error("The server returned an unexpected response.");

            const items = result.items || [];
            const nextKey = result.lastEvaluatedKey || null;

            setShortNotes(previous => cursor ? [...previous, ...items] : items);
            setLastEvaluatedKey(nextKey);
            setHasMore(Boolean(nextKey));
        } catch (err) {
            console.error("Fetch short notes error:", err);
            setError(err instanceof Error ? err.message : "Something went wrong while loading notes.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void fetchShortNotes();
    }, [fetchShortNotes]);

    const categories = useMemo(() => {
        const values = shortNotes
            .map(note => note.category?.trim())
            .filter((value): value is string => Boolean(value));
        return ["ALL", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))];
    }, [shortNotes]);

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
                    (note.category || "").toLowerCase() === selectedCategory.toLowerCase();

                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
            });
    }, [shortNotes, searchTerm, selectedCategory, sortOrder]);

    const handleOpen = (noteId: string) => {
        navigate(`/short-note/${encodeURIComponent(noteId)}`);
    };

    const handleDelete = async (noteId: string) => {
        if (!window.confirm("Delete this note permanently? This action cannot be undone.")) return;

        if (!userId) {
            window.alert("Your session could not be identified. Please sign in again.");
            return;
        }

        setDeletingId(noteId);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/v1/short-note/${encodeURIComponent(noteId)}`,
                {
                    method: "DELETE",
                    headers: { userid: userId, Accept: "application/json" }
                }
            );

            if (!response.ok) {
                throw new Error(`Delete failed (HTTP ${response.status}).`);
            }

            const responseData = await response.json();
            if (responseData.success === false) {
                throw new Error(responseData.message || "Unable to delete this note.");
            }

            setShortNotes(previous => previous.filter(note => note.id !== noteId));
        } catch (err) {
            console.error("Delete short note error:", err);
            window.alert(err instanceof Error ? err.message : "Failed to delete this note.");
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
        const normalized = (category || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `sn-category sn-category-${normalized}`;
    };

    const handleLoadMore = () => {
        if (!loading && hasMore && lastEvaluatedKey) {
            void fetchShortNotes(lastEvaluatedKey);
        }
    };

    const handleRetry = () => {
        if (!loading) void fetchShortNotes();
    };

    return (
        <main className="sn-page">
            <section className="sn-page-heading">
                <div>
                    <div className="sn-eyebrow">WORKSPACE / NOTES</div>
                    <h1>Short notes</h1>
                    <p className="sn-subtitle">Capture ideas, keep important details, and find them when you need them.</p>
                </div>

                <button className="sn-primary-button" onClick={() => navigate("/short-note")}>
                    <span className="sn-plus">+</span>
                    Create note
                </button>
            </section>

            <section className="sn-summary-strip" aria-label="Notes overview">
                <div className="sn-summary-item">
                    <span className="sn-summary-label">TOTAL NOTES</span>
                    <strong>{shortNotes.length}</strong>
                    <span className="sn-summary-caption">Notes in this collection</span>
                </div>
                <div className="sn-summary-divider" />
                <div className="sn-summary-item">
                    <span className="sn-summary-label">CATEGORIES</span>
                    <strong>{Math.max(categories.length - 1, 0)}</strong>
                    <span className="sn-summary-caption">Distinct categories</span>
                </div>
                <div className="sn-summary-divider" />
                <div className="sn-summary-item">
                    <span className="sn-summary-label">CURRENT VIEW</span>
                    <strong>{visibleNotes.length}</strong>
                    <span className="sn-summary-caption">Matching notes</span>
                </div>
            </section>

            <section className="sn-content-card">
                <div className="sn-content-heading">
                    <div>
                        <h2>All notes</h2>
                        <p>Manage and organize your saved notes.</p>
                    </div>
                </div>

                <div className="sn-toolbar">
                    <label className="sn-search">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Search by title, category or ID..."
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            aria-label="Search notes"
                        />
                    </label>

                    <div className="sn-toolbar-filters">
                        <label className="sn-select-wrap">
                            <span>Category</span>
                            <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>
                                {categories.map(category => (
                                    <option key={category} value={category}>
                                        {category === "ALL" ? "All categories" : category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="sn-select-wrap">
                            <span>Sort</span>
                            <select value={sortOrder} onChange={event => setSortOrder(event.target.value as "newest" | "oldest")}>
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="sn-error" role="alert">
                        <div>
                            <strong>Something went wrong</strong>
                            <span>{error}</span>
                        </div>
                        <button onClick={handleRetry} disabled={loading}>Try again</button>
                    </div>
                )}

                {loading && shortNotes.length === 0 ? (
                    <div className="sn-state">
                        <span className="sn-spinner" />
                        <strong>Loading your notes</strong>
                        <span>Please wait while we fetch your collection.</span>
                    </div>
                ) : shortNotes.length === 0 && !error ? (
                    <div className="sn-state">
                        <div className="sn-empty-icon">✎</div>
                        <strong>Your notes start here</strong>
                        <span>Create a short note to keep useful information close at hand.</span>
                        <button className="sn-primary-button sn-empty-cta" onClick={() => navigate("/short-note")}>
                            Create your first note
                        </button>
                    </div>
                ) : visibleNotes.length === 0 && !error ? (
                    <div className="sn-state sn-compact-state">
                        <strong>No matching notes</strong>
                        <span>Try another search term or change the category filter.</span>
                        <button
                            className="sn-text-button"
                            onClick={() => { setSearchTerm(""); setSelectedCategory("ALL"); }}
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
                                        <th className="sn-note-column">NOTE</th>
                                        <th>CATEGORY</th>
                                        <th>CREATED</th>
                                        <th className="sn-actions-column">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleNotes.map(note => (
                                        <tr key={note.id} className="sn-row">
                                            <td>
                                                <span className="sn-note-title">
                                                    {note.title || "Untitled note"}
                                                </span>
                                                <span className="sn-note-id">ID: {note.id}</span>
                                            </td>
                                            <td>
                                                <span className={getCategoryClass(note.category)}>
                                                    {note.category || "Uncategorized"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sn-date">{formatDate(note.createdAt)}</span>
                                            </td>
                                            <td>
                                                <div className="sn-row-actions">
                                                    <button
                                                        className="sn-open-button"
                                                        onClick={() => handleOpen(note.id)}
                                                        aria-label={`Open ${note.title || "note"}`}
                                                    >
                                                        Open <span aria-hidden="true">↗</span>
                                                    </button>
                                                    <button
                                                        className="sn-delete-button"
                                                        onClick={() => void handleDelete(note.id)}
                                                        disabled={deletingId === note.id}
                                                        aria-label={`Delete ${note.title || "note"}`}
                                                    >
                                                        {deletingId === note.id ? "Deleting…" : "Delete"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <footer className="sn-table-footer">
                            <span>
                                Showing <strong>{visibleNotes.length}</strong> of <strong>{shortNotes.length}</strong> loaded notes
                            </span>
                            {hasMore ? (
                                <button className="sn-load-more" onClick={handleLoadMore} disabled={loading}>
                                    {loading ? "Loading…" : "Load more notes"}
                                    {!loading && <span aria-hidden="true"> ↓</span>}
                                </button>
                            ) : (
                                <span className="sn-end-label">You’re all caught up</span>
                            )}
                        </footer>
                    </>
                )}
            </section>
        </main>
    );
}

export default GetAllShortNotes;
