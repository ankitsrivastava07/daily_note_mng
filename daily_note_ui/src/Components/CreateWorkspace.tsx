import { useState, useEffect } from 'react';

// ==========================================
// 1. CREATE WORKWORKSPACE COMPONENT
// ==========================================
function CreateWorkspace({ onWorkspaceCreated }) {
    const [name, setName] = useState('');
    const [accessType, setAccessType] = useState('PRIVATE');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const userId = localStorage.getItem('userId') || 'ankit0397';
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091';

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Workspace name cannot be empty.');
            return;
        }

        const requestBody = {
            name: trimmedName,
            desc: '',
            accessType: accessType,
            createdBy: userId
        };

        try {
            setLoading(true);
            setMessage('');
            setError('');

            const response = await fetch(`${API_BASE_URL}/api/v1/work-space`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    userId: userId
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (!response.ok) {
                console.log('Error:', result);

                if (response.status === 409) {
                    setError(result.message || 'Workspace already exists.');
                    return;
                }

                throw new Error(
                    result.message || 'Failed to create workspace'
                );
            }

            // Success
            setMessage(result.message || 'Workspace created successfully!');

            const data = await response.json();
            setMessage('Workspace created successfully!');
            setName('');
            setAccessType('PRIVATE');

            if (onWorkspaceCreated) {
                onWorkspaceCreated(data.data || data);
            }
        } catch (err) {
            console.error('Error creating workspace:', err);
            setError('Failed to create workspace. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 p-4 mb-4">
            <h5 className="fw-bold mb-3">Create Workspace</h5>
            <form onSubmit={handleSubmit}>
                <div className="row g-3">
                    <div className="col-md-8">
                        <label htmlFor="workspaceName" className="form-label fw-semibold small">
                            Workspace Name <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            id="workspaceName"
                            className="form-control"
                            placeholder="e.g. Daily Notes & Architecture"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="col-md-4">
                        <label htmlFor="accessType" className="form-label fw-semibold small">
                            Access Type
                        </label>
                        <select
                            id="accessType"
                            className="form-select"
                            value={accessType}
                            onChange={(e) => setAccessType(e.target.value)}
                            disabled={loading}
                        >
                            <option value="PRIVATE">PRIVATE</option>
                            <option value="PUBLIC">PUBLIC</option>
                            <option value="TEAM">TEAM</option>
                        </select>
                    </div>
                </div>

                {message && <div className="alert alert-success py-2 small mt-3 mb-0" role="alert">{message}</div>}
                {error && <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>}

                <div className="d-flex justify-content-end mt-3">
                    <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Workspace'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ==========================================
// 2. WORKSPACE LIST COMPONENT
// ==========================================
function WorkspaceList({ refreshTrigger, onSelectWorkspace }) {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userId = localStorage.getItem('userId') || 'ankit0397';
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091';

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/v1/work-space`, {
                    method: 'GET',
                    headers: {
                        'userId': userId
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch workspaces');
                }

                const result = await response.json();
                const workspaceList = result.data || result;
                setWorkspaces(Array.isArray(workspaceList) ? workspaceList : []);
            } catch (err) {
                console.error('Error fetching workspaces:', err);
                setError('Could not load workspaces.');
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspaces();
    }, [userId, API_BASE_URL, refreshTrigger]);

    if (loading) {
        return (
            <div className="text-center my-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger text-center py-2 small" role="alert">{error}</div>;
    }

    if (workspaces.length === 0) {
        return (
            <div className="text-center my-4 text-muted small">
                <p>No workspaces found. Create one above to get started!</p>
            </div>
        );
    }

    return (
        <div>
            <h5 className="fw-bold mb-3">Your Workspaces</h5>
            <div className="row g-3">
                {workspaces.map((ws) => (
                    <div className="col-md-4" key={ws.id}>
                        <div className="card shadow-sm border-0 h-100 p-3">
                            <div className="card-body d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h6 className="fw-bold text-dark mb-0">{ws.name}</h6>
                                        <span className="badge bg-secondary small">{ws.accessType || 'PRIVATE'}</span>
                                    </div>
                                    <p className="text-muted small mb-3">
                                        {ws.desc || 'No description provided.'}
                                    </p>
                                </div>
                                <button
                                    className="btn btn-outline-primary btn-sm mt-auto"
                                    onClick={() => onSelectWorkspace && onSelectWorkspace(ws)}
                                >
                                    Open Workspace
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// 3. MAIN CONTAINER DASHBOARD
// ==========================================
export default function WorkspaceDashboard() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleWorkspaceCreated = () => {
        setRefreshKey(prev => prev + 1); // Triggers WorkspaceList reload
    };

    const handleSelectWorkspace = (workspace) => {
        console.log('Selected Workspace:', workspace);
        // Add navigation logic here, e.g., navigate(`/workspaces/${workspace.id}/nodes`)
    };

    return (
        <div className="container py-4" style={{ maxWidth: '900px' }}>
            <h2 className="mb-4 fw-bold">Workspace Management</h2>
            <CreateWorkspace onWorkspaceCreated={handleWorkspaceCreated} />
            <hr className="my-4" />
            <WorkspaceList refreshTrigger={refreshKey} onSelectWorkspace={handleSelectWorkspace} />
        </div>
    );
}