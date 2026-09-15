import { useState } from 'react';

function DailyNoteForm() {

    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Category -> Sub-Category Mapping
    const [categoryTree, setCategoryTree] = useState({
        Work: [
            'Sprint Planning',
            'Architecture',
            '1-on-1 Sync',
            'Bug Triage',
            'Others'
        ],
        Personal: [
            'Fitness',
            'Finance',
            'Reading List',
            'Side Project',
            'Others'
        ],
        'Interview Prep': [
            'System Design',
            'LeetCode / DSA',
            'Behavioral & HR',
            'Low Level Design (LLD)',
            'Others'
        ],
        Ideas: [
            'Product Concepts',
            'Tech Exploration',
            'Others'
        ],
        Others: [
            'General',
            'Others'
        ],
    });

    const [selectedCategory, setSelectedCategory] = useState('Work');

    const [selectedSubCategory, setSelectedSubCategory] =
        useState('Sprint Planning');

    const [isCreatingCat, setIsCreatingCat] = useState(false);
    const [isCreatingSubCat, setIsCreatingSubCat] = useState(false);

    const [newCatInput, setNewCatInput] = useState('');
    const [newSubCatInput, setNewSubCatInput] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        priority: 'Medium',
        status: 'Draft',
        project: 'General',
        visibility: 'Team',

        assignee: '',
        location: '',
        version: 'v1.0',

        createdDateTime: getCurrentDateTime(),
        dueDateTime: '',
        estimatedTime: '',

        reminderAlert: '15 mins before',
        recurringFrequency: 'Never',

        isConfidential: false,
        isPinned: false,

        keyTakeaways: '',
        description: '',

        // Keep tags STRING for text input
        tags: '',

        referenceUrl: '',
        userId: "ankit0397"
    });

    const [todoList, setTodoList] = useState([]);
    const [trashList, setTrashList] = useState([]);
    const [showTrash, setShowTrash] = useState(false);

    const [todoInput, setTodoInput] = useState('');

    const [selectedFiles, setSelectedFiles] = useState([]);

    // --------------------------------------------------------
    // Generic form input handler
    // --------------------------------------------------------

    const handleInputChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setFormData((prev) => ({
            ...prev,

            [name]: type === 'checkbox'
                    ? checked
                    : value
        }));
    };

    // --------------------------------------------------------
    // Category
    // --------------------------------------------------------

    const handleCategoryChange = (e) => {

        const value = e.target.value;

        if (value === '__add_new_cat__') {

            setIsCreatingCat(true);

            return;
        }

        setSelectedCategory(value);

        const subCategories =
            categoryTree[value] || [];

        setSelectedSubCategory(
            subCategories.length > 0
                ? subCategories[0]
                : ''
        );
    };

    const handleSubCategoryChange = (e) => {

        const value = e.target.value;

        if (value === '__add_new_subcat__') {

            setIsCreatingSubCat(true);

            return;
        }

        setSelectedSubCategory(value);
    };

    const handleAddCategory = () => {

        const category =
            newCatInput.trim();

        if (!category) {
            return;
        }

        if (!categoryTree[category]) {

            setCategoryTree((prev) => ({
                ...prev,
                [category]: ['Others']
            }));
        }

        setSelectedCategory(category);
        setSelectedSubCategory('Others');

        setNewCatInput('');
        setIsCreatingCat(false);
    };

    const handleAddSubCategory = () => {

        const subCategory =
            newSubCatInput.trim();

        if (!subCategory || !selectedCategory) {
            return;
        }

        setCategoryTree((prev) => ({
            ...prev,

            [selectedCategory]: [
                ...(prev[selectedCategory] || []),
                subCategory
            ]
        }));

        setSelectedSubCategory(subCategory);

        setNewSubCatInput('');
        setIsCreatingSubCat(false);
    };

    // --------------------------------------------------------
    // Todos
    // --------------------------------------------------------

    const handleAddTodo = () => {

        if (!todoInput.trim()) {
            return;
        }

        setTodoList((prev) => [
            ...prev,
            {
                text: todoInput.trim(),
                done: false
            }
        ]);

        setTodoInput('');
    };

    const handleToggleTodo = (index) => {

        setTodoList((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        done: !item.done
                    }
                    : item
            )
        );
    };

    const handleRemoveTodo = (index) => {

        const itemToTrash =
            todoList[index];

        setTrashList((prev) => [
            ...prev,
            itemToTrash
        ]);

        setTodoList((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        );
    };

    const handleRestoreTodo = (index) => {

        const item =
            trashList[index];

        setTodoList((prev) => [
            ...prev,
            item
        ]);

        setTrashList((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        );
    };

    const handlePermanentDelete = (index) => {

        setTrashList((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        );
    };

    // --------------------------------------------------------
    // Files
    // --------------------------------------------------------

    const handleFileChange = (e) => {

        const files =
            Array.from(e.target.files);

        setSelectedFiles((prev) => [
            ...prev,
            ...files
        ]);

        e.target.value = '';
    };

    const handleRemoveFile = (index) => {

        setSelectedFiles((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        );
    };


    // --------------------------------------------------------
    // Upload one file using a presigned S3 URL
    // --------------------------------------------------------

    const uploadFileToS3 = async (file, noteId, userId) => {

        // 1. Ask backend for presigned URL
        const presignedResponse = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/v1/note/${noteId}/document`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'USER_ID': userId
                },

                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream'
                })
            }
        );

        if (!presignedResponse.ok) {

            const errorText =
                await presignedResponse.text();

            throw new Error(
                `Failed to generate presigned URL for ${file.name}: ${errorText}`
            );
        }

        const presignedData =
            await presignedResponse.json();

        console.log(
            'Presigned URL Response:',
            presignedData
        );

        const presignedUrl = presignedData.data;

        if (!presignedUrl) {
            throw new Error(
                `Presigned URL missing for ${file.name}`
            );
        }

        // 2. Upload the file directly from browser to S3
        const uploadResponse = await fetch(
            presignedUrl,
            {
                method: 'PUT',

                headers: {
                    'Content-Type':
                        file.type ||
                        'application/octet-stream'
                },

                body: file
            }
        );

        if (!uploadResponse.ok) {
            throw new Error(
                `S3 upload failed for ${file.name}`
            );
        }

        console.log(
            `Uploaded successfully: ${file.name}`
        );

        return presignedData;
    };

    // --------------------------------------------------------
    // Submit API
    // Flow:
    // 1. Save Note
    // 2. Get Note ID
    // 3. Get Presigned URL
    // 4. Upload selected files to S3
    // --------------------------------------------------------

    const handleSubmit = async (e) => {

        e.preventDefault();

        setIsSubmitting(true);

        // Convert tags STRING -> ARRAY only here
        const tagsArray =
            formData.tags.trim()
                ? formData.tags
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean)
                : [];

        const payload = {

            ...formData,

            category:
                selectedCategory,

            subCategory:
                selectedSubCategory,

            tags:
                tagsArray,

            dueDateTime:
                formData.dueDateTime || null,

            estimatedTime:
                formData.estimatedTime
                    ? Number(formData.estimatedTime)
                    : null,

            todos:
                todoList,

            deletedTodos:
                trashList
        };

        console.log(
            'Daily Note Payload:',
            payload
        );

        const userId =
            localStorage.getItem('userId')
            || '12345';

        try {

            // ------------------------------------------------
            // STEP 1: Save Note
            // ------------------------------------------------

            const response =
                await fetch(
                    'http://localhost:9091/api/v1/daily-note',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',

                            'USER_ID':
                                userId
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    'Backend Error:',
                    errorText
                );

                throw new Error(
                    `HTTP ${response.status}: ${errorText}`
                );
            }

            const data =
                await response.json();

            console.log(
                'Created Note:',
                data
            );

            // ------------------------------------------------
            // STEP 2: Get noteId returned by backend
            // ------------------------------------------------

            const noteId =
                data.noteId ||
                data.id ||
                data._id ||
                data?.data?.noteId ||
                data?.data?.id ||
                data?.data?._id;

            if (!noteId) {

                console.error(
                    'Create Note Response:',
                    data
                );

                throw new Error(
                    'Note saved, but noteId was not returned by backend.'
                );
            }

            console.log(
                'Created Note ID:',
                noteId
            );

            // ------------------------------------------------
            // STEP 3 + 4:
            // Get presigned URL and upload each selected file
            // ------------------------------------------------

            if (selectedFiles.length > 0) {

                for (const file of selectedFiles) {

                    console.log(
                        `Uploading ${file.name}...`
                    );

                    await uploadFileToS3(
                        file,
                        noteId,
                        userId
                    );
                }
            }

            // ------------------------------------------------
            // Final success
            // ------------------------------------------------

            alert(
                selectedFiles.length > 0
                    ? `Note "${formData.title}" created and ${selectedFiles.length} file(s) uploaded successfully!`
                    : `Note "${formData.title}" created successfully!`
            );

            // Optional:
            // clear selected files after successful upload
            setSelectedFiles([]);

        } catch (error) {

            console.error(
                'Failed to create note / upload files:',
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : 'Failed to save note or upload files.'
            );

        } finally {

            setIsSubmitting(false);
        }
    };


    return (

        <div
            className="container py-4"
            style={{
                maxWidth: '820px'
            }}
        >

            <div className="card shadow border-0 rounded-3 overflow-hidden border-top border-4 border-primary">

                {/* Header */}

                <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">

                    <div>

                        <h5 className="mb-0 fw-bold text-dark">
                            Create New Note
                        </h5>

                        <small className="text-muted">
                            Detailed task, project and meeting notes
                        </small>

                    </div>

                    <div className="d-flex gap-2">

                        <div className="form-check form-switch">

                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="isConfidential"
                                name="isConfidential"
                                checked={
                                    formData.isConfidential
                                }
                                onChange={
                                    handleInputChange
                                }
                            />

                            <label
                                className="form-check-label"
                                htmlFor="isConfidential"
                            >
                                Confidential
                            </label>

                        </div>

                        <div className="form-check form-switch">

                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="isPinned"
                                name="isPinned"
                                checked={
                                    formData.isPinned
                                }
                                onChange={
                                    handleInputChange
                                }
                            />

                            <label
                                className="form-check-label"
                                htmlFor="isPinned"
                            >
                                📌 Pin
                            </label>

                        </div>

                    </div>

                </div>

                <div className="card-body p-4">

                    <form onSubmit={handleSubmit}>

                        {/* Title */}

                        <div className="mb-3">

                            <label className="form-label fw-semibold">

                                Title

                                <span className="text-danger">
                                    *
                                </span>

                            </label>

                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Enter note title"
                            />

                        </div>

                        {/* Priority */}

                        <div className="mb-3">

                            <label className="form-label">
                                Priority
                            </label>

                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                className="form-select"
                            >

                                <option value="Low">
                                    Low
                                </option>

                                <option value="Medium">
                                    Medium
                                </option>

                                <option value="High">
                                    High
                                </option>

                            </select>

                        </div>

                        {/* Category */}

                        <div className="row g-2 mb-3">

                            <div className="col-md-6">

                                <label className="form-label">
                                    Category
                                </label>

                                {!isCreatingCat ? (

                                    <select
                                        value={selectedCategory}
                                        onChange={handleCategoryChange}
                                        className="form-select"
                                    >

                                        {Object.keys(categoryTree)
                                            .map(category => (

                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </option>

                                            ))}

                                        <option value="__add_new_cat__">
                                            + Add Category
                                        </option>

                                    </select>

                                ) : (

                                    <div className="input-group">

                                        <input
                                            type="text"
                                            value={newCatInput}
                                            onChange={(e) =>
                                                setNewCatInput(
                                                    e.target.value
                                                )
                                            }
                                            className="form-control"
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleAddCategory}
                                        >
                                            Add
                                        </button>

                                    </div>

                                )}

                            </div>

                            <div className="col-md-6">

                                <label className="form-label">
                                    Sub Category
                                </label>

                                {!isCreatingSubCat ? (

                                    <select
                                        value={selectedSubCategory}
                                        onChange={handleSubCategoryChange}
                                        className="form-select"
                                    >

                                        {(categoryTree[selectedCategory] || [])
                                            .map(sub => (

                                                <option
                                                    key={sub}
                                                    value={sub}
                                                >
                                                    {sub}
                                                </option>

                                            ))}

                                        <option value="__add_new_subcat__">
                                            + Add Sub Category
                                        </option>

                                    </select>

                                ) : (

                                    <div className="input-group">

                                        <input
                                            type="text"
                                            value={newSubCatInput}
                                            onChange={(e) =>
                                                setNewSubCatInput(
                                                    e.target.value
                                                )
                                            }
                                            className="form-control"
                                        />

                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleAddSubCategory}
                                        >
                                            Add
                                        </button>

                                    </div>

                                )}

                            </div>

                        </div>

                        {/* Status / Project / Visibility */}

                        <div className="row g-2 mb-3">

                            <div className="col-md-4">

                                <label className="form-label">
                                    Status
                                </label>

                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >

                                    <option value="Draft">
                                        Draft
                                    </option>

                                    <option value="In Progress">
                                        In Progress
                                    </option>

                                    <option value="Completed">
                                        Completed
                                    </option>

                                </select>

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Project
                                </label>

                                <select
                                    name="project"
                                    value={formData.project}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >

                                    <option value="General">
                                        General
                                    </option>

                                    <option value="Roadmap Q3">
                                        Roadmap Q3
                                    </option>

                                    <option value="Sprint 24">
                                        Sprint 24
                                    </option>

                                </select>

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Visibility
                                </label>

                                <select
                                    name="visibility"
                                    value={formData.visibility}
                                    onChange={handleInputChange}
                                    className="form-select"
                                >

                                    <option value="Private">
                                        Private
                                    </option>

                                    <option value="Team">
                                        Team
                                    </option>

                                    <option value="Public">
                                        Public
                                    </option>

                                </select>

                            </div>

                        </div>

                        {/* Assignee */}

                        <div className="row g-2 mb-3">

                            <div className="col-md-4">

                                <label className="form-label">
                                    Assignee
                                </label>

                                <input
                                    type="text"
                                    name="assignee"
                                    value={formData.assignee}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Location
                                </label>

                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Version
                                </label>

                                <input
                                    type="text"
                                    name="version"
                                    value={formData.version}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />

                            </div>

                        </div>

                        {/* Dates */}

                        <div className="row g-2 mb-3">

                            <div className="col-md-4">

                                <label className="form-label">
                                    Created Date
                                </label>

                                <input
                                    type="datetime-local"
                                    name="createdDateTime"
                                    value={formData.createdDateTime}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Due Date
                                </label>

                                <input
                                    type="datetime-local"
                                    name="dueDateTime"
                                    value={formData.dueDateTime}
                                    onChange={handleInputChange}
                                    className="form-control"
                                />

                            </div>

                            <div className="col-md-4">

                                <label className="form-label">
                                    Estimated Time
                                </label>

                                <input
                                    type="number"
                                    name="estimatedTime"
                                    value={formData.estimatedTime}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    min="0"
                                />

                            </div>

                        </div>

                        {/* Key Takeaways */}

                        <div className="mb-3">

                            <label className="form-label">
                                Key Takeaways
                            </label>

                            <input
                                type="text"
                                name="keyTakeaways"
                                value={formData.keyTakeaways}
                                onChange={handleInputChange}
                                className="form-control"
                            />

                        </div>

                        {/* Description */}

                        <div className="mb-3">

                            <label className="form-label">
                                Description
                            </label>

                            <textarea
                                name="description"
                                rows={4}
                                value={formData.description}
                                onChange={handleInputChange}
                                className="form-control"
                            />

                        </div>

                        {/* Todo */}

                        <div className="mb-3">

                            <label className="form-label">
                                Checklist
                            </label>

                            <div className="input-group mb-2">

                                <input
                                    type="text"
                                    value={todoInput}
                                    onChange={(e) =>
                                        setTodoInput(
                                            e.target.value
                                        )
                                    }
                                    className="form-control"
                                    placeholder="Enter todo"
                                />

                                <button
                                    type="button"
                                    onClick={handleAddTodo}
                                    className="btn btn-outline-primary"
                                >
                                    Add
                                </button>

                            </div>

                            {todoList.map((todo, index) => (

                                <div
                                    key={index}
                                    className="d-flex justify-content-between border p-2"
                                >

                                    <div>

                                        <input
                                            type="checkbox"
                                            checked={todo.done}
                                            onChange={() =>
                                                handleToggleTodo(index)
                                            }
                                        />

                                        <span className="ms-2">
                                            {todo.text}
                                        </span>

                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                            handleRemoveTodo(index)
                                        }
                                    >
                                        Delete
                                    </button>

                                </div>

                            ))}

                        </div>

                        {/* Recycle Bin */}

                        {trashList.length > 0 && (

                            <div className="mb-3">

                                <button
                                    type="button"
                                    className="btn btn-link"
                                    onClick={() =>
                                        setShowTrash(!showTrash)
                                    }
                                >
                                    🗑 Recycle Bin ({trashList.length})
                                </button>

                                {showTrash &&
                                    trashList.map((todo, index) => (

                                        <div
                                            key={index}
                                            className="border p-2"
                                        >

                                            {todo.text}

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-success ms-2"
                                                onClick={() =>
                                                    handleRestoreTodo(index)
                                                }
                                            >
                                                Restore
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger ms-2"
                                                onClick={() =>
                                                    handlePermanentDelete(index)
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    ))}

                            </div>

                        )}

                        {/* TAGS - FIXED */}

                        <div className="mb-3">

                            <label className="form-label">
                                Tags
                            </label>

                            <input
                                type="text"
                                id="tags"
                                name="tags"

                                // IMPORTANT:
                                // input must always contain STRING
                                value={formData.tags}

                                onChange={handleInputChange}

                                className="form-control"

                                placeholder="java, spring boot, kafka"
                            />

                        </div>

                        {/* Reference URL */}

                        <div className="mb-3">

                            <label className="form-label">
                                Reference URL
                            </label>

                            <input
                                type="url"
                                name="referenceUrl"
                                value={formData.referenceUrl}
                                onChange={handleInputChange}
                                className="form-control"
                            />

                        </div>

                        {/* Files */}

                        <div className="mb-3">

                            <label className="form-label">
                                Attach Files
                            </label>

                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="form-control"
                            />

                        </div>

                        {selectedFiles.map((file, index) => (

                            <div
                                key={`${file.name}-${index}`}
                                className="d-flex justify-content-between border p-2 mb-1"
                            >

                                <span>
                                    📄 {file.name}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRemoveFile(index)
                                    }
                                    className="btn btn-sm btn-danger"
                                >
                                    Remove
                                </button>

                            </div>

                        ))}

                        {/* Submit */}

                        <div className="d-flex justify-content-end mt-4">

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary"
                            >

                                {isSubmitting
                                    ? 'Saving...'
                                    : 'Save Note'
                                }

                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default DailyNoteForm;