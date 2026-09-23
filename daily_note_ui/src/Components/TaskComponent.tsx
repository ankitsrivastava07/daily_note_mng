import { useEffect, useState } from "react";
import "./CSS/TaskComponent.css";

function CreateTask() {

    const [task, setTask] = useState({
        title: "",
        content: "",
        priority: "MEDIUM",
        dueDate: "",
        dueTime: "",
        status: "PENDING",
        meridiem: "AM",
        name: "",
    });

    const [attachments, setAttachments] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const userId = localStorage.getItem("userId") || "ankit0397";

    // ---------------------------------------------------------
    // Normal input change
    // ---------------------------------------------------------
    const handleChange = (e) => {

        const { name, value } = e.target;

        setTask(prev => ({
            ...prev,
            [name]: value
        }));

        setMessage("");
    };


    // ---------------------------------------------------------
    // Handle Ctrl + V image paste
    // ---------------------------------------------------------
    const handlePaste = async (e) => {

        const items = e.clipboardData?.items;

        if (!items) {
            return;
        }

        const imageFiles = [];

        for (const item of items) {

            if (item.type.startsWith("image/")) {

                const file = item.getAsFile();

                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        // No image -> allow normal text paste
        if (imageFiles.length === 0) {
            return;
        }

        // Prevent browser from trying to paste image into textarea
        e.preventDefault();

        for (const file of imageFiles) {

            await uploadImageToDms(file);
        }
    };


    // ---------------------------------------------------------
    // Upload pasted image to DMS
    // ---------------------------------------------------------
    const uploadImageToDms = async (file) => {

        let previewUrl = null;

        try {

            setUploadingImage(true);
            setMessage("Uploading pasted image...");

            // Validate file type
            if (!file.type.startsWith("image/")) {
                throw new Error("Only image files are allowed");
            }

            // Example maximum 10 MB
            const MAX_FILE_SIZE = 10 * 1024 * 1024;

            if (file.size > MAX_FILE_SIZE) {
                throw new Error("Image must be smaller than 10 MB");
            }

            // Browser screenshots sometimes have a generic name
            const extension = getFileExtension(file.type);

            const fileName =
                file.name &&
                file.name !== "image.png"
                    ? file.name
                    : `pasted-${Date.now()}.${extension}`;

            // Create local preview
            previewUrl = URL.createObjectURL(file);

            // -------------------------------------------------
            // STEP 1
            // Ask DMS service for presigned upload URL
            // -------------------------------------------------

            const presignedResponse = await fetch(
                `${import.meta.env.VITE_DMS_API_BASE_URL}/api/v1/dms/presigned-upload`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "userId": userId
                    },

                    body: JSON.stringify({
                        userId: userId,
                        fileName: fileName,
                        contentType: file.type,
                        fileSize: file.size
                    })
                }
            );

            if (!presignedResponse.ok) {

                const errorText = await presignedResponse.text();

                console.error(
                    "Presigned URL Error:",
                    errorText
                );

                throw new Error(
                    "Unable to generate upload URL"
                );
            }

            const presignedData =
                await presignedResponse.json();

            console.log(
                "DMS Presigned Response:",
                presignedData
            );

            /*
             * Expected response:
             *
             * {
             *    "documentId": "abc-123",
             *    "uploadUrl": "https://bucket.s3.amazonaws.com/...",
             *    "key": "dms/ankit0397/abc-123.png"
             * }
             */


            // -------------------------------------------------
            // STEP 2
            // Upload actual image directly to S3
            // -------------------------------------------------

            const uploadResponse = await fetch(
                presignedData.uploadUrl,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": file.type
                    },

                    body: file
                }
            );

            if (!uploadResponse.ok) {

                throw new Error(
                    "Unable to upload image to S3"
                );
            }

            console.log(
                "Image uploaded successfully:",
                presignedData.key
            );


            // -------------------------------------------------
            // STEP 3
            // Save only DMS metadata
            // -------------------------------------------------

            const attachment = {

                documentId:
                    presignedData.documentId,

                key:
                    presignedData.key,

                fileName:
                    fileName,

                contentType:
                    file.type,

                fileSize:
                    file.size,

                previewUrl:
                    previewUrl
            };


            setAttachments(prev => [
                ...prev,
                attachment
            ]);


            setMessage(
                "Image attached successfully"
            );

        } catch (error) {

            console.error(
                "DMS Image Upload Error:",
                error
            );

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            setMessage(
                error.message ||
                "Unable to upload pasted image"
            );

        } finally {

            setUploadingImage(false);
        }
    };


    // ---------------------------------------------------------
    // Remove attachment
    // ---------------------------------------------------------
    const removeAttachment = (index) => {

        setAttachments(prev => {

            const attachment = prev[index];

            if (attachment?.previewUrl) {
                URL.revokeObjectURL(
                    attachment.previewUrl
                );
            }

            return prev.filter(
                (_, i) => i !== index
            );
        });
    };


    // ---------------------------------------------------------
    // Get extension from MIME type
    // ---------------------------------------------------------
    const getFileExtension = (contentType) => {

        switch (contentType) {

            case "image/jpeg":
                return "jpg";

            case "image/webp":
                return "webp";

            case "image/gif":
                return "gif";

            case "image/svg+xml":
                return "svg";

            case "image/png":
            default:
                return "png";
        }
    };


    // ---------------------------------------------------------
    // Submit Task
    // ---------------------------------------------------------
    const handleSubmit = async (e) => {

        e.preventDefault();

        // ---------------------------------------------
        // Validation
        // ---------------------------------------------

        if (!task.name.trim()) {

            setMessage(
                "Task title is required"
            );

            return;
        }

        if (!task.dueDate) {

            setMessage(
                "Due date is required"
            );

            return;
        }

        if (!task.dueTime) {

            setMessage(
                "Due time is required"
            );

            return;
        }

        if (!task.priority) {

            setMessage(
                "Priority is required"
            );

            return;
        }

        if (!task.status) {

            setMessage(
                "Status is required"
            );

            return;
        }

        if (!task.content.trim()) {

            setMessage(
                "Description is required"
            );

            return;
        }

        // Don't create task while image is uploading
        if (uploadingImage) {

            setMessage(
                "Please wait for image upload to complete"
            );

            return;
        }


        try {

            setLoading(true);

            setMessage("");


            // ---------------------------------------------
            // Remove previewUrl before sending backend
            // ---------------------------------------------

            const attachmentRequest =
                attachments.map(attachment => ({

                    documentId:
                        attachment.documentId,

                    key:
                        attachment.key,

                    fileName:
                        attachment.fileName,

                    contentType:
                        attachment.contentType,

                    fileSize:
                        attachment.fileSize
                }));


            // ---------------------------------------------
            // Final Task Request
            // ---------------------------------------------

            const requestBody = {

                ...task,

                userId: userId,

                attachments:
                    attachmentRequest
            };


            console.log(
                "Create Task Request:",
                requestBody
            );


            const response = await fetch(

                `${import.meta.env.VITE_API_BASE_URL}/api/v1/user/${userId}/task`,

                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "userId":
                            userId
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );


            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "Create Task Error:",
                    errorText
                );

                throw new Error(
                    "Failed to create task"
                );
            }


            setMessage(
                "Task created successfully"
            );


            // ---------------------------------------------
            // Clean preview URLs
            // ---------------------------------------------

            attachments.forEach(
                attachment => {

                    if (
                        attachment.previewUrl
                    ) {

                        URL.revokeObjectURL(
                            attachment.previewUrl
                        );
                    }
                }
            );


            // ---------------------------------------------
            // Reset Form
            // ---------------------------------------------

            setTask({

                title: "",

                content: "",

                priority:
                    "MEDIUM",

                dueDate: "",

                dueTime: "",

                status:
                    "PENDING",

                meridiem:
                    "AM",

                name: ""
            });


            setAttachments([]);


        } catch (error) {

            console.error(
                "Create Task Error:",
                error
            );

            setMessage(
                "Unable to create task"
            );

        } finally {

            setLoading(false);
        }
    };


    // ---------------------------------------------------------
    // Clean object URLs when component is destroyed
    // ---------------------------------------------------------
    useEffect(() => {

        return () => {

            attachments.forEach(
                attachment => {

                    if (
                        attachment.previewUrl
                    ) {

                        URL.revokeObjectURL(
                            attachment.previewUrl
                        );
                    }
                }
            );
        };

    }, []);


    // =========================================================
    // UI
    // =========================================================

    return (

        <div className="create-task-page">

            <div className="task-form-card">


                {/* Header */}

                <div className="task-form-header">

                    <h1>
                        Create Task
                    </h1>

                    <p>
                        Add a new task to your daily workspace
                    </p>

                </div>


                <form onSubmit={handleSubmit}>


                    {/* Task Title */}

                    <div className="form-group">

                        <label>

                            Task Title

                            <span className="required">
                                *
                            </span>

                        </label>


                        <input

                            type="text"

                            name="name"

                            placeholder="Enter task title"

                            value={task.name}

                            onChange={handleChange}

                            required
                        />

                    </div>


                    {/* Description */}

                    <div className="form-group">

                        <label>
                            Description
                        </label>


                        <textarea

                            name="content"

                            placeholder="Enter task description or paste screenshot here using Ctrl + V"

                            rows="6"

                            value={task.content}

                            onChange={handleChange}

                            onPaste={handlePaste}

                        />


                        <div className="paste-image-hint">

                            You can paste screenshots directly using
                            {" "}
                            <strong>
                                Ctrl + V
                            </strong>

                        </div>


                        {/* Uploading */}

                        {uploadingImage && (

                            <div className="image-uploading">

                                Uploading image...

                            </div>

                        )}


                        {/* Image Preview */}

                        {attachments.length > 0 && (

                            <div className="attachment-preview">

                                {attachments.map(
                                    (attachment, index) => (

                                        <div
                                            key={`${attachment.documentId}-${index}`}
                                            className="attachment-item"
                                        >

                                            <div className="image-preview-wrapper">

                                                <img

                                                    src={
                                                        attachment.previewUrl
                                                    }

                                                    alt={
                                                        attachment.fileName
                                                    }

                                                    className="pasted-image-preview"

                                                />


                                                <button

                                                    type="button"

                                                    className="remove-attachment-button"

                                                    onClick={() =>
                                                        removeAttachment(index)
                                                    }

                                                    title="Remove image"
                                                >

                                                    ×

                                                </button>

                                            </div>


                                            <span className="attachment-name">

                                                {
                                                    attachment.fileName
                                                }

                                            </span>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </div>


                    {/* Priority + Status */}

                    <div className="form-row">


                        <div className="form-group">

                            <label>
                                Priority
                            </label>


                            <select

                                name="priority"

                                value={
                                    task.priority
                                }

                                onChange={
                                    handleChange
                                }
                            >

                                <option value="LOW">
                                    Low
                                </option>

                                <option value="MEDIUM">
                                    Medium
                                </option>

                                <option value="HIGH">
                                    High
                                </option>

                            </select>

                        </div>


                        <div className="form-group">

                            <label>
                                Status
                            </label>


                            <select

                                name="status"

                                value={
                                    task.status
                                }

                                onChange={
                                    handleChange
                                }
                            >

                                <option value="PENDING">
                                    Pending
                                </option>

                                <option value="IN_PROGRESS">
                                    In Progress
                                </option>

                                <option value="COMPLETED">
                                    Completed
                                </option>

                            </select>

                        </div>

                    </div>


                    {/* Due Date + Time */}

                    <div className="form-row">


                        <div className="form-group">

                            <label>

                                Due Date

                                <span className="required">
                                    *
                                </span>

                            </label>


                            <input

                                type="date"

                                name="dueDate"

                                value={
                                    task.dueDate
                                }

                                onChange={
                                    handleChange
                                }

                                required
                            />

                        </div>


                        <div className="form-group">

                            <label>

                                Due Time

                                <span className="required">
                                    *
                                </span>

                            </label>


                            <input

                                type="time"

                                name="dueTime"

                                value={
                                    task.dueTime
                                }

                                onChange={
                                    handleChange
                                }

                                required
                            />

                        </div>

                    </div>


                    {/* Create Button */}

                    <button

                        type="submit"

                        className="create-task-button"

                        disabled={
                            loading ||
                            uploadingImage
                        }
                    >

                        {
                            uploadingImage
                                ? "Uploading Image..."
                                : loading
                                    ? "Creating..."
                                    : "Create Task"
                        }

                    </button>


                    {/* Message */}

                    {message && (

                        <div className="task-message">

                            {message}

                        </div>

                    )}

                </form>

            </div>

        </div>
    );
}

export default CreateTask;