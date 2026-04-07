import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "#0f0f1a", color: "#e8e8f0", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "16px", padding: "24px", textAlign: "center",
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          <div style={{ fontSize: "48px" }}>X</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Something broke</h2>
          <p style={{ color: "#a0a0b8", fontSize: "14px", maxWidth: "400px" }}>
            The job data format may have changed. Try refreshing.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: "#8B5CF6", color: "#fff", border: "none", borderRadius: "8px",
            padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer"
          }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
