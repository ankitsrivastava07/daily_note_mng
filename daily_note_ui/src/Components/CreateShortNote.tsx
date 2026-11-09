
import { useEffect, useRef, useState } from "react";

const USER_ID = "ankit0397";
const MAX_FILES = 5;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DMS_API_BASE_URL = import.meta.env.VITE_DMS_API_BASE_URL;

const categoryLabels = {
    general: "General Interview",
    interview: "Interview",
    qbank: "Question Bank",
    facebook: "Facebook",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    others: "Others"
};

function CreateShortNote() {
    const [inputValue, setInputValue] = useState({
        title: "",
        content: "",
        categoryId: "others",
        userId: USER_ID
    });

    const [files, setFiles] = useState([]);
    const [isSuccess, setIsSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [apiError, setApiError] = useState("");

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Clear success message
    useEffect(() => {
        if (isSuccess !== true) return;

        const timer = setTimeout(() => {
            setIsSuccess(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isSuccess]);

    // Cleanup image previews on unmount
    useEffect(() => {
        return () => {
            files.forEach(item => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
        };
    }, [files]);

    // Handle form inputs
    const handleInputValue = (e) => {
        const { name, value } = e.target;

        setInputValue(prev => ({
            ...prev,
            [name]: value
        }));

        setFormErrors(prev => ({
            ...prev,
            [name]: ""
        }));
    };

    // Ctrl+B formatting
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
                newValue =
                    currentValue.substring(0, start) +
                    selectedText.slice(2, -2) +
                    currentValue.substring(end);

                newEnd = end - 4;
            } else {
                newValue =
                    currentValue.substring(0, start) +
                    `**${selectedText}**` +
                    currentValue.substring(end);

                if (selectedText.length === 0) {
                    newStart = start + 2;
                    newEnd = start + 2;
                } else {
                    newEnd = end + 4;
                }
            }

            setInputValue(prev => ({
                ...prev,
                content: newValue
            }));

            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(newStart, newEnd);
            });
        }
    };

    // Category selection
    const handleCategorySelect = (categoryKey) => {
        setInputValue(prev => ({
            ...prev,
            categoryId: categoryKey
        }));

        setFormErrors(prev => ({
            ...prev,
            categoryId: ""
        }));
    };

    // Add attachments
    const addFiles = (incomingFiles) => {
        const validFiles = Array.from(incomingFiles || []);

        if (!validFiles.length) return;

        setFiles(previous => {
            const remaining = MAX_FILES - previous.length;

            if (remaining <= 0) {
                setApiError("Maximum 5 attachments are allowed.");
                return previous;
            }

            const accepted = validFiles.slice(0, remaining);

            const newFiles = accepted.map(file => ({
                file,
                id: `${Date.now()}-${Math.random()}`,
                previewUrl: file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : null
            }));

            setApiError(
                accepted.length < validFiles.length
                    ? "Maximum 5 attachments are allowed."
                    : ""
            );

            return [...previous, ...newFiles];
        });
    };

    // File selection
    const handleFileSelect = (e) => {
        addFiles(e.target.files);
        e.target.value = "";
    };

    // Paste images using Ctrl+V
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;

        if (!items) return;

        const pastedImages = [];

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();

                if (file) {
                    const extension =
                        file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";

                    pastedImages.push(
                        new File(
                            [file],
                            `pasted-image-${Date.now()}.${extension}`,
                            { type: file.type }
                        )
                    );
                }
            }
        }

        if (pastedImages.length > 0) {
            e.preventDefault();
            addFiles(pastedImages);
        }
    };

    // Remove attachment
    const removeFile = (id) => {
        setFiles(previous => {
            const selected = previous.find(item => item.id === id);

            if (selected?.previewUrl) {
                URL.revokeObjectURL(selected.previewUrl);
            }

            return previous.filter(item => item.id !== id);
        });
    };

    // Read API response
    const readResponse = async (response) => {
        const data = await response.json().catch(() => ({}));

        if (
            !response.ok ||
            data.success === false ||
            data.status === false
        ) {
            throw new Error(
                data.message || `Request failed (${response.status})`
            );
        }

        return data;
    };

    // Extract note ID
    const extractReferenceId = (response) => {
        const data = response?.data;

        return (
            data?.noteId ||
            data?.id ||
            data?.referenceId ||
            data?.shortNoteId ||
            response?.noteId ||
            response?.id ||
            response?.referenceId ||
            null
        );
    };

    // API 1: Create Short Note
    const createShortNote = async () => {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/short-note`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    userId: USER_ID
                },
                body: JSON.stringify(inputValue)
            }
        );

        return await readResponse(response);
    };

    // API 2: Generate DMS presigned URLs
    const generatePresignedUrls = async (referenceId) => {
        const params = new URLSearchParams();

        files.forEach(item => {
            params.append("fileName", item.file.name);
        });

        const response = await fetch(
            `${DMS_API_BASE_URL}/api/v1/${encodeURIComponent(referenceId)}/dms/presigned?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    userId: USER_ID
                }
            }
        );

        const result = await readResponse(response);
        const urls = result.data;

        if (!Array.isArray(urls) || urls.length !== files.length) {
            throw new Error(
                "DMS did not return the expected number of presigned URLs."
            );
        }

        return urls;
    };

    // API 3: Upload directly to S3
    const uploadFilesToS3 = async (urls) => {
        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            const file = item.file;

            setUploadProgress(
                `Uploading ${i + 1} of ${files.length}: ${file.name}`
            );

            const response = await fetch(urls[i], {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream"
                },
                body: file
            });

            if (!response.ok) {
                throw new Error(
                    `S3 upload failed for ${file.name} (${response.status})`
                );
            }
        }
    };

    // API 4: Save DMS metadata
    const saveDocumentMetadata = async (referenceId) => {
        const documentDtos = files.map(item => ({
            fileName: item.file.name,
            fileSize: item.file.size,
            contentType: item.file.type || "application/octet-stream",
            userId: USER_ID
        }));

        const response = await fetch(
            `${DMS_API_BASE_URL}/api/v1/${encodeURIComponent(referenceId)}/dms`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    userId: USER_ID
                },
                body: JSON.stringify(documentDtos)
            }
        );

        await readResponse(response);
    };

    // Form validation
    const validate = () => {
        const errors = {};

        if (!inputValue.title.trim()) {
            errors.title = "Title is required";
        }

        if (!inputValue.content.trim()) {
            errors.content = "Content is required";
        }

        if (!inputValue.categoryId) {
            errors.categoryId = "Please select a valid category";
        }

        if (files.length > MAX_FILES) {
            errors.files = "Maximum 5 attachments are allowed.";
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // Submit Short Note
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isLoading) return;

        if (!validate()) {
            setIsSuccess(null);
            return;
        }

        // Short Note API configuration
        if (!API_BASE_URL) {
            setApiError("VITE_API_BASE_URL is not configured.");
            setIsSuccess(false);
            return;
        }

        // DMS configuration required ONLY if files exist
        if (files.length > 0 && !DMS_API_BASE_URL) {
            setApiError("VITE_DMS_API_BASE_URL is not configured.");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setIsSuccess(null);
        setApiError("");
        setUploadProgress("");

        let noteCreated = false;

        try {
            // STEP 1: ALWAYS call Short Note API
            setUploadProgress("Saving short note...");

            const noteResponse = await createShortNote();
            noteCreated = true;

            // STEP 2: DMS and S3 ONLY when attachments exist
            if (files.length > 0) {

                const referenceId = extractReferenceId(noteResponse);

                if (!referenceId) {
                    throw new Error(
                        "Note saved, but reference ID was not returned."
                    );
                }

                // Generate presigned URLs
                setUploadProgress("Generating document upload URLs...");

                const urls = await generatePresignedUrls(referenceId);

                // Upload attachments to S3
                await uploadFilesToS3(urls);

                // Save metadata in DMS
                setUploadProgress("Saving document information...");

                await saveDocumentMetadata(referenceId);
            }

            // STEP 3: Success
            setIsSuccess(true);
            setApiError("");

            setInputValue({
                title: "",
                content: "",
                categoryId: "others",
                userId: USER_ID
            });

            // Clear attachments and previews
            setFiles(previous => {
                previous.forEach(item => {
                    if (item.previewUrl) {
                        URL.revokeObjectURL(item.previewUrl);
                    }
                });

                return [];
            });

            setFormErrors({});

        } catch (error) {
            console.error("Short Note / DMS error:", error);

            setIsSuccess(false);

            setApiError(
                noteCreated
                    ? `Short Note was saved, but attachment processing failed: ${error.message}`
                    : error.message || "Unable to save Short Note."
            );

        } finally {
            setIsLoading(false);
            setUploadProgress("");
        }
    };

    return (
        <>
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

                .custom-submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 15px rgba(13, 110, 253, 0.3) !important;
                    background-color: #0b5ed7 !important;
                }

                .custom-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .form-control:focus {
                    border-color: #0d6efd;
                    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
                }

                .attachment-card {
                    position: relative;
                    border: 1px solid #dee2e6;
                    border-radius: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    min-width: 0;
                }

                .attachment-preview {
                    width: 100%;
                    height: 120px;
                    object-fit: contain;
                    border-radius: 6px;
                    background: white;
                }

                .attachment-remove {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    border: none;
                    background: #dc3545;
                    color: white;
                    width: 25px;
                    height: 25px;
                    border-radius: 50%;
                    cursor: pointer;
                }
            `}</style>

            <div className="container my-4" style={{ maxWidth: "800px" }}>
                <div className="card main-card shadow-sm border-0 p-4 rounded-4 bg-white">

                    <h2 className="mb-4 text-primary fw-bold">
                        Create Short Note
                    </h2>

                    <form onSubmit={handleSubmit} onPaste={handlePaste}>

                        {/* Category */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold text-secondary small text-uppercase">
                                Category
                            </label>

                            <div className="dropdown">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary custom-dropdown-btn dropdown-toggle d-flex justify-content-between align-items-center"
                                    data-bs-toggle="dropdown"
                                    data-bs-auto-close="outside"
                                    style={{ width: "220px" }}
                                    disabled={isLoading}
                                >
                                    {categoryLabels[inputValue.categoryId]}
                                </button>

                                <ul className="dropdown-menu shadow border-0 py-2 rounded-3">
                                    {Object.entries(categoryLabels).map(
                                        ([key, label]) => (
                                            <li key={key}>
                                                <button
                                                    type="button"
                                                    className="dropdown-item py-2 px-3"
                                                    disabled={isLoading}
                                                    onClick={() => handleCategorySelect(key)}
                                                >
                                                    {label}
                                                </button>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </div>

                            {formErrors.categoryId && (
                                <div className="text-danger mt-1 small">
                                    {formErrors.categoryId}
                                </div>
                            )}
                        </div>

                        {/* Note title */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold text-secondary small text-uppercase">
                                Note Name
                            </label>

                            <input
                                type="text"
                                name="title"
                                value={inputValue.title}
                                onChange={handleInputValue}
                                className="form-control py-2 shadow-none"
                                placeholder="Short Note Name"
                                disabled={isLoading}
                            />

                            {formErrors.title && (
                                <div className="text-danger mt-1 small">
                                    {formErrors.title}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label className="form-label fw-semibold text-secondary small text-uppercase">
                                    Description
                                </label>

                                <small className="text-muted">
                                    Select text and press <kbd>Ctrl + B</kbd> for bold
                                </small>
                            </div>

                            <textarea
                                ref={textareaRef}
                                name="content"
                                value={inputValue.content}
                                className="form-control note-textarea shadow-none"
                                onChange={handleInputValue}
                                onKeyDown={handleKeyDown}
                                rows={10}
                                placeholder="Description (you can also paste images using Ctrl + V)"
                                disabled={isLoading}
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

                        {/* Attachments */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label fw-semibold text-secondary small text-uppercase mb-0">
                                    Document Attachments
                                </label>

                                <small className="text-muted">
                                    {files.length}/{MAX_FILES} files
                                </small>
                            </div>

                            <div className="border rounded-3 p-3 bg-light">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        disabled={isLoading || files.length >= MAX_FILES}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <i className="bi bi-paperclip me-2"></i>
                                        Attach Files
                                    </button>

                                    <span className="small text-muted">
                                        Or paste an image using Ctrl + V
                                    </span>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    hidden
                                    disabled={isLoading}
                                    onChange={handleFileSelect}
                                />

                                <div className="small text-muted mt-2">
                                    Maximum 5 files. Images and documents are supported.
                                </div>

                                {formErrors.files && (
                                    <div className="text-danger mt-1 small">
                                        {formErrors.files}
                                    </div>
                                )}

                                {files.length > 0 && (
                                    <div className="row g-2 mt-2">
                                        {files.map(item => (
                                            <div
                                                className="col-6 col-md-4"
                                                key={item.id}
                                            >
                                                <div className="attachment-card">
                                                    <button
                                                        type="button"
                                                        className="attachment-remove"
                                                        disabled={isLoading}
                                                        onClick={() => removeFile(item.id)}
                                                        aria-label="Remove attachment"
                                                    >
                                                        ×
                                                    </button>

                                                    {item.previewUrl ? (
                                                        <img
                                                            src={item.previewUrl}
                                                            className="attachment-preview"
                                                            alt={item.file.name}
                                                        />
                                                    ) : (
                                                        <div className="attachment-preview d-flex align-items-center justify-content-center">
                                                            <i className="bi bi-file-earmark-text fs-1 text-primary"></i>
                                                        </div>
                                                    )}

                                                    <div
                                                        className="small fw-semibold text-truncate mt-2"
                                                        title={item.file.name}
                                                    >
                                                        {item.file.name}
                                                    </div>

                                                    <div className="small text-muted">
                                                        {(item.file.size / 1024).toFixed(1)} KB
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload progress */}
                        {uploadProgress && (
                            <div className="alert alert-info mt-3 py-2">
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                {uploadProgress}
                            </div>
                        )}

                        {/* API error */}
                        {isSuccess === false && (
                            <div className="alert alert-danger mt-3 py-2" role="alert">
                                {apiError || "An error occurred. Please try again."}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary mt-2 px-4 py-2 custom-submit-btn fw-semibold rounded-3 shadow-sm"
                        >
                            {isLoading ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                    ></span>
                                    Processing...
                                </>
                            ) : (
                                "Submit"
                            )}
                        </button>

                        {/* Success */}
                        {isSuccess === true && (
                            <div
                                className="alert alert-success mt-3 py-2 text-center"
                                role="alert"
                            >
                                {files.length > 0
                                    ? "Note and attachments saved successfully!"
                                    : "Note saved successfully!"}
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </>
    );
}

export default CreateShortNote;