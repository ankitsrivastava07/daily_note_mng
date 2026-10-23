import { useRef, useState, useEffect } from "react";
import "./CSS/TaskComponent.css";

function TaskComponent() {
    const editorRef = useRef(null);
    const attachmentsRef = useRef([]);

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
    const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:9091";
    const DMS_BASE_URL = import.meta.env.VITE_DMS_API_BASE_URL;

    // Keep attachment state and ref synchronized.
    const updateAttachments = (updater) => {
        setAttachments((previous) => {
            const next =
                typeof updater === "function" ? updater(previous) : updater;

            attachmentsRef.current = next;
            return next;
        });
    };

    // Release temporary browser image URLs.
    const cleanupAttachments = (items) => {
        items.forEach((attachment) => {
            if (attachment.previewUrl) {
                URL.revokeObjectURL(attachment.previewUrl);
            }
        });
    };

    useEffect(() => {
        return () => {
            cleanupAttachments(attachmentsRef.current);
        };
    }, []);

    // Extract file extension.
    const getFileExtension = (contentType) => {
        const extension = contentType?.split("/")[1]?.split("+")[0];
        return extension || "png";
    };

    // Parse API responses safely, including plain-text errors.
    const readResponse = async (response) => {
        const responseText = await response.text();

        if (!responseText) {
            return {};
        }

        try {
            return JSON.parse(responseText);
        } catch {
            return { message: responseText };
        }
    };

    // Upload images to DMS using presigned URLs.
    const uploadImagesToDms = async (imagesToUpload, taskId) => {
        if (!DMS_BASE_URL) {
            throw new Error(
                "DMS API URL is not configured. Configure VITE_DMS_API_BASE_URL."
            );
        }

        const uploadedResults = [];

        for (const attachment of imagesToUpload) {
            // 1. Request presigned URL.
            const presignedResponse = await fetch(
                `${DMS_BASE_URL}/api/v1/${encodeURIComponent(
                    taskId
                )}/dms/presigned?fileName=${encodeURIComponent(
                    attachment.fileName
                )}`,
                {
                    method: "GET",
                    headers: { userId },
                }
            );

            const presignedData = await readResponse(presignedResponse);

            if (!presignedResponse.ok) {
                throw new Error(
                    presignedData.message ||
                    `Failed to get upload URL for ${attachment.fileName}`
                );
            }

            const uploadUrl =
                presignedData.data?.uploadUrl || presignedData.uploadUrl;

            if (!uploadUrl) {
                throw new Error(
                    `Upload URL not found for ${attachment.fileName}`
                );
            }

            // 2. Upload the file directly to S3.
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": attachment.contentType,
                },
                body: attachment.file,
            });

            if (!uploadResponse.ok) {
                throw new Error(
                    `Failed to upload ${attachment.fileName} to storage. HTTP ${uploadResponse.status}`
                );
            }

            uploadedResults.push({
                fileName: attachment.fileName,
                status: "SUCCESS",
            });
        }

        return uploadedResults;
    };

    // Handle normal form fields.
    const handleChange = (event) => {
        const { name, value } = event.target;

        setTask((previous) => ({
            ...previous,
            [name]: value,
        }));

        setMessage("");
        setApiError("");
    };

    // Save rich-text description.
    const handleDescriptionChange = () => {
        if (!editorRef.current) return;

        setTask((previous) => ({
            ...previous,
            content: editorRef.current.innerHTML,
        }));

        setMessage("");
        setApiError("");
    };

    // Insert an image into the editor.
    const insertImageIntoEditor = (file) => {
        if (!editorRef.current || !file) return false;

        if (!file.type?.startsWith("image/")) {
            setMessage("Only image files are supported.");
            return false;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024;

        if (file.size > MAX_FILE_SIZE) {
            setMessage("Image size must be less than 10 MB.");
            return false;
        }

        if (attachmentsRef.current.length >= 5) {
            setMessage("Maximum 5 images are allowed.");
            return false;
        }

        const tempId = crypto.randomUUID();
        const fileName = `pasted-${Date.now()}-${tempId}.${getFileExtension(
            file.type
        )}`;
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

        updateAttachments((previous) => [
            ...previous,
            {
                tempId,
                file,
                fileName,
                contentType: file.type,
                fileSize: file.size,
                previewUrl,
            },
        ]);

        setTask((previous) => ({
            ...previous,
            content: editorRef.current.innerHTML,
        }));

        editorRef.current.focus();
        setMessage("Image added. It will upload after task creation.");
        setApiError("");

        return true;
    };

    // Paste screenshots using Ctrl + V.
    const handleDescriptionPaste = (event) => {
        const items = Array.from(event.clipboardData?.items || []);

        const imageFiles = items
            .filter(
                (item) =>
                    item.kind === "file" && item.type?.startsWith("image/")
            )
            .map((item) => item.getAsFile())
            .filter(Boolean);

        if (imageFiles.length === 0) return;

        event.preventDefault();

        const availableSlots = 5 - attachmentsRef.current.length;

        if (availableSlots <= 0) {
            setMessage("Maximum 5 images are allowed.");
            return;
        }

        const filesToInsert = imageFiles.slice(0, availableSlots);

        filesToInsert.forEach((file) => {
            insertImageIntoEditor(file);
        });

        if (imageFiles.length > availableSlots) {
            setMessage(
                `Maximum 5 images are allowed. Only ${availableSlots} more image(s) can be added.`
            );
        }
    };

    // Submit task and upload its attachments.
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setLoading(true);
        setMessage("");
        setApiError("");

        try {
            // Read the latest editor content before submission.
            const taskPayload = {
                ...task,
                content: editorRef.current
                    ? editorRef.current.innerHTML
                    : task.content,
                userId,
            };

            if (!taskPayload.name.trim()) {
                throw new Error("Task title is required.");
            }

            if (!taskPayload.content.trim()) {
                throw new Error("Task description is required.");
            }

            // 1. Create the task.
            const taskResponse = await fetch(
                `${API_BASE_URL}/api/v1/task`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        userId,
                    },
                    body: JSON.stringify(taskPayload),
                }
            );

            const taskResult = await readResponse(taskResponse);

            // IMPORTANT: Stop immediately if task creation fails.
            if (!taskResponse.ok || taskResult.success === false) {
                if (taskResponse.status === 409) {
                    setTimeout(() => setApiError(taskResult.message), 300);
                }
                return;
            }

            const taskId = taskResult.data?.id;

            if (!taskId) {
                throw new Error(
                    "Task creation response did not contain a task ID."
                );
            }

            // 2. Upload attachments after successful task creation.
            const currentAttachments = [...attachmentsRef.current];

            if (currentAttachments.length > 0) {
                setUploadingImage(true);

                setMessage(
                    `Task created. Uploading ${currentAttachments.length} image(s)...`
                );

                await uploadImagesToDms(currentAttachments, taskId);
            }

            // 3. Success: clean up and reset.
            cleanupAttachments(currentAttachments);
            updateAttachments([]);

            setTask({
                title: "",
                content: "",
                priority: "MEDIUM",
                dueDate: "",
                dueTime: "",
                status: "PENDING",
                meridiem: "AM",
                name: "",
                userId,
            });

            if (editorRef.current) {
                editorRef.current.innerHTML = "";
            }

            setApiError("");
            setMessage("Task created successfully!");
        } catch (error) {
            console.error("CREATE TASK FLOW ERROR:", error);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unable to create task.";

            setApiError(errorMessage);
            setMessage(errorMessage);
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
                        <label htmlFor="task-title">
                            Task Title <span className="required">*</span>
                        </label>

                        <input
                            id="task-title"
                            type="text"
                            name="name"
                            placeholder="Enter task title"
                            value={task.name}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />

                        {apiError && (
                            <div
                                style={{
                                    color: "red",
                                    marginTop: "5px",
                                    fontSize: "14px",
                                }}
                                role="alert"
                            >
                                {apiError}
                            </div>
                        )}
                    </div>

                    {/* DESCRIPTION */}
                    <div className="form-group">
                        <label>
                            Description <span className="required">*</span>
                        </label>

                        <div
                            ref={editorRef}
                            className="description-rich-editor"
                            contentEditable={!loading}
                            suppressContentEditableWarning
                            data-placeholder="Type description or paste screenshot using Ctrl + V"
                            onInput={handleDescriptionChange}
                            onPaste={handleDescriptionPaste}
                        />

                        <div className="description-help">
                            Type text and paste screenshots using{" "}
                            <strong>Ctrl + V</strong>{" "}
                            <span>({attachments.length}/5)</span>
                        </div>

                        {uploadingImage && (
                            <div className="image-uploading">
                                Uploading images to DMS...
                            </div>
                        )}
                    </div>

                    {/* PRIORITY + STATUS */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="task-priority">Priority</label>

                            <select
                                id="task-priority"
                                name="priority"
                                value={task.priority}
                                onChange={handleChange}
                                disabled={loading}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="task-status">Status</label>

                            <select
                                id="task-status"
                                name="status"
                                value={task.status}
                                onChange={handleChange}
                                disabled={loading}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                    </div>

                    {/* DATE + TIME */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="task-due-date">
                                Due Date <span className="required">*</span>
                            </label>

                            <input
                                id="task-due-date"
                                type="date"
                                name="dueDate"
                                value={task.dueDate}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="task-due-time">
                                Due Time <span className="required">*</span>
                            </label>

                            <input
                                id="task-due-time"
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
                        disabled={loading}
                    >
                        {uploadingImage
                            ? "Uploading Images..."
                            : loading
                                ? "Creating..."
                                : "Create Task"}
                    </button>

                    {/* RESULT MESSAGE */}
                    {message && (
                        <div className="alert alert-danger" role="alert">
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default TaskComponent;