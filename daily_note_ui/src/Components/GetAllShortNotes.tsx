
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CSS/ShortNoteComponent.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PAGE_SIZE = 10;

function GetAllShortNotes() {
    const navigate = useNavigate();

    const [shortNotes, setShortNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(false);

    const requestInProgress = useRef(false);

    const getAllShortNotes = useCallback(async (paginationKey = null) => {
        if (requestInProgress.current) return;

        requestInProgress.current = true;
        setLoading(true);
        setError("");

        try {
            if (!API_BASE_URL) {
                throw new Error("VITE_API_BASE_URL is not configured.");
            }

            const userId = localStorage.getItem("userId") || "ankit0397";

            const url = new URL(`${API_BASE_URL}/api/v1/short-note`);
            url.searchParams.set("limit", String(PAGE_SIZE));

            if (paginationKey) {
                const cursor = typeof paginationKey === "string"
                    ? paginationKey
                    : JSON.stringify(paginationKey);

                url.searchParams.set("lastKey", cursor);
            }

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    userid: userId,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(
                    message || `Request failed with status ${response.status}`
                );
            }

            const responseData = await response.json();

            if (responseData?.success === false) {
                throw new Error(responseData.message || "Unable to fetch notes.");
            }

            const result = responseData?.data;

            if (!result || !Array.isArray(result.items)) {
                throw new Error(
                    "Unexpected API response. Expected data.items."
                );
            }

            const notes = result.items;
            const nextKey = result.lastEvaluatedKey || null;

            setShortNotes((previousNotes) => {
                if (!paginationKey) return notes;

                const existingIds = new Set(
                    previousNotes.map((note) => note.id)
                );

                return [
                    ...previousNotes,
                    ...notes.filter((note) => !existingIds.has(note.id)),
                ];
            });

            setLastEvaluatedKey(nextKey);
            setHasNextPage(Boolean(nextKey));

        } catch (err) {
            setError(err.message || "Unable to load short notes.");
        } finally {
            requestInProgress.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getAllShortNotes();
    }, [getAllShortNotes]);

    // Navigate to note details
    const handleRowClick = (noteId) => {
        if (noteId) {
            navigate(`/short-note/${noteId}`);
        }
    };

    // Keyboard accessibility
    const handleRowKeyDown = (event, noteId) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleRowClick(noteId);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasNextPage && lastEvaluatedKey) {
            getAllShortNotes(lastEvaluatedKey);
        }
    };

    const handleRetry = () => {
        if (shortNotes.length === 0) {
            getAllShortNotes();
        } else if (lastEvaluatedKey) {
            getAllShortNotes(lastEvaluatedKey);
        } else {
            setError("");
        }
    };

    return (
        <main className="short-note-container">

            <header className="short-note-header">
                <div>
                    <h2>Short Notes</h2>
                    <p>Total notes loaded: {shortNotes.length}</p>
                </div>
            </header>

            {error && (
                <div className="short-note-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={handleRetry}
                        disabled={loading}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="table-wrapper">
                <table className="short-note-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Content</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {shortNotes.map((note, index) => (
                            <tr
                                key={note.id || `${note.title}-${index}`}
                                className="short-note-clickable-row"
                                onClick={() => handleRowClick(note.id)}
                                onKeyDown={(event) =>
                                    handleRowKeyDown(event, note.id)
                                }
                                tabIndex={0}
                                role="link"
                                aria-label={`Open ${note.title || "Untitled note"}`}
                            >
                                <td className="note-name">
                                    {note.title || note.name || "Untitled"}
                                </td>

                                <td className="note-content">
                                    {note.content || "—"}
                                </td>

                                <td>
                                    <span className="short-note-category">
                                        {note.categoryId || "Uncategorized"}
                                    </span>
                                </td>

                                <td className="short-note-actions">
                                    <span className="short-note-open-link">
                                        Open →
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {loading && shortNotes.length === 0 && (
                            <tr>
                                <td colSpan={4} className="short-note-empty">
                                    <span className="short-note-spinner" />
                                    Loading short notes...
                                </td>
                            </tr>
                        )}

                        {!loading && shortNotes.length === 0 && !error && (
                            <tr>
                                <td colSpan={4} className="short-note-empty">
                                    No short notes found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>

            {loading && shortNotes.length > 0 && (
                <p className="short-note-loading">
                    Loading more notes...
                </p>
            )}

            <footer className="short-note-pagination">
                {hasNextPage ? (
                    <button
                        type="button"
                        className="short-note-load-button"
                        onClick={handleLoadMore}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Load More"}
                    </button>
                ) : (
                    shortNotes.length > 0 &&
                    !loading && (
                        <p className="short-note-end">
                            You have reached the end of your notes.
                        </p>
                    )
                )}
            </footer>
        </main>
    );
}

export default GetAllShortNotes;
