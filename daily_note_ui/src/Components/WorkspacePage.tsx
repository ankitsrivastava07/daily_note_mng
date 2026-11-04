
import { useParams, useNavigate } from 'react-router-dom';

export default function WorkspacePage() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="container py-4">
            <button
                className="btn btn-outline-secondary mb-4"
                onClick={() => navigate('/')}
            >
                ← Back to Workspaces
            </button>

            <h2 className="fw-bold">Workspace Details</h2>

            <p className="text-muted">
                Workspace ID: {workspaceId}
            </p>

            {/* Add workspace-specific notes, tasks, etc. here */}
        </div>
    );
}
