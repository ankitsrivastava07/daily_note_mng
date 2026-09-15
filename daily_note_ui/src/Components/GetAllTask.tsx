import React, { useEffect, useState } from "react";
import "./CSS/GetAllTask.css";

interface Task {
    id: string;
    title?: string;
    name?: string;
    description?: string;
    content?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    dueTime?: string;
    meridiem?: string;
    version?: number;
}

interface PageResponse {
    content: Task[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
}

function GetAllTask() {

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");

    const [limit, setLimit] = useState<number>(5);
    const [search, setSearch] = useState<string>("");

    const [page, setPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [totalElements, setTotalElements] = useState<number>(0);

    const userId =
        localStorage.getItem("userId") || "ankit0397";

    const getAllTasks = async (
        pageNumber: number = 0,
        searchValue: string = search
    ) => {

        try {

            setLoading(true);
            setMessage("");

            let url =
                `${import.meta.env.VITE_SEARCH_API_BASE_URL}/api/v1/user/${userId}/task` +
                `?page=${pageNumber}` +
                `&size=${limit}`;

            if (searchValue.trim()) {
                url += `&search=${encodeURIComponent(searchValue.trim())}`;
            }

            const response = await fetch(url, {
                method: "GET"
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch tasks. Status: ${response.status}`
                );
            }

            const result: PageResponse =
                await response.json();

            setTasks(result.content || []);

            setPage(result.number ?? pageNumber);

            setTotalPages(
                result.totalPages ?? 0
            );

            setTotalElements(
                result.totalElements ?? 0
            );

        } catch (error) {

            console.error(
                "Error fetching tasks:",
                error
            );

            setTasks([]);
            setTotalPages(0);
            setTotalElements(0);

            setMessage(
                "Failed to load tasks"
            );

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {

        setPage(0);

        getAllTasks(
            0,
            search
        );

    }, [limit]);

    const handleSearch = () => {

        setPage(0);

        getAllTasks(
            0,
            search
        );
    };

    const handleSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {

        if (event.key === "Enter") {
            handleSearch();
        }
    };

    const handleClearSearch = () => {

        setSearch("");
        setPage(0);

        getAllTasks(
            0,
            ""
        );
    };

    const handleNext = () => {

        if (page + 1 >= totalPages) {
            return;
        }

        const nextPage = page + 1;

        setPage(nextPage);

        getAllTasks(
            nextPage,
            search
        );
    };

    const handlePrevious = () => {

        if (page === 0) {
            return;
        }

        const previousPage = page - 1;

        setPage(previousPage);

        getAllTasks(
            previousPage,
            search
        );
    };

    const handleLimitChange = (
        event: React.ChangeEvent<HTMLSelectElement>
    ) => {

        const newLimit =
            Number(event.target.value);

        setLimit(newLimit);
        setPage(0);
    };

    const handleRefresh = () => {

        getAllTasks(
            page,
            search
        );
    };

    return (

        <div className="get-all-task-container">

            <div className="get-all-task-header">

                <div>
                    <h2>All Tasks</h2>
                    <p>
                        View and manage your tasks
                    </p>
                </div>

                <button
                    type="button"
                    className="refresh-button"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    Refresh
                </button>

            </div>

            <div className="task-toolbar">

                <div className="page-size-container">

                    <span>Show</span>

                    <select
                        value={limit}
                        onChange={handleLimitChange}
                        disabled={loading}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>

                    <span>entries</span>

                </div>

                <div className="task-search-container">

                    <input
                        type="text"
                        value={search}
                        placeholder="Search tasks..."
                        className="task-search-input"
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        onKeyDown={handleSearchKeyDown}
                    />

                    <button
                        type="button"
                        className="task-search-button"
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        Search
                    </button>

                    {search && (

                        <button
                            type="button"
                            className="task-clear-button"
                            onClick={handleClearSearch}
                            disabled={loading}
                        >
                            Clear
                        </button>

                    )}

                </div>

            </div>

            {loading && (
                <div className="task-loading">
                    Loading tasks...
                </div>
            )}

            {message && (
                <div className="task-error">
                    {message}
                </div>
            )}

            {!loading &&
                !message &&
                tasks.length === 0 && (

                    <div className="no-task">
                        No tasks found
                    </div>

                )}

            {!loading && tasks.length > 0 && (

                <>

                    <div className="task-table-wrapper">

                        <table className="task-table">

                            <thead>

                                <tr>
                                    <th>#</th>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Due Time</th>
                                </tr>

                            </thead>

                            <tbody>

                                {tasks.map(
                                    (task, index) => (

                                        <tr key={task.id}>

                                            <td>
                                                {page * limit +
                                                    index +
                                                    1}
                                            </td>

                                            <td className="task-title-cell">

                                                {task.title ||
                                                    task.name ||
                                                    "-"}

                                            </td>

                                            <td className="task-description-cell">

                                                {task.description ||
                                                    task.content ||
                                                    "-"}

                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        `priority-badge priority-${task.priority?.toLowerCase()}`
                                                    }
                                                >
                                                    {task.priority ||
                                                        "-"}
                                                </span>

                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        `status-badge status-${task.status?.toLowerCase()}`
                                                    }
                                                >
                                                    {task.status ||
                                                        "-"}
                                                </span>

                                            </td>

                                            <td>
                                                {task.dueDate ||
                                                    "-"}
                                            </td>

                                            <td>

                                                {task.dueTime
                                                    ? `${task.dueTime} ${task.meridiem || ""}`
                                                    : "-"}

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                    <div className="pagination-container">

                        <button
                            type="button"
                            className="pagination-button"
                            onClick={handlePrevious}
                            disabled={
                                page === 0 ||
                                loading
                            }
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            className="page-number-button active"
                            disabled
                        >
                            {page + 1}
                        </button>

                        <button
                            type="button"
                            className="pagination-button"
                            onClick={handleNext}
                            disabled={
                                page + 1 >= totalPages ||
                                loading
                            }
                        >
                            Next
                        </button>

                    </div>

                    <div className="task-total">
                        Total Tasks: {totalElements}
                    </div>

                </>

            )}

        </div>
    );
}

export default GetAllTask;