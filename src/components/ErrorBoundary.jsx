import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h1>Something went wrong.</h1>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '20px', overflow: 'auto' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
