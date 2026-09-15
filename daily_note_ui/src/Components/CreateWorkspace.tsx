import { useEffect, useState } from 'react';

function CreateWorkspaceNode({ workspaceId }) {

    const [nodeName, setNodeName] = useState('');
    const [nodeType, setNodeType] = useState('FOLDER');
    const [content, setContent] = useState('');
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [parentId, setParentId] = useState('ROOT');

    const userId = localStorage.getItem('userId') || 'ankit0397';

    // ============================
    // GET ALL NODES
    // ============================
    const getAllNodes = async () => {

        try {

            const response = await fetch(
                `http://localhost:9091/api/v1/workspaces/${workspaceId}/nodes?parentId=${parentId}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch workspace nodes');
            }

            const data = await response.json();

            console.log('Workspace Node Response:', data);

            setNodes(data.data || data || []);

        } catch (error) {
            console.error('Error fetching workspace nodes:', error);
        }
    };


    // Load nodes
    useEffect(() => {

        if (workspaceId) {
            getAllNodes();
        }

    }, [workspaceId, parentId]);


    // ============================
    // CREATE NODE
    // ============================
    const handleSubmit = async (e) => {

        e.preventDefault();

        const trimmed = nodeName.trim();

        if (!trimmed) {
            return;
        }

        const request = {
            parentId: parentId,
            name: trimmed,
            type: nodeType,
            content: nodeType === 'FILE' ? content : null
        };

        try {

            setLoading(true);
            setMessage('');

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/api/v1/workspaces/${workspaceId}/nodes`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to create workspace node');
            }

            const data = await response.json();

            console.log('Workspace Node Created:', data);

            setMessage(
                nodeType === 'FOLDER'
                    ? 'Folder created successfully'
                    : 'File created successfully'
            );

            setNodeName('');
            setContent('');
            setNodeType('FOLDER');

            await getAllNodes();

        } catch (error) {

            console.error(
                'Error creating workspace node:',
                error
            );

            setMessage('Failed to create');

        } finally {

            setLoading(false);
        }
    };


    // ============================
    // OPEN FOLDER
    // ============================
    const openFolder = (node) => {

        if (node.type === 'FOLDER') {
            setParentId(node.id);
        }
    };


    // ============================
    // GO ROOT
    // ============================
    const goToRoot = () => {
        setParentId('ROOT');
    };


    return (

        <div style={{ maxWidth: '600px' }}>


            {/* CREATE FOLDER / FILE */}

            <div className="card shadow-sm border-0 p-3 mb-4">

                <h6 className="fw-bold mb-3">
                    Create Folder / File
                </h6>


                <form onSubmit={handleSubmit}>


                    {/* TYPE */}

                    <div className="mb-3">

                        <label
                            htmlFor="nodeType"
                            className="form-label fw-semibold small"
                        >
                            Type
                            <span className="text-danger"> *</span>
                        </label>

                        <select
                            id="nodeType"
                            className="form-select form-select-sm"
                            value={nodeType}
                            onChange={(e) =>
                                setNodeType(e.target.value)
                            }
                            disabled={loading}
                            required
                        >

                            <option value="FOLDER">
                                Folder
                            </option>

                            <option value="FILE">
                                File
                            </option>

                        </select>

                    </div>


                    {/* NAME */}

                    <div className="mb-3">

                        <label
                            htmlFor="nodeName"
                            className="form-label fw-semibold small"
                        >
                            Name
                            <span className="text-danger"> *</span>
                        </label>

                        <input
                            type="text"
                            id="nodeName"
                            className="form-control form-control-sm"
                            placeholder={
                                nodeType === 'FOLDER'
                                    ? 'e.g. Interview Preparation'
                                    : 'e.g. Java Notes'
                            }
                            value={nodeName}
                            onChange={(e) =>
                                setNodeName(e.target.value)
                            }
                            disabled={loading}
                            required
                        />

                    </div>


                    {/* FILE CONTENT */}

                    {nodeType === 'FILE' && (

                        <div className="mb-3">

                            <label
                                htmlFor="content"
                                className="form-label fw-semibold small"
                            >
                                Content
                            </label>

                            <textarea
                                id="content"
                                className="form-control form-control-sm"
                                rows="5"
                                placeholder="Write file content..."
                                value={content}
                                onChange={(e) =>
                                    setContent(e.target.value)
                                }
                                disabled={loading}
                            />

                        </div>

                    )}


                    {message && (

                        <div className="small mb-3">
                            {message}
                        </div>

                    )}


                    <div className="d-flex justify-content-end">

                        <button
                            type="submit"
                            className="btn btn-sm btn-primary px-3"
                            disabled={loading}
                        >

                            {loading
                                ? 'Creating...'
                                : nodeType === 'FOLDER'
                                    ? 'Create Folder'
                                    : 'Create File'}

                        </button>

                    </div>

                </form>

            </div>


            {/* ALL FOLDERS / FILES */}

            <div className="card shadow-sm border-0 p-3">

                <div className="d-flex justify-content-between align-items-center mb-3">

                    <h6 className="fw-bold mb-0">
                        Folders & Files
                    </h6>


                    {parentId !== 'ROOT' && (

                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={goToRoot}
                        >
                            Back
                        </button>

                    )}

                </div>


                {nodes.length === 0 ? (

                    <div className="text-muted small">
                        No folder or file created yet.
                    </div>

                ) : (

                    <div className="list-group">


                        {nodes.map((node) => (

                            <div
                                key={node.id}
                                className="list-group-item d-flex justify-content-between align-items-center"
                            >

                                <div className="d-flex align-items-center">

                                    <div
                                        style={{
                                            fontSize: '22px',
                                            marginRight: '10px'
                                        }}
                                    >

                                        {node.type === 'FOLDER'
                                            ? '📁'
                                            : '📄'}

                                    </div>


                                    <div>

                                        <div className="fw-semibold">
                                            {node.name}
                                        </div>

                                        <small className="text-muted">

                                            {node.type}

                                            {' • '}

                                            {node.id}

                                        </small>

                                    </div>

                                </div>


                                {/* OPEN FOLDER */}

                                {node.type === 'FOLDER' && (

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() =>
                                            openFolder(node)
                                        }
                                    >
                                        Open
                                    </button>

                                )}


                                {/* FILE */}

                                {node.type === 'FILE' && (

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                    >
                                        View
                                    </button>

                                )}

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
}

export default CreateWorkspaceNode;