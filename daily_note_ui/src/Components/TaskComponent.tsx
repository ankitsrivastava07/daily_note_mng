import { useRef, useState } from "react";
import "./CSS/TaskComponent.css";

function CreateTask() {

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
    });

    const [attachments, setAttachments] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const userId =
        localStorage.getItem("userId") || "ankit0397";


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
    };


    // =========================================================
    // DESCRIPTION CHANGE
    // =========================================================

    const handleDescriptionChange = () => {

        if (!editorRef.current) {
            return;
        }

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

        if (!editorRef.current) {
            return;
        }

        const html =
            editorRef.current.innerHTML;

        setTask((prev) => ({
            ...prev,
            content: html,
        }));
    };


    // =========================================================
    // PASTE HANDLER
    // =========================================================

    const handleDescriptionPaste = (e) => {

        const items =
            Array.from(
                e.clipboardData?.items || []
            );

        // Get all pasted images
        const imageFiles =
            items
                .filter(
                    (item) =>
                        item.kind === "file" &&
                        item.type?.startsWith("image/")
                )
                .map(
                    (item) =>
                        item.getAsFile()
                )
                .filter(Boolean);

        // Normal text paste
        if (imageFiles.length === 0) {
            return;
        }

        e.preventDefault();

        // =====================================================
        // MAXIMUM 5 IMAGES
        // =====================================================

        const availableSlots =
            5 - attachments.length;

        if (availableSlots <= 0) {

            setMessage(
                "Maximum 5 images are allowed."
            );

            return;
        }

        if (
            imageFiles.length >
            availableSlots
        ) {

            setMessage(
                `Maximum 5 images are allowed. You can add only ${availableSlots} more image(s).`
            );

            return;
        }

        console.log(
            "PASTED IMAGES:",
            imageFiles
        );

        imageFiles.forEach(
            (imageFile) => {

                insertImageIntoEditor(
                    imageFile
                );
            }
        );
    };


    // =========================================================
    // INSERT IMAGE INTO EDITOR
    // =========================================================

    const insertImageIntoEditor = (file) => {

        if (!editorRef.current) {
            return;
        }

        // =====================================================
        // FILE VALIDATION
        // =====================================================

        if (
            !file ||
            !file.type ||
            !file.type.startsWith("image/")
        ) {

            setMessage(
                "Only image files are supported"
            );

            return;
        }


        // =====================================================
        // MAX FILE SIZE = 10 MB
        // =====================================================

        const MAX_FILE_SIZE =
            10 * 1024 * 1024;

        if (
            file.size >
            MAX_FILE_SIZE
        ) {

            setMessage(
                "Image size must be less than 10 MB"
            );

            return;
        }


        // =====================================================
        // TEMPORARY ID
        // =====================================================

        const tempId =
            crypto.randomUUID();


        // =====================================================
        // FILE NAME
        // =====================================================

        const extension =
            getFileExtension(
                file.type
            );

        const fileName =
            `pasted-${Date.now()}-${tempId}.${extension}`;


        // =====================================================
        // LOCAL BLOB PREVIEW
        // =====================================================

        const previewUrl =
            URL.createObjectURL(
                file
            );


        // =====================================================
        // CREATE IMAGE ELEMENT
        // =====================================================

        const imageElement =
            document.createElement(
                "img"
            );

        imageElement.src =
            previewUrl;

        imageElement.alt =
            fileName;

        imageElement.className =
            "description-pasted-image";


        imageElement.setAttribute(
            "contenteditable",
            "false"
        );


        imageElement.setAttribute(
            "data-temp-id",
            tempId
        );


        imageElement.setAttribute(
            "data-uploading",
            "pending"
        );


        imageElement.setAttribute(
            "data-preview-url",
            previewUrl
        );


        imageElement.setAttribute(
            "data-file-name",
            fileName
        );


        imageElement.setAttribute(
            "data-content-type",
            file.type
        );


        // =====================================================
        // INSERT AT CURRENT CURSOR POSITION
        // =====================================================

        const selection =
            window.getSelection();

        let insertedAtCursor =
            false;


        if (
            selection &&
            selection.rangeCount > 0
        ) {

            const range =
                selection.getRangeAt(0);


            if (
                editorRef.current.contains(
                    range.commonAncestorContainer
                )
            ) {

                range.deleteContents();


                range.insertNode(
                    imageElement
                );


                insertedAtCursor =
                    true;


                // ---------------------------------------------
                // ADD EDITABLE LINE AFTER IMAGE
                // ---------------------------------------------

                const newLine =
                    document.createElement(
                        "div"
                    );

                newLine.innerHTML =
                    "<br>";


                imageElement.after(
                    newLine
                );


                // ---------------------------------------------
                // MOVE CURSOR AFTER IMAGE
                // ---------------------------------------------

                const newRange =
                    document.createRange();


                newRange.setStart(
                    newLine,
                    0
                );


                newRange.collapse(
                    true
                );


                selection.removeAllRanges();


                selection.addRange(
                    newRange
                );
            }
        }


        // =====================================================
        // CURSOR POSITION NOT AVAILABLE
        // =====================================================

        if (!insertedAtCursor) {

            editorRef.current.appendChild(
                imageElement
            );


            const newLine =
                document.createElement(
                    "div"
                );


            newLine.innerHTML =
                "<br>";


            editorRef.current.appendChild(
                newLine
            );
        }


        // =====================================================
        // SAVE ATTACHMENT
        // =====================================================

        setAttachments(
            (prev) => {

                // Protect against stale React state
                if (prev.length >= 5) {

                    imageElement.remove();

                    URL.revokeObjectURL(
                        previewUrl
                    );

                    setMessage(
                        "Maximum 5 images are allowed."
                    );

                    return prev;
                }


                return [
                    ...prev,
                    {
                        tempId,
                        file,
                        fileName,

                        contentType:
                            file.type,

                        fileSize:
                            file.size,

                        previewUrl,
                    },
                ];
            }
        );


        // =====================================================
        // UPDATE DESCRIPTION
        // =====================================================

        updateEditorContent();


        editorRef.current.focus();


        setMessage(
            "Image added. It will upload after task creation."
        );


        console.log(
            "IMAGE INSERTED:",
            {
                tempId,
                fileName,
                contentType:
                    file.type,
                fileSize:
                    file.size,
                previewUrl,
            }
        );
    };


    // =========================================================
    // GET PRESIGNED URLS
    //
    // ONE API CALL FOR MAXIMUM 5 FILES
    // =========================================================

    const getPresignedUrls = async (
        attachmentsToUpload,
        referenceId
    ) => {

        if (
            !attachmentsToUpload ||
            attachmentsToUpload.length === 0
        ) {
            return [];
        }


        if (
            attachmentsToUpload.length >
            5
        ) {

            throw new Error(
                "Maximum 5 files are allowed"
            );
        }


        const dmsBaseUrl =
            import.meta.env
                .VITE_DMS_API_BASE_URL;


        if (!dmsBaseUrl) {

            throw new Error(
                "VITE_DMS_API_BASE_URL is not configured"
            );
        }


        // =====================================================
        // GET FILE NAMES
        // =====================================================

        const fileNames =
            attachmentsToUpload.map(
                (attachment) =>
                    attachment.fileName
            );


        // =====================================================
        // QUERY PARAMETERS
        //
        // ?fileName=a.png&fileName=b.png
        // =====================================================

        const params =
            new URLSearchParams();


        fileNames.forEach(
            (name) => {

                params.append(
                    "fileName",
                    name
                );
            }
        );


        const presignedApiUrl =
            `${dmsBaseUrl}/api/v1/${referenceId}/dms/presigned?${params.toString()}`;


        console.log(
            "PRESIGNED API URL:",
            presignedApiUrl
        );


        // =====================================================
        // CALL DMS
        // =====================================================

        const response =
            await fetch(
                presignedApiUrl,
                {
                    method: "GET",

                    headers: {
                        userId:
                            userId,
                    },
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "PRESIGNED API ERROR:",
                errorText
            );


            throw new Error(
                "Unable to get presigned URLs"
            );
        }


        const presignedResponse =
            await response.json();


        console.log(
            "PRESIGNED RESPONSE:",
            presignedResponse
        );


        if (
            !presignedResponse.success ||
            !presignedResponse.data
        ) {

            throw new Error(
                presignedResponse.message ||
                "Presigned URLs not returned"
            );
        }


        const presignedUrls =
            presignedResponse.data;


        if (
            !Array.isArray(
                presignedUrls
            )
        ) {

            throw new Error(
                "Invalid presigned URL response. Expected array."
            );
        }


        if (
            presignedUrls.length !==
            attachmentsToUpload.length
        ) {

            throw new Error(
                "Presigned URL count does not match attachment count"
            );
        }


        return presignedUrls;
    };


    // =========================================================
    // UPLOAD ALL IMAGES
    // =========================================================

    const uploadImagesToDms = async (
        attachmentsToUpload,
        taskId
    ) => {

        if (
            !attachmentsToUpload?.length
        ) {
            return [];
        }


        if (
            attachmentsToUpload.length >
            5
        ) {

            throw new Error(
                "Maximum 5 files are allowed"
            );
        }


        const referenceId =
            taskId;


        // =====================================================
        // STEP 1
        // GET PRESIGNED URLS
        // =====================================================

        const presignedUrls =
            await getPresignedUrls(
                attachmentsToUpload,
                referenceId
            );


        if (
            presignedUrls.length !==
            attachmentsToUpload.length
        ) {

            throw new Error(
                "Presigned URL count does not match attachment count"
            );
        }


        // =====================================================
        // STEP 2
        // UPLOAD FILES TO S3
        // =====================================================

        const uploadedAttachments =
            [];


        for (
            let index = 0;
            index <
            attachmentsToUpload.length;
            index++
        ) {

            const attachment =
                attachmentsToUpload[
                    index
                ];


            const uploadUrl =
                presignedUrls[
                    index
                ];


            const {
                file,
                tempId,
                fileName,
                contentType,
                fileSize,
            } = attachment;


            console.log(
                "UPLOADING TO S3:",
                {
                    referenceId,
                    fileName,
                    contentType,
                    fileSize,
                }
            );


            // =================================================
            // PUT DIRECTLY TO S3
            // =================================================

            const uploadResponse =
                await fetch(
                    uploadUrl,
                    {
                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                contentType,
                        },

                        body:
                            file,
                    }
                );


            if (
                !uploadResponse.ok
            ) {

                const errorText =
                    await uploadResponse
                        .text();


                console.error(
                    "S3 UPLOAD FAILED:",
                    fileName,
                    errorText
                );


                throw new Error(
                    `Unable to upload ${fileName} to S3`
                );
            }


            console.log(
                "S3 UPLOAD SUCCESS:",
                fileName
            );


            uploadedAttachments.push(
                {
                    tempId,
                    referenceId,
                    fileName,
                    contentType,
                    fileSize,
                }
            );
        }


        // =====================================================
        // STEP 3
        // SAVE DOCUMENT METADATA
        // =====================================================

        await saveDocumentMetadata(
            referenceId,
            uploadedAttachments
        );


        // =====================================================
        // STEP 4
        // UPDATE LOCAL EDITOR
        // =====================================================

        uploadedAttachments.forEach(
            (uploaded) => {

                updateImageAfterUpload(
                    uploaded
                );
            }
        );


        return uploadedAttachments;
    };


    // =========================================================
    // SAVE DOCUMENT METADATA
    // =========================================================

    const saveDocumentMetadata = async (
        referenceId,
        uploadedAttachments
    ) => {

        const dmsBaseUrl =
            import.meta.env
                .VITE_DMS_API_BASE_URL;


        if (!dmsBaseUrl) {

            throw new Error(
                "VITE_DMS_API_BASE_URL is not configured"
            );
        }


        // =====================================================
        // BUILD List<DocumentDto>
        // =====================================================

        const documentDtos =
            uploadedAttachments.map(
                (attachment) => ({
                    fileName:
                        attachment.fileName,

                    contentType:
                        attachment.contentType,

                    fileSize:
                        attachment.fileSize,
                })
            );


        console.log(
            "SAVE DOCUMENT METADATA REQUEST:",
            documentDtos
        );


        // =====================================================
        // POST /api/v1/{referenceId}/dms
        // =====================================================

        const response =
            await fetch(
                `${dmsBaseUrl}/api/v1/${referenceId}/dms`,
                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        userId:
                            userId,
                    },

                    body:
                        JSON.stringify(
                            documentDtos
                        ),
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "SAVE DOCUMENT METADATA ERROR:",
                errorText
            );


            throw new Error(
                "Files uploaded to S3, but document metadata could not be saved"
            );
        }


        const result =
            await response.json();


        console.log(
            "DOCUMENT METADATA SAVED:",
            result
        );


        if (
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "Document metadata could not be saved"
            );
        }


        return result;
    };


    // =========================================================
    // UPDATE LOCAL IMAGE AFTER UPLOAD
    // =========================================================

    const updateImageAfterUpload = (
        uploaded
    ) => {

        if (!editorRef.current) {
            return;
        }


        const imageElement =
            editorRef.current
                .querySelector(
                    `img[data-temp-id="${uploaded.tempId}"]`
                );


        if (!imageElement) {

            console.warn(
                "IMAGE ELEMENT NOT FOUND:",
                uploaded.tempId
            );

            return;
        }


        if (
            uploaded.referenceId
        ) {

            imageElement.setAttribute(
                "data-reference-id",
                uploaded.referenceId
            );
        }


        imageElement.setAttribute(
            "data-file-name",
            uploaded.fileName
        );


        imageElement.setAttribute(
            "data-content-type",
            uploaded.contentType
        );


        imageElement.removeAttribute(
            "data-temp-id"
        );


        imageElement.removeAttribute(
            "data-uploading"
        );


        imageElement.removeAttribute(
            "data-upload-failed"
        );


        updateEditorContent();
    };


    // =========================================================
    // FILE EXTENSION
    // =========================================================

    const getFileExtension = (
        contentType
    ) => {

        switch (
            contentType
        ) {

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


    // =========================================================
    // DESCRIPTION VALIDATION
    // =========================================================

    const hasDescriptionContent = () => {

        if (!editorRef.current) {
            return false;
        }


        const text =
            editorRef.current
                .innerText
                .trim();


        const images =
            editorRef.current
                .querySelectorAll(
                    "img"
                );


        return (
            text.length > 0 ||
            images.length > 0
        );
    };


    // =========================================================
    // GET INITIAL DESCRIPTION
    //
    // REMOVE LOCAL BLOB URL BEFORE SAVING TASK
    // =========================================================

    const getInitialDescriptionHtml = () => {

        if (!editorRef.current) {
            return "";
        }


        const clone =
            editorRef.current
                .cloneNode(true);


        const images =
            clone.querySelectorAll(
                "img"
            );


        images.forEach(
            (image) => {

                // Local blob URL must NOT
                // be stored in DynamoDB

                image.removeAttribute(
                    "src"
                );


                image.removeAttribute(
                    "data-preview-url"
                );


                image.removeAttribute(
                    "data-temp-id"
                );


                image.removeAttribute(
                    "data-uploading"
                );


                image.removeAttribute(
                    "data-upload-failed"
                );


                image.removeAttribute(
                    "contenteditable"
                );
            }
        );


        return clone.innerHTML;
    };


    // =========================================================
    // CREATE TASK
    // =========================================================

    const handleSubmit = async (
        e
    ) => {

        e.preventDefault();


        // =====================================================
        // VALIDATION
        // =====================================================

        if (
            !task.name.trim()
        ) {

            setMessage(
                "Task title is required"
            );

            return;
        }


        if (
            !hasDescriptionContent()
        ) {

            setMessage(
                "Description is required"
            );

            return;
        }


        if (
            !task.dueDate
        ) {

            setMessage(
                "Due date is required"
            );

            return;
        }


        if (
            !task.dueTime
        ) {

            setMessage(
                "Due time is required"
            );

            return;
        }


        if (
            !task.priority
        ) {

            setMessage(
                "Priority is required"
            );

            return;
        }


        if (
            !task.status
        ) {

            setMessage(
                "Status is required"
            );

            return;
        }


        if (
            attachments.length >
            5
        ) {

            setMessage(
                "Maximum 5 images are allowed"
            );

            return;
        }


        try {

            setLoading(
                true
            );


            setMessage(
                "Creating task..."
            );


            // =================================================
            // STEP 1
            // CREATE TASK
            // =================================================

            const initialDescription =
                getInitialDescriptionHtml();


            const createRequest = {

                ...task,

                content:
                    initialDescription,

                userId:
                    userId,

                attachments:
                    [],
            };


            console.log(
                "CREATE TASK REQUEST:",
                createRequest
            );


            const response =
                await fetch(
                    `${import.meta.env.VITE_API_BASE_URL}/api/v1/user/${userId}/task`,
                    {
                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            userId:
                                userId,
                        },

                        body:
                            JSON.stringify(
                                createRequest
                            ),
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();


                console.error(
                    "CREATE TASK ERROR:",
                    errorText
                );


                throw new Error(
                    "Failed to create task"
                );
            }


            // =================================================
            // STEP 2
            // GET CREATED TASK
            // =================================================

            const createdTaskResponse =
                await response.json();


            console.log(
                "CREATED TASK RESPONSE:",
                createdTaskResponse
            );


            if (
                !createdTaskResponse.success
            ) {

                throw new Error(
                    createdTaskResponse.message ||
                    "Task creation failed"
                );
            }


            if (
                !createdTaskResponse
                    .data?.id
            ) {

                throw new Error(
                    "Task created but taskId was not returned"
                );
            }


            const taskId =
                createdTaskResponse
                    .data
                    .id;


            console.log(
                "TASK ID:",
                taskId
            );


            // =================================================
            // STEP 3
            // UPLOAD IMAGES
            // =================================================

            let uploadedAttachments =
                [];


            if (
                attachments.length >
                0
            ) {

                setUploadingImage(
                    true
                );


                setMessage(
                    `Uploading ${attachments.length} image(s)...`
                );


                try {

                    uploadedAttachments =
                        await uploadImagesToDms(
                            attachments,
                            taskId
                        );

                } catch (
                    uploadError
                ) {

                    console.error(
                        "IMAGE UPLOAD FAILED:",
                        uploadError
                    );


                    throw new Error(
                        `Task created, but image upload failed: ${uploadError.message}`
                    );
                }
            }


            // =================================================
            // SUCCESS
            // =================================================

            console.log(
                "TASK + DMS COMPLETED:",
                {
                    taskId,
                    uploadedAttachments,
                }
            );


            setMessage(
                "Task created successfully"
            );


            // =================================================
            // CLEAN LOCAL BLOB URLs
            // =================================================

            attachments.forEach(
                (attachment) => {

                    if (
                        attachment
                            .previewUrl
                    ) {

                        URL.revokeObjectURL(
                            attachment
                                .previewUrl
                        );
                    }
                }
            );


            // =================================================
            // RESET FORM
            // =================================================

            setTask({
                title: "",
                content: "",
                priority: "MEDIUM",
                dueDate: "",
                dueTime: "",
                status: "PENDING",
                meridiem: "AM",
                name: "",
            });


            setAttachments(
                []
            );


            if (
                editorRef.current
            ) {

                editorRef.current
                    .innerHTML = "";
            }


        } catch (
            error
        ) {

            console.error(
                "CREATE TASK FLOW ERROR:",
                error
            );


            setMessage(
                error.message ||
                "Unable to create task"
            );


        } finally {

            setLoading(
                false
            );


            setUploadingImage(
                false
            );
        }
    };


    // =========================================================
    // UI
    // =========================================================

    return (

        <div className="create-task-page">

            <div className="task-form-card">

                <div className="task-form-header">

                    <h1>
                        Create Task
                    </h1>

                    <p>
                        Add a new task to your daily workspace
                    </p>

                </div>


                <form
                    onSubmit={
                        handleSubmit
                    }
                >

                    {/* ===================================== */}
                    {/* TASK TITLE */}
                    {/* ===================================== */}

                    <div className="form-group">

                        <label>
                            Task Title{" "}

                            <span className="required">
                                *
                            </span>
                        </label>


                        <input
                            type="text"
                            name="name"
                            placeholder="Enter task title"
                            value={
                                task.name
                            }
                            onChange={
                                handleChange
                            }
                            required
                            disabled={
                                loading
                            }
                        />

                    </div>


                    {/* ===================================== */}
                    {/* DESCRIPTION */}
                    {/* ===================================== */}

                    <div className="form-group">

                        <label>
                            Description{" "}

                            <span className="required">
                                *
                            </span>
                        </label>


                        <div
                            ref={
                                editorRef
                            }
                            className="description-rich-editor"
                            contentEditable={
                                !loading
                            }
                            suppressContentEditableWarning={
                                true
                            }
                            data-placeholder="Type description or paste screenshot using Ctrl + V"
                            onInput={
                                handleDescriptionChange
                            }
                            onPaste={
                                handleDescriptionPaste
                            }
                        />


                        <div className="description-help">

                            Type text and paste screenshots using{" "}

                            <strong>
                                Ctrl + V
                            </strong>

                            {" "}

                            <span>
                                ({attachments.length}/5)
                            </span>

                        </div>


                        {
                            uploadingImage && (

                                <div className="image-uploading">

                                    Uploading{" "}

                                    {
                                        attachments.length
                                    }

                                    {" "}image(s) to DMS...

                                </div>
                            )
                        }

                    </div>


                    {/* ===================================== */}
                    {/* PRIORITY + STATUS */}
                    {/* ===================================== */}

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
                                disabled={
                                    loading
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
                                disabled={
                                    loading
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


                    {/* ===================================== */}
                    {/* DATE + TIME */}
                    {/* ===================================== */}

                    <div className="form-row">

                        <div className="form-group">

                            <label>

                                Due Date{" "}

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
                                disabled={
                                    loading
                                }
                            />

                        </div>


                        <div className="form-group">

                            <label>

                                Due Time{" "}

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
                                disabled={
                                    loading
                                }
                            />

                        </div>

                    </div>


                    {/* ===================================== */}
                    {/* CREATE BUTTON */}
                    {/* ===================================== */}

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

                                ? "Uploading Images..."

                                : loading

                                    ? "Creating..."

                                    : "Create Task"
                        }

                    </button>


                    {/* ===================================== */}
                    {/* MESSAGE */}
                    {/* ===================================== */}

                    {
                        message && (

                            <div className="task-message">

                                {message}

                            </div>
                        )
                    }

                </form>

            </div>

        </div>
    );
}

export default CreateTask;