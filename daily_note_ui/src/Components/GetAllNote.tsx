import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GetAllNote.css";

interface Note {
    id: string;
    title?: string;
    description?: string;
    content?: string | null;
    priority?: string;
    createdAt?: string;
}

function GetAllNote() {

    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 5;

    const navigate = useNavigate();


    const getAllNotes = async () => {

        const userId =
            localStorage.getItem("userId") || "ankit0397";

        setLoading(true);
        setError("");

        try {

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/daily-note`,
                {
                    method: "GET",
                    headers: {
                        userId: userId
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to get notes");
            }

            const result = await response.json();

            console.log("API Response:", result);

            setNotes(result.data || []);

        } catch (error: any) {

            console.error(error);

            setError(error.message);

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {

        getAllNotes();

    }, []);


    // -------------------------------
    // Pagination
    // -------------------------------

    const totalPages =
        Math.ceil(notes.length / itemsPerPage);

    const startIndex =
        (currentPage - 1) * itemsPerPage;

    const endIndex =
        startIndex + itemsPerPage;

    const currentNotes =
        notes.slice(startIndex, endIndex);


    const goToPage = (page: number) => {

        if (page < 1 || page > totalPages) {
            return;
        }

        setCurrentPage(page);
    };


    const getPageNumbers = () => {

        const pages: (number | string)[] = [];

        if (totalPages <= 7) {

            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }

            return pages;
        }


        // First pages
        if (currentPage <= 4) {

            pages.push(
                1,
                2,
                3,
                4,
                5,
                "...",
                totalPages
            );

            return pages;
        }


        // Last pages
        if (currentPage >= totalPages - 3) {

            pages.push(
                1,
                "...",
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages
            );

            return pages;
        }


        // Middle pages
        pages.push(
            1,
            "...",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "...",
            totalPages
        );

        return pages;
    };


    return (

        <div
            className="container mt-4"
            style={{
                maxWidth: "900px"
            }}
        >

            <h3 className="mb-1">
                All Notes
            </h3>

            <p className="text-muted mb-4">
                Total Notes: {notes.length}
            </p>


            {/* Loading */}

            {loading && (

                <div className="text-center py-5">

                    <div
                        className="spinner-border"
                        role="status"
                    />

                    <p className="mt-3">
                        Loading notes...
                    </p>

                </div>

            )}


            {/* Error */}

            {error && (

                <div className="alert alert-danger">

                    {error}

                </div>

            )}


            {/* No Notes */}

            {!loading &&
                !error &&
                notes.length === 0 && (

                    <p className="text-muted">
                        No notes found.
                    </p>

                )}


            {/* Notes */}

            {!loading &&
                !error &&
                notes.length > 0 && (

                    <>

                        <div className="list-group">

                            {currentNotes.map((note) => (

                                <div
                                    key={note.id}
                                    className="
                                        list-group-item
                                        list-group-item-action
                                        py-3
                                    "
                                    style={{
                                        cursor: "pointer"
                                    }}
                                    onClick={() =>
                                        navigate(
                                            `/notes/${note.id}`
                                        )
                                    }
                                >

                                    <div
                                        className="
                                            d-flex
                                            justify-content-between
                                            align-items-center
                                        "
                                    >

                                        <div>

                                            <h5
                                                className="
                                                    mb-1
                                                    fw-bold
                                                "
                                            >

                                                {
                                                    note.title ||
                                                    "Untitled Note"
                                                }

                                            </h5>


                                            <p
                                                className="
                                                    mb-1
                                                    text-muted
                                                "
                                            >

                                                {
                                                    note.description ||
                                                    note.content ||
                                                    "No description"
                                                }

                                            </p>


                                            <small
                                                className="
                                                    text-muted
                                                "
                                            >

                                                Priority:{" "}

                                                {
                                                    note.priority ||
                                                    "-"
                                                }

                                            </small>

                                        </div>


                                        <a
                                            href={
                                                `/notes/${note.id}/edit`
                                            }
                                            className="
                                                text-primary
                                                text-decoration-none
                                            "
                                            onClick={(e) => {

                                                e.stopPropagation();

                                            }}
                                        >

                                            Edit

                                        </a>

                                    </div>

                                </div>

                            ))}

                        </div>


                        {/* Pagination */}

                        {totalPages > 1 && (

                            <div className="notes-pagination">

                                {/* Previous */}

                                <button
                                    className="page-button previous-button"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() =>
                                        goToPage(
                                            currentPage - 1
                                        )
                                    }
                                >
                                    previous
                                </button>


                                {/* Page Numbers */}

                                {getPageNumbers().map(
                                    (page, index) => {

                                        if (page === "...") {

                                            return (

                                                <span
                                                    key={index}
                                                    className="
                                                        page-button
                                                        page-dots
                                                    "
                                                >
                                                    ...
                                                </span>

                                            );
                                        }


                                        return (

                                            <button
                                                key={index}
                                                className={
                                                    currentPage === page
                                                        ? "page-button active-page"
                                                        : "page-button"
                                                }
                                                onClick={() =>
                                                    goToPage(
                                                        page as number
                                                    )
                                                }
                                            >

                                                {page}

                                            </button>

                                        );

                                    }
                                )}


                                {/* Next */}

                                <button
                                    className="page-button next-button"
                                    disabled={
                                        currentPage === totalPages
                                    }
                                    onClick={() =>
                                        goToPage(
                                            currentPage + 1
                                        )
                                    }
                                >

                                    next

                                </button>

                            </div>

                        )}

                    </>

                )}

        </div>
    );
}

export default GetAllNote;