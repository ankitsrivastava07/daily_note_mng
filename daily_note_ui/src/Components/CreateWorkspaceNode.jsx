import { useState } from "react";

function CreateWorkspaceNode({
    workspaceId,
    parentId = "ROOT",
    onCreated
}) {

    const [name, setName] = useState("");
    const [type, setType] = useState("FOLDER");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setMessage("Name is required");
            return;
        }

        const request = {
            parentId: parentId,
            name: name.trim(),
            type: type,
            content: type === "FILE" ? content : null
        };

        try {

            setLoading(true);
            setMessage("");

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/workspaces/${workspaceId}/nodes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(request)
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create");
            }

            setName("");
            setContent("");
            setType("FOLDER");

            setMessage(
                type === "FOLDER"
                    ? "Folder created successfully"
                    : "File created successfully"
            );

            // Tell parent component to refresh list
            if (onCreated) {
                onCreated();
            }

        } catch (error) {

            console.error(error);
            setMessage("Failed to create");

        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="create-workspace-node">

            <h3>Create Folder / File</h3>

            <form onSubmit={handleSubmit}>

                <div>
                    <label>Type *</label>

                    <select
                        value={type}
                        onChange={(e) =>
                            setType(e.target.value)
                        }
                    >
                        <option value="FOLDER">
                            Folder
                        </option>

                        <option value="FILE">
                            File
                        </option>
                    </select>
                </div>


                <div>
                    <label>Name *</label>

                    <input
                        type="text"
                        value={name}
                        placeholder={
                            type === "FOLDER"
                                ? "Folder name"
                                : "File name"
                        }
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        required
                    />
                </div>


                {type === "FILE" && (

                    <div>
                        <label>Content</label>

                        <textarea
                            value={content}
                            placeholder="Write file content..."
                            onChange={(e) =>
                                setContent(e.target.value)
                            }
                            rows="6"
                        />
                    </div>

                )}


                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Creating..."
                        : type === "FOLDER"
                            ? "Create Folder"
                            : "Create File"}
                </button>

            </form>

            {message && (
                <p>{message}</p>
            )}

        </div>
    );
}

export default CreateWorkspaceNode;