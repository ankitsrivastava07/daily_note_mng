import { useState } from 'react';

function DailyNoteForm() {
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // 1. Hierarchical Category -> Sub-Category Mapping Structure
    const [categoryTree, setCategoryTree] = useState({
        Work: ['Sprint Planning', 'Architecture', '1-on-1 Sync', 'Bug Triage'],
        Personal: ['Fitness', 'Finance', 'Reading List', 'Side Project'],
        'Interview Prep': ['System Design', 'LeetCode / DSA', 'Behavioral & HR', 'Low Level Design (LLD)'],
        Ideas: ['Product Concepts', 'Tech Exploration'],
    });

    const [selectedCategory, setSelectedCategory] = useState('Work');
    const [selectedSubCategory, setSelectedSubCategory] = useState('Sprint Planning');

    // Inline Creation States for Category & Sub-Category
    const [isCreatingCat, setIsCreatingCat] = useState(false);
    const [isCreatingSubCat, setIsCreatingSubCat] = useState(false);
    const [newCatInput, setNewCatInput] = useState('');
    const [newSubCatInput, setNewSubCatInput] = useState('');

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
        isRecurring: false,
        recurringFrequency: 'Weekly',
        colorAccent: '#0d6efd',
        isConfidential: false,
        isPinned: false,
        keyTakeaways: '',
        description: '',
        tags: '',
        referenceUrl: '',
    });

    const [todoList, setTodoList] = useState([]);
    const [todoInput, setTodoInput] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // Category Dropdown Handlers
    const handleCategoryChange = (e) => {
        const val = e.target.value;
        if (val === '__add_new_cat__') {
            setIsCreatingCat(true);
        } else {
            setSelectedCategory(val);
            const subCats = categoryTree[val] || [];
            setSelectedSubCategory(subCats.length > 0 ? subCats[0] : '');
        }
    };

    const handleSubCategoryChange = (e) => {
        const val = e.target.value;
        if (val === '__add_new_subcat__') {
            setIsCreatingSubCat(true);
        } else {
            setSelectedSubCategory(val);
        }
    };

    const handleAddCategory = () => {
        const trimmed = newCatInput.trim();
        if (trimmed) {
            if (!categoryTree[trimmed]) {
                setCategoryTree((prev) => ({ ...prev, [trimmed]: [] }));
            }
            setSelectedCategory(trimmed);
            setSelectedSubCategory('');
            setNewCatInput('');
            setIsCreatingCat(false);
        }
    };

    const handleAddSubCategory = () => {
        const trimmed = newSubCatInput.trim();
        if (trimmed && selectedCategory) {
            setCategoryTree((prev) => ({
                ...prev,
                [selectedCategory]: [...(prev[selectedCategory] || []), trimmed],
            }));
            setSelectedSubCategory(trimmed);
            setNewSubCatInput('');
            setIsCreatingSubCat(false);
        }
    };

    const handleAddTodo = () => {
        if (!todoInput.trim()) return;
        setTodoList((prev) => [...prev, { text: todoInput, done: false }]);
        setTodoInput('');
    };

    const handleToggleTodo = (index) => {
        setTodoList((prev) =>
            prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
        );
    };

    const handleRemoveTodo = (index) => {
        setTodoList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles((prev) => [...prev, ...files]);
        e.target.value = '';
    };

    const handleRemoveFile = (indexToRemove) => {
        setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitted Payload:', {
            ...formData,
            category: selectedCategory,
            subCategory: selectedSubCategory,
            todos: todoList,
            files: selectedFiles,
        });
        alert(`Note Saved! [Category: ${selectedCategory} | Sub Category: ${selectedSubCategory}]`);
    };

    const colorPresets = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#198754', '#20c997'];

    return (
        <div className="container py-4" style={{ maxWidth: '820px' }}>
            <div
                className="card shadow border-0 rounded-3 overflow-hidden"
                style={{ borderTop: `6px solid ${formData.colorAccent}` }}
            >
                {/* Header */}
                <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-0 fw-bold text-dark">Create New Note</h5>
                        <small className="text-muted">Detailed task, project, and meeting notes</small>
                    </div>

                    <div className="d-flex gap-2">
                        <div className="form-check form-switch bg-light border px-3 py-1 rounded-pill">
                            <input
                                className="form-check-input me-1"
                                type="checkbox"
                                id="isConfidential"
                                name="isConfidential"
                                checked={formData.isConfidential}
                                onChange={handleInputChange}
                            />
                            <label className="form-check-label small fw-semibold cursor-pointer text-danger" htmlFor="isConfidential">
                                {formData.isConfidential ? '🔒 Confidential' : 'Confidential'}
                            </label>
                        </div>

                        <div className="form-check form-switch bg-light border px-3 py-1 rounded-pill">
                            <input
                                className="form-check-input me-1"
                                type="checkbox"
                                id="isPinned"
                                name="isPinned"
                                checked={formData.isPinned}
                                onChange={handleInputChange}
                            />
                            <label className="form-check-label small fw-semibold cursor-pointer" htmlFor="isPinned">
                                {formData.isPinned ? '📌 Pinned' : 'Pin'}
                            </label>
                        </div>
                    </div>
                </div>

                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                        {/* Title & Theme Color */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label htmlFor="title" className="form-label fw-semibold mb-0 fs-6">
                                    Title <span className="text-danger">*</span>
                                </label>

                                <div className="d-flex align-items-center gap-1">
                                    <small className="text-muted me-1">Theme Color:</small>
                                    {colorPresets.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, colorAccent: color }))}
                                            className="btn p-0 rounded-circle"
                                            style={{
                                                backgroundColor: color,
                                                width: '18px',
                                                height: '18px',
                                                border: formData.colorAccent === color ? '2px solid #000' : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleInputChange}
                                className="form-control form-control-lg fs-6"
                                placeholder="e.g., Q3 Marketing Roadmap Sync"
                            />
                        </div>

                        {/* Priority Level */}
                        <div className="mb-3">
                            <label htmlFor="priority" className="form-label fw-semibold small mb-1">
                                Priority Level
                            </label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                className="form-select form-select-sm"
                            >
                                <option value="Low">🟢 Low</option>
                                <option value="Medium">🟡 Medium</option>
                                <option value="High">🔴 High</option>
                            </select>
                        </div>

                        {/* Category & Sub Category Side-by-Side Row */}
                        <div className="row g-2 mb-3">
                            {/* Category Dropdown */}
                            <div className="col-sm-3">
                                <label htmlFor="category" className="form-label fw-semibold small mb-1">
                                    Category
                                </label>
                                {!isCreatingCat ? (
                                    <select
                                        id="category"
                                        value={selectedCategory}
                                        onChange={handleCategoryChange}
                                        className="form-select form-select-sm"
                                    >
                                        {Object.keys(categoryTree).map((cat) => (
                                            <option key={cat} value={cat}>
                                                📁 {cat}
                                            </option>
                                        ))}
                                        <option value="__add_new_cat__" className="fw-bold text-primary">
                                            + Add Category...
                                        </option>
                                    </select>
                                ) : (
                                    <div className="input-group input-group-sm">
                                        <input
                                            type="text"
                                            value={newCatInput}
                                            onChange={(e) => setNewCatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                            className="form-control"
                                            placeholder="Category"
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleAddCategory} className="btn btn-primary btn-sm">
                                            ✓
                                        </button>
                                        <button type="button" onClick={() => setIsCreatingCat(false)} className="btn btn-outline-secondary btn-sm">
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Sub Category Dropdown */}
                            <div className="col-sm-3">
                                <label htmlFor="subCategory" className="form-label fw-semibold small mb-1">
                                    Sub Category
                                </label>
                                {!isCreatingSubCat ? (
                                    <select
                                        id="subCategory"
                                        value={selectedSubCategory}
                                        onChange={handleSubCategoryChange}
                                        className="form-select form-select-sm"
                                        disabled={!selectedCategory}
                                    >
                                        {(categoryTree[selectedCategory] || []).map((sub) => (
                                            <option key={sub} value={sub}>
                                                ↳ {sub}
                                            </option>
                                        ))}
                                        <option value="__add_new_subcat__" className="fw-bold text-primary">
                                            + Add Sub Category...
                                        </option>
                                    </select>
                                ) : (
                                    <div className="input-group input-group-sm">
                                        <input
                                            type="text"
                                            value={newSubCatInput}
                                            onChange={(e) => setNewSubCatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubCategory())}
                                            className="form-control"
                                            placeholder="Sub Category"
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleAddSubCategory} className="btn btn-primary btn-sm">
                                            ✓
                                        </button>
                                        <button type="button" onClick={() => setIsCreatingSubCat(false)} className="btn btn-outline-secondary btn-sm">
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="col-sm-2">
                                <label htmlFor="status" className="form-label fw-semibold small mb-1">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="form-select form-select-sm"
                                >
                                    <option value="Draft">📝 Draft</option>
                                    <option value="In Progress">⏳ In Progress</option>
                                    <option value="Completed">✅ Completed</option>
                                </select>
                            </div>

                            {/* Project / Board */}
                            <div className="col-sm-2">
                                <label htmlFor="project" className="form-label fw-semibold small mb-1">
                                    Project / Board
                                </label>
                                <select
                                    id="project"
                                    name="project"
                                    value={formData.project}
                                    onChange={handleInputChange}
                                    className="form-select form-select-sm"
                                >
                                    <option value="General">General</option>
                                    <option value="Roadmap Q3">Roadmap Q3</option>
                                    <option value="Sprint 24">Sprint 24</option>
                                </select>
                            </div>

                            {/* Visibility */}
                            <div className="col-sm-2">
                                <label htmlFor="visibility" className="form-label fw-semibold small mb-1">
                                    Visibility
                                </label>
                                <select
                                    id="visibility"
                                    name="visibility"
                                    value={formData.visibility}
                                    onChange={handleInputChange}
                                    className="form-select form-select-sm"
                                >
                                    <option value="Private">🔒 Private</option>
                                    <option value="Team">👥 Team</option>
                                    <option value="Public">🌐 Public</option>
                                </select>
                            </div>
                        </div>

                        {/* Assignee, Location & Version */}
                        <div className="row g-2 mb-3">
                            <div className="col-sm-5">
                                <label htmlFor="assignee" className="form-label fw-semibold small mb-1">
                                    Assignee / Owner
                                </label>
                                <input
                                    type="text"
                                    id="assignee"
                                    name="assignee"
                                    value={formData.assignee}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div className="col-sm-4">
                                <label htmlFor="location" className="form-label fw-semibold small mb-1">
                                    Location / Venue
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="e.g. Zoom / Conf Room B"
                                />
                            </div>

                            <div className="col-sm-3">
                                <label htmlFor="version" className="form-label fw-semibold small mb-1">
                                    Version
                                </label>
                                <input
                                    type="text"
                                    id="version"
                                    name="version"
                                    value={formData.version}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="v1.0"
                                />
                            </div>
                        </div>

                        {/* Dates & Time */}
                        <div className="row g-2 mb-3">
                            <div className="col-sm-4">
                                <label htmlFor="createdDateTime" className="form-label fw-semibold small mb-1">
                                    Created Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    id="createdDateTime"
                                    name="createdDateTime"
                                    value={formData.createdDateTime}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                />
                            </div>

                            <div className="col-sm-4">
                                <label htmlFor="dueDateTime" className="form-label fw-semibold small mb-1">
                                    Due Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    id="dueDateTime"
                                    name="dueDateTime"
                                    value={formData.dueDateTime}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                />
                            </div>

                            <div className="col-sm-4">
                                <label htmlFor="estimatedTime" className="form-label fw-semibold small mb-1">
                                    Est. Time (mins)
                                </label>
                                <input
                                    type="number"
                                    id="estimatedTime"
                                    name="estimatedTime"
                                    value={formData.estimatedTime}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="e.g. 45"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Reminder Settings */}
                        <div className="row g-2 mb-3 align-items-center">
                            <div className="col-sm-6">
                                <label htmlFor="reminderAlert" className="form-label fw-semibold small mb-1">
                                    Reminder Alert
                                </label>
                                <select
                                    id="reminderAlert"
                                    name="reminderAlert"
                                    value={formData.reminderAlert}
                                    onChange={handleInputChange}
                                    className="form-select form-select-sm"
                                >
                                    <option value="None">None</option>
                                    <option value="15 mins before">15 mins before</option>
                                    <option value="1 hour before">1 hour before</option>
                                    <option value="1 day before">1 day before</option>
                                </select>
                            </div>

                            <div className="col-sm-6">
                                <div className="form-check mt-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="isRecurring"
                                        name="isRecurring"
                                        checked={formData.isRecurring}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label small fw-semibold" htmlFor="isRecurring">
                                        Repeat Note Automatically
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Key Takeaways */}
                        <div className="mb-3">
                            <label htmlFor="keyTakeaways" className="form-label fw-semibold small mb-1">
                                Key Takeaways / Highlights
                            </label>
                            <input
                                type="text"
                                id="keyTakeaways"
                                name="keyTakeaways"
                                value={formData.keyTakeaways}
                                onChange={handleInputChange}
                                className="form-control form-control-sm"
                                placeholder="e.g., Agreed on launch date for Oct 15th"
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-3">
                            <label htmlFor="description" className="form-label fw-semibold small mb-1">
                                Description / Detailed Content
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                value={formData.description}
                                onChange={handleInputChange}
                                className="form-control form-control-sm"
                                placeholder="Type your detailed note body here..."
                            />
                        </div>

                        {/* Action Items / Checklist */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold small mb-1">Checklist / Action Items</label>
                            <div className="input-group input-group-sm mb-2">
                                <input
                                    type="text"
                                    value={todoInput}
                                    onChange={(e) => setTodoInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTodo())}
                                    className="form-control"
                                    placeholder="Add task and press Enter..."
                                />
                                <button type="button" onClick={handleAddTodo} className="btn btn-outline-primary">
                                    + Add Item
                                </button>
                            </div>

                            {todoList.length > 0 && (
                                <ul className="list-group rounded-2 mb-2">
                                    {todoList.map((todo, idx) => (
                                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1 px-3 bg-light">
                                            <div className="form-check m-0">
                                                <input
                                                    type="checkbox"
                                                    checked={todo.done}
                                                    onChange={() => handleToggleTodo(idx)}
                                                    className="form-check-input me-2"
                                                    id={`todo-${idx}`}
                                                />
                                                <label
                                                    htmlFor={`todo-${idx}`}
                                                    className={`form-check-label small ${todo.done ? 'text-decoration-line-through text-muted' : ''}`}
                                                >
                                                    {todo.text}
                                                </label>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveTodo(idx)} className="btn btn-sm text-danger border-0 p-0">
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Tags & Reference URL */}
                        <div className="row g-2 mb-3">
                            <div className="col-sm-6">
                                <label htmlFor="tags" className="form-label fw-semibold small mb-1">
                                    Tags
                                </label>
                                <input
                                    type="text"
                                    id="tags"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="e.g. roadmap, q3, marketing"
                                />
                            </div>

                            <div className="col-sm-6">
                                <label htmlFor="referenceUrl" className="form-label fw-semibold small mb-1">
                                    Reference URL
                                </label>
                                <input
                                    type="url"
                                    id="referenceUrl"
                                    name="referenceUrl"
                                    value={formData.referenceUrl}
                                    onChange={handleInputChange}
                                    className="form-control form-control-sm"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* File Attachments */}
                        <div className="mb-3">
                            <label htmlFor="file-upload" className="form-label fw-semibold small mb-1">
                                Attach Files
                            </label>
                            <input id="file-upload" type="file" multiple onChange={handleFileChange} className="form-control form-control-sm" />
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="mb-3">
                                <span className="small fw-semibold text-muted d-block mb-2">
                                    Selected Files ({selectedFiles.length}):
                                </span>
                                <ul className="list-group">
                                    {selectedFiles.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="list-group-item d-flex justify-content-between align-items-center py-1 px-3 bg-light">
                                            <span className="text-truncate small" style={{ maxWidth: '350px' }}>
                                                📄 {file.name} <small className="text-muted">({(file.size / 1024).toFixed(1)} KB)</small>
                                            </span>
                                            <button type="button" onClick={() => handleRemoveFile(index)} className="btn btn-sm btn-outline-danger border-0 px-1 py-0">
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <button type="button" className="btn btn-sm btn-outline-secondary px-3">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-sm btn-primary px-4 fw-semibold">
                                Save Note
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default DailyNoteForm;