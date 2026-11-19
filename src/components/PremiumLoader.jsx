export function LoadingOverlay({ show, label = "Processing...", fullscreen = false }) {
  if (!show) return null;

  return (
    <div
      className={`myhosh-loader-overlay ${fullscreen ? "myhosh-loader-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="myhosh-loader-card">
        <div className="myhosh-ring-spinner" aria-hidden="true">
          <span className="myhosh-ring-inner"></span>
        </div>
        <p className="myhosh-loader-label">{label}</p>
      </div>
    </div>
  );
}
