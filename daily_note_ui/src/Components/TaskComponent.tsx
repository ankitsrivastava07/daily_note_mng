import { useRef, useState } from "react";
import "./CSS/TaskComponent.css";

function TaskComponent() {
    const editorRef = useRef(null);

    const [task, setTask] = useState({
        title: "",
        content: "",
        priority: "MEDIUM",
        dueDate: "",
        dueTime: "",
        status: "PENDING",
        meridiem: "AM",
        name: "",
        userId: localStorage.getItem("userId") || "ankit0397",
    });

    const [attachments, setAttachments] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [apiError, setApiError] = useState("");

    const userId = localStorage.getItem("userId") || "ankit0397";
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:9091";
    const DMS_BASE_URL = import.meta.env.VITE_DMS_API_BASE_URL;

    // =========================================================
    // HELPER: GET FILE EXTENSION
    // =========================================================
    const getFileExtension = (contentType) => {
        if (!contentType) return "png";
        const parts = contentType.split("/");
        return parts[1] || "png";
    };

    // =========================================================
    // HELPER: UPLOAD IMAGES TO DMS
    // =========================================================
    const uploadImagesToDms = async (imagesToUpload, taskId) => {
        const uploadedResults = [];
        for (const attachment of imagesToUpload) {
            // 1. Get Presigned URL for each file
            const presignedRes = await fetch(
                `${DMS_BASE_URL}/api/v1/${taskId}/dms/presigned?fileName=${encodeURIComponent(attachment.fileName)}`,
                {
                    method: "GET",
                    headers: { userId },
                }
            );

            if (!presignedRes.ok) {
                throw new Error(`Failed to get presigned URL for ${attachment.fileName}`);
            }

            const presignedData = await presignedRes.json();
            const uploadUrl = presignedData.data?.uploadUrl || presignedData.uploadUrl;

            if (!uploadUrl) {
                throw new Error(`Upload URL not found for ${attachment.fileName}`);
            }

            // 2. Upload actual file to S3 / Storage via Presigned URL
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": attachment.contentType,
                },
                body: attachment.file,
            });

            if (!uploadRes.ok) {
                throw new Error(`Failed to upload ${attachment.fileName} to storage`);
            }

            uploadedResults.push({ fileName: attachment.fileName, status: "SUCCESS" });
        }
        return uploadedResults;
    };

    // =========================================================
    // NORMAL FORM CHANGE
    // =========================================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setTask((prev) => ({
            ...prev,
            [name]: value,
        }));
        setMessage("");
        setApiError("");
    };

    // =========================================================
    // DESCRIPTION CHANGE
    // =========================================================
    const handleDescriptionChange = () => {
        if (!editorRef.current) return;
        setTask((prev) => ({
            ...prev,
            content: editorRef.current.innerHTML,
        }));
        setMessage("");
    };

    // =========================================================
    // UPDATE EDITOR CONTENT
    // =========================================================
    const updateEditorContent = () => {
        if (!editorRef.current) return;
        setTask((prev) => ({
            ...prev,
            content: editorRef.current.innerHTML,
        }));
    };

    // =========================================================
    // PASTE HANDLER
    // =========================================================
    const handleDescriptionPaste = (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imageFiles = items
            .filter((item) => item.kind === "file" && item.type?.startsWith("image/"))
            .map((item) => item.getAsFile())
            .filter(Boolean);

        if (imageFiles.length === 0) return;

        e.preventDefault();

        const availableSlots = 5 - attachments.length;
        if (availableSlots <= 0) {
            setMessage("Maximum 5 images are allowed.");
            return;
        }

        if (imageFiles.length > availableSlots) {
            setMessage(`Maximum 5 images are allowed. You can add only ${availableSlots} more image(s).`);
            return;
        }

        imageFiles.forEach((imageFile) => {
            insertImageIntoEditor(imageFile);
        });
    };

    // =========================================================
    // INSERT IMAGE INTO EDITOR
    // =========================================================
    const insertImageIntoEditor = (file) => {
        if (!editorRef.current) return;

        if (!file || !file.type || !file.type.startsWith("image/")) {
            setMessage("Only image files are supported");
            return;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setMessage("Image size must be less than 10 MB");
            return;
        }

        const tempId = crypto.randomUUID();
        const extension = getFileExtension(file.type);
        const fileName = `pasted-${Date.now()}-${tempId}.${extension}`;
        const previewUrl = URL.createObjectURL(file);

        const imageElement = document.createElement("img");
        imageElement.src = previewUrl;
        imageElement.alt = fileName;
        imageElement.className = "description-pasted-image";
        imageElement.setAttribute("contenteditable", "false");
        imageElement.setAttribute("data-temp-id", tempId);
        imageElement.setAttribute("data-uploading", "pending");
        imageElement.setAttribute("data-preview-url", previewUrl);
        imageElement.setAttribute("data-file-name", fileName);
        imageElement.setAttribute("data-content-type", file.type);

        const selection = window.getSelection();
        let insertedAtCursor = false;

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editorRef.current.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(imageElement);
                insertedAtCursor = true;

                const newLine = document.createElement("div");
                newLine.innerHTML = "<br>";
                imageElement.after(newLine);

                const newRange = document.createRange();
                newRange.setStart(newLine, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }

        if (!insertedAtCursor) {
            editorRef.current.appendChild(imageElement);
            const newLine = document.createElement("div");
            newLine.innerHTML = "<br>";
            editorRef.current.appendChild(newLine);
        }

        setAttachments((prev) => {
            if (prev.length >= 5) {
                imageElement.remove();
                URL.revokeObjectURL(previewUrl);
                setMessage("Maximum 5 images are allowed.");
                return prev;
            }

            return [
                ...prev,
                {
                    tempId,
                    file,
                    fileName,
                    contentType: file.type,
                    fileSize: file.size,
                    previewUrl,
                },
            ];
        });

        updateEditorContent();
        editorRef.current.focus();
        setMessage("Image added. It will upload after task creation.");
    };

    // =========================================================
    // HANDLE FORM SUBMISSION
    // =========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setApiError("");

        try {
            // 1. Create Task API Call
            const taskResponse = await fetch(`${API_BASE_URL}/api/v1/task`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    userId: userId,
                },
                body: JSON.stringify(task),
            });

            if (!taskResponse.ok) {
                const responseText = await taskResponse.text();

                let errorMessage = "Unable to create task.";

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = responseText || errorMessage;
                }

                console.error("CREATE TASK ERROR:", errorMessage);

                if (taskResponse.status === 409) {
                    setApiError(errorMessage);
                    return;
                }

                const taskResult = await taskResponse.json();

                if (!taskResult.success || !taskResult.data?.id) {
                    throw new Error(taskResult.message || "Task created but task ID was not returned");
                }

                const taskId = taskResult.data.id;

                // 2. Upload Attachments if any exist
                if (attachments.length > 0 && DMS_BASE_URL) {
                    setUploadingImage(true);
                    setMessage(`Uploading ${attachments.length} image(s)...`);
                    await uploadImagesToDms(attachments, taskId);
                }

                setMessage("Task created successfully!");

                // Clean up object URLs
                attachments.forEach((att) => {
                    if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
                });

                // Reset Form
                setTask({
                    title: "",
                    content: "",
                    priority: "MEDIUM",
                    dueDate: "",
                    dueTime: "",
                    status: "PENDING",
                    meridiem: "AM",
                    name: "",
                    userId: localStorage.getItem("userId") || "ankit0397"
                });
                setAttachments([]);
                if (editorRef.current) {
                    editorRef.current.innerHTML = "";
                }
            } catch (error) {
                console.error("CREATE TASK FLOW ERROR:", error);
                setApiError(error instanceof Error ? error.message : "Unable to create task");
                setMessage(error instanceof Error ? error.message : "Unable to create task");
            } finally {
                setLoading(false);
                setUploadingImage(false);
            }
        };

        return (
            <div className="create-task-page">
                <div className="task-form-card">
                    <div className="task-form-header">
                        <h1>Create Task</h1>
                        <p>Add a new task to your daily workspace</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* TASK TITLE */}
                        <div className="form-group">
                            <label>
                                Task Title <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Enter task title"
                                value={task.name}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        {apiError && (
                            <div
                                style={{
                                    color: "red",
                                    marginTop: "4px",
                                    fontSize: "14px",
                                }}
                            >
                                {apiError}
                            </div>
                        )}

                        {/* DESCRIPTION */}
                        <div className="form-group">
                            <label>
                                Description <span className="required">*</span>
                            </label>
                            <div
                                ref={editorRef}
                                className="description-rich-editor"
                                contentEditable={!loading}
                                suppressContentEditableWarning={true}
                                data-placeholder="Type description or paste screenshot using Ctrl + V"
                                onInput={handleDescriptionChange}
                                onPaste={handleDescriptionPaste}
                            />
                            <div className="description-help">
                                Type text and paste screenshots using <strong>Ctrl + V</strong> <span>({attachments.length}/5)</span>
                            </div>
                            {uploadingImage && (
                                <div className="image-uploading">
                                    Uploading {attachments.length} image(s) to DMS...
                                </div>
                            )}
                        </div>

                        {/* PRIORITY + STATUS */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Priority</label>
                                <select name="priority" value={task.priority} onChange={handleChange} disabled={loading}>
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={task.status} onChange={handleChange} disabled={loading}>
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* DATE + TIME */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Due Date <span className="required">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={task.dueDate}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Due Time <span className="required">*</span>
                                </label>
                                <input
                                    type="time"
                                    name="dueTime"
                                    value={task.dueTime}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* CREATE BUTTON */}
                        <button
                            type="submit"
                            className="create-task-button"
                            disabled={loading || uploadingImage}
                        >
                            {uploadingImage ? "Uploading Images..." : loading ? "Creating..." : "Create Task"}
                        </button>

                        {message && (
                            <div
                                className={`task-message ${apiError ? "task-message-error" : "task-message-success"
                                    }`}
                                role={apiError ? "alert" : "status"}
                            >
                                {message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    export default TaskComponent;