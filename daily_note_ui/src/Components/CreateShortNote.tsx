import { useState } from "react";

function CreateShortNote() {
    // 1. Initialized categoryId as an empty string to easily check if it's unselected
    const [inputValue, setInputValue] = useState({ title: '', content: '', categoryId: "others", userId: 'ankit0397' });
    const [isSuccess, setIsSuccess] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [apiError, setApiError] = useState();

    // A mapping helper to show the user-friendly label on the dropdown button
    const categoryLabels = {
        '': 'Select Category',
        'general': 'General Interview',
        'interview': 'Interview',
        'qbank': 'Question Bank',
        'facebook': 'FaceBook',
        'instagram': 'Instagram',
        'whatsapp': 'WhatsApp',
        'others': 'Others'
    };

    const handleInputValue = (e) => {
        const { name, value } = e.target;
        setInputValue((prev) => ({
            ...prev,
            [name]: value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Helper to update category selection manually and clear dropdown validation errors
    const handleCategorySelect = (categoryKey) => {
        setInputValue(prev => ({ ...prev, categoryId: categoryKey }));
        if (formErrors.categoryId) {
            setFormErrors(prev => ({ ...prev, categoryId: '' }));
        }
    };

    // 2. Validation logic now monitors categoryId
    const validate = () => {
        let errors = {};
        let isValid = true;

        if (!inputValue.title.trim()) {
            errors.title = 'Title is required';
            isValid = false;
        }

        if (!inputValue.content.trim()) {
            errors.content = 'Content is required';
            isValid = false;
        }

        // Dropdown validation rule: checks if categoryId is still empty
        if (!inputValue.categoryId) {
            errors.categoryId = 'Please select a valid category';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const isValid = validate();
        if (!isValid) {
            setIsSuccess(null);
            return;
        }

        console.log("Form Submitted Successfully!", inputValue);

        setIsSuccess(null);
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/short-note`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                userId: "ankit0397",
            },
            body: JSON.stringify(inputValue),
        })
            .then(async (response) => {
                const data = await response.json();
                console.log("Response Status:", response.status);
                console.log("Response Body:", data);

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
            .then((data) => {
                console.log("Success:", data);
                setIsSuccess(true);
                setApiError("");

                setInputValue({
                    title: "",
                    content: "",
                    categoryId: "others",
                    userId: "ankit0397",
                });
            })
            .catch((error) => {
                console.error("Error:", error);
                // setIsSuccess(false);
                setTimeout(() => setIsSuccess(false), 300);

            });
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                    <label className="d-block mb-1">Category</label>
                    <li className="nav-item dropdown" style={{ listStyleType: 'none' }}>
                        {/* Dynamic label displays selected state text */}
                        <a className="btn btn-secondary btn-sm dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">
                            {categoryLabels[inputValue.categoryId]}
                        </a>
                        <ul className="dropdown-menu">
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('general'); }}>General Interview</a></li>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('interview'); }}>Common Interview Questions</a></li>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('qbank'); }}>Question Bank</a></li>

                            {/* Nested Sub-menus updated to update state seamlessly */}
                            <li className="dropend">
                                <a className="dropdown-item dropdown-toggle" href="#" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">Social Media</a>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('facebook'); }}>FaceBook</a></li>
                                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('instagram'); }}>Instagram</a></li>
                                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('whatsapp'); }}>WhatsApp</a></li>
                                </ul>
                            </li>

                            <li><hr className="dropdown-divider" /></li>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleCategorySelect('others'); }}>Others</a></li>
                        </ul>
                    </li>
                    {/* Error rendering block for category validation failure */}
                    {formErrors.categoryId && (
                        <div style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
                            {formErrors.categoryId}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="exampleFormControlInput1">Note Name</label>
                    <input
                        type="text"
                        name="title"
                        value={inputValue.title}
                        onChange={handleInputValue}
                        className="form-control"
                        id="exampleFormControlInput1"
                        placeholder="Short Note Name"
                    />
                    {isSuccess === false && (
                        <div style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
                            {apiError || "An error occurred while saving the note. Please try again."}
                        </div>
                    )}
                    {formErrors.title && (
                        <div style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
                            {formErrors.title}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="exampleFormControlTextarea1">Description</label>
                    <textarea
                        name="content"
                        value={inputValue.content}
                        className="form-control note-textarea"
                        onChange={handleInputValue}
                        id="exampleFormControlTextarea1"
                        rows={10}
                        placeholder="Description"
                    ></textarea>
                    {formErrors.content && (
                        <div style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
                            {formErrors.content}
                        </div>
                    )}
                </div>

                <button type="submit" className="btn btn-primary mt-2">Submit</button>

                {isSuccess === true && (
                    <div className="alert alert-success mt-3" role="alert">
                        Note saved successfully!
                    </div>
                )}

            </form>
        </>
    );
}

export default CreateShortNote;
