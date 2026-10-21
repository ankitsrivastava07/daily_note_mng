
type ServerConnectionModalProps = {
  show: boolean;
  onRetry: () => void;
  retrying: boolean;
};

export default function ServerConnectionModal({
  show,
  onRetry,
  retrying,
}: ServerConnectionModalProps) {
  if (!show) return null;

  return (
    <div className="connection-modal-overlay">
      <div
        className="connection-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="connection-modal-title"
      >
        <h2 id="connection-modal-title">
          !Server Connection Lost
        </h2>

        <p>
          Unable to connect to the server. Please check whether
          your backend is running and try again.
        </p>

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Connecting..." : "Retry Connection"}
        </button>
      </div>
    </div>
  );
}
