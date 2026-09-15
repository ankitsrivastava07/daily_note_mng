import { useState } from "react";
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

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const userId = localStorage.getItem("userId") || "ankit0397";

    const handleChange = (e) => {
        const { name, value } = e.target;

        setTask({
            ...task,
            [name]: value
        });

        // Remove old validation message when user starts typing
        setMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Title validation
        if (!task.name.trim()) {
            setMessage("Task title is required");
            return;
        }

        // Due date validation
        if (!task.dueDate) {
            setMessage("Due date is required");
            return;
        }

        // Due time validation
        if (!task.dueTime) {
            setMessage("Due time is required");
            return;
        }

        if(!task.priority) {
            setMessage("Priority is required");
            return;
        }

        if(!task.status) {  
            setMessage("Status is required");
            return;
        }

        if(!task.content) {
            setMessage("Description is required");
            return;
        }

        try {

            setLoading(true);
            setMessage("");

            const requestBody = {
                ...task,
                userId: userId
            };

            console.log("Create Task Request:", requestBody);

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/user/${userId}/task`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "userId": userId
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create task");
            }

            setMessage("Task created successfully");

            // Reset form
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

        } catch (error) {

            console.error("Create Task Error:", error);

            setMessage("Unable to create task");

        } finally {

            setLoading(false);
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

                    {/* Task Title */}
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
                        />

                    </div>


                    {/* Description */}
                    <div className="form-group">

                        <label>Description</label>

                        <textarea type="text"
                            name="content"
                            placeholder="Enter task description"
                            rows="5"
                            value={task.content}
                            onChange={handleChange}
                        />

                    </div>


                    {/* Priority + Status */}
                    <div className="form-row">

                        <div className="form-group">

                            <label>Priority</label>

                            <select
                                name="priority"
                                value={task.priority}
                                onChange={handleChange}
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

                            <label>Status</label>

                            <select
                                name="status"
                                value={task.status}
                                onChange={handleChange}
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


                    {/* Due Date + Due Time */}
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
                            />

                        </div>

                    </div>


                    {/* Create Button */}
                    <button
                        type="submit"
                        className="create-task-button"
                        disabled={loading}
                    >
                        {loading ? "Creating..." : "Create Task"}
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