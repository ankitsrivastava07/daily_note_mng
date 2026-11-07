import { useEffect, useState } from "react";

function CreateShortNote() {
    const [inputValue, setInputValue] = useState({
        title: "",
        content: "",
        categoryId: "others",
        userId: "ankit0397"
    });

    const [isSuccess, setIsSuccess] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [apiError, setApiError] = useState("");

    // Automatically hide success message after 3 seconds
    useEffect(() => {
        if (isSuccess !== true) return;

        const timer = setTimeout(() => {
            setIsSuccess(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isSuccess]);

    const categoryLabels = {
        "": "Select Category",
        general: "General Interview",
        interview: "Interview",
        qbank: "Question Bank",
        facebook: "FaceBook",
        instagram: "Instagram",
        whatsapp: "WhatsApp",
        others: "Others"
    };

    const handleInputValue = (e) => {
        const { name, value } = e.target;

        setInputValue((prev) => ({
            ...prev,
            [name]: value
        }));

        if (formErrors[name]) {
            setFormErrors((prev) => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    // Ctrl+B shortcut for bold formatting
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();

            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = textarea.value;

            const selectedText = currentValue.substring(start, end);

            let newValue;
            let newStart = start;
            let newEnd = end;

            if (
                selectedText.startsWith("**") &&
                selectedText.endsWith("**")
            ) {
                const unwrapped = selectedText.slice(2, -2);

                newValue =
                    currentValue.substring(0, start) +
                    unwrapped +
                    currentValue.substring(end);

                newEnd = end - 4;
            } else {
                const replacement = `**${selectedText}**`;

                newValue =
                    currentValue.substring(0, start) +
                    replacement +
                    currentValue.substring(end);

                if (selectedText.length === 0) {
                    newStart = start + 2;
                    newEnd = start + 2;
                } else {
                    newEnd = end + 4;
                }
            }

            setInputValue((prev) => ({
                ...prev,
                content: newValue
            }));

            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(newStart, newEnd);
            }, 0);
        }
    };

    const handleCategorySelect = (categoryKey) => {
        setInputValue((prev) => ({
            ...prev,
            categoryId: categoryKey
        }));

        if (formErrors.categoryId) {
            setFormErrors((prev) => ({
                ...prev,
                categoryId: ""
            }));
        }
    };

    // Form validation
    const validate = () => {
        let errors = {};
        let isValid = true;

        if (!inputValue.title.trim()) {
            errors.title = "Title is required";
            isValid = false;
        }

        if (!inputValue.content.trim()) {
            errors.content = "Content is required";
            isValid = false;
        }

        if (!inputValue.categoryId) {
            errors.categoryId = "Please select a valid category";
            isValid = false;
        }

        setFormErrors(errors);

        return isValid;
    };

    // Save short note
    const handleSubmit = (event) => {
        event.preventDefault();

        const isValid = validate();

        if (!isValid) {
            setIsSuccess(null);
            return;
        }

        setIsSuccess(null);
        setApiError("");

        fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/v1/short-note`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    userId: "ankit0397"
                },
                body: JSON.stringify(inputValue)
            }
        )
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok || data.success === false) {
                    setApiError(
                        data.message ||
                        `Request failed (${response.status})`
                    );

                    throw new Error(
                        data.message ||
                        `Request failed (${response.status})`
                    );
                }

                return data;
            })
            .then(() => {
                setIsSuccess(true);
                setApiError("");

                setInputValue({
                    title: "",
                    content: "",
                    categoryId: "others",
                    userId: "ankit0397"
                });
            })
            .catch((error) => {
                console.error("Error saving short note:", error);
                setIsSuccess(false);
            });
    };

    return (
        <>
            {/* Custom CSS */}
            <style>{`
                .main-card {
                    transition: all 0.3s ease;
                }

                .main-card:hover {
                    box-shadow: 0 1rem 3rem rgba(0,0,0,.12) !important;
                }

                .custom-dropdown-btn:hover {
                    background-color: #e9ecef !important;
                    border-color: #adb5bd !important;
                    color: #0d6efd !important;
                }

                .dropdown-menu .dropdown-item:hover {
                    background-color: #0d6efd !important;
                    color: white !important;
                    padding-left: 1.25rem !important;
                    transition: all 0.15s ease-in-out;
                }

                .custom-submit-btn {
                    transition: all 0.2s ease-in-out;
                }

                .custom-submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(13, 110, 253, 0.3) !important;
                    background-color: #0b5ed7 !important;
                }

                .form-control:focus {
                    border-color: #0d6efd;
                    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
                }
            `}</style>

            <div className="container my-4" style={{ maxWidth: "800px" }}>
                <div className="card main-card shadow-sm border-0 p-4 rounded-4 bg-white">

                    <h2 className="mb-4 text-primary fw-bold">
                        Create Short Note
                    </h2>

                    <form onSubmit={handleSubmit}>

                        {/* Category Selection */}
                        <div className="mb-3">

                            <label className="form-label fw-semibold text-secondary small text-uppercase">
                                Category
                            </label>

                            <div className="dropdown">

                                <a
                                    className="btn btn-outline-secondary custom-dropdown-btn dropdown-toggle d-flex justify-content-between align-items-center"
                                    href="#"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                    aria-expanded="false"
                                    style={{
                                        width: "220px",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <span>
                                        {categoryLabels[inputValue.categoryId]}
                                    </span>
                                </a>

                                <ul className="dropdown-menu shadow border-0 py-2 rounded-3">

                                    <li>
                                        <a
                                            className="dropdown-item py-2 px-3"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCategorySelect("general");
                                            }}
                                        >
                                            General Interview
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            className="dropdown-item py-2 px-3"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCategorySelect("interview");
                                            }}
                                        >
                                            Common Interview Questions
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            className="dropdown-item py-2 px-3"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCategorySelect("qbank");
                                            }}
                                        >
                                            Question Bank
                                        </a>
                                    </li>

                                    {/* Nested Social Media Menu */}
                                    <li className="dropend">

                                        <a
                                            className="dropdown-item dropdown-toggle py-2 px-3"
                                            href="#"
                                            data-bs-toggle="dropdown"
                                            data-bs-auto-close="outside"
                                            aria-expanded="false"
                                        >
                                            Social Media
                                        </a>

                                        <ul className="dropdown-menu shadow border-0 py-2 rounded-3">

                                            <li>
                                                <a
                                                    className="dropdown-item py-2 px-3"
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCategorySelect("facebook");
                                                    }}
                                                >
                                                    FaceBook
                                                </a>
                                            </li>

                                            <li>
                                                <a
                                                    className="dropdown-item py-2 px-3"
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCategorySelect("instagram");
                                                    }}
                                                >
                                                    Instagram
                                                </a>
                                            </li>

                                            <li>
                                                <a
                                                    className="dropdown-item py-2 px-3"
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleCategorySelect("whatsapp");
                                                    }}
                                                >
                                                    WhatsApp
                                                </a>
                                            </li>

                                        </ul>
                                    </li>

                                    <li>
                                        <hr className="dropdown-divider my-1" />
                                    </li>

                                    <li>
                                        <a
                                            className="dropdown-item py-2 px-3 text-danger"
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCategorySelect("others");
                                            }}
                                        >
                                            Others
                                        </a>
                                    </li>

                                </ul>
                            </div>

                            {formErrors.categoryId && (
                                <div className="text-danger mt-1 small">
                                    {formErrors.categoryId}
                                </div>
                            )}

                        </div>

                        {/* Note Title */}
                        <div className="mb-3">

                            <label
                                htmlFor="exampleFormControlInput1"
                                className="form-label fw-semibold text-secondary small text-uppercase"
                            >
                                Note Name
                            </label>

                            <input
                                type="text"
                                name="title"
                                value={inputValue.title}
                                onChange={handleInputValue}
                                className="form-control py-2 shadow-none"
                                id="exampleFormControlInput1"
                                placeholder="Short Note Name"
                            />

                            {isSuccess === false && (
                                <div className="text-danger mt-1 small">
                                    {apiError ||
                                        "An error occurred while saving the note. Please try again."}
                                </div>
                            )}

                            {formErrors.title && (
                                <div className="text-danger mt-1 small">
                                    {formErrors.title}
                                </div>
                            )}

                        </div>

                        {/* Description */}
                        <div className="mb-3">

                            <div className="d-flex justify-content-between align-items-center mb-1">

                                <label
                                    htmlFor="exampleFormControlTextarea1"
                                    className="form-label fw-semibold text-secondary small text-uppercase mb-0"
                                >
                                    Description
                                </label>

                                <small
                                    className="text-muted"
                                    style={{ fontSize: "12px" }}
                                >
                                    Tip: Select text & press{" "}
                                    <kbd className="bg-light border px-1 rounded text-dark">
                                        Ctrl + B
                                    </kbd>{" "}
                                    for bold
                                </small>

                            </div>

                            <textarea
                                name="content"
                                value={inputValue.content}
                                className="form-control note-textarea shadow-none"
                                onChange={handleInputValue}
                                onKeyDown={handleKeyDown}
                                id="exampleFormControlTextarea1"
                                rows={10}
                                placeholder="Description"
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "14px"
                                }}
                            />

                            {formErrors.content && (
                                <div className="text-danger mt-1 small">
                                    {formErrors.content}
                                </div>
                            )}

                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary mt-2 px-4 py-2 custom-submit-btn fw-semibold rounded-3 shadow-sm"
                        >
                            Submit
                        </button>

                        {/* Success Message */}
                        {isSuccess === true && (
                            <div
                                className="alert alert-success mt-3 py-2 text-center"
                                role="alert"
                            >
                                Note saved successfully!
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </>
    );
}

export default CreateShortNote;