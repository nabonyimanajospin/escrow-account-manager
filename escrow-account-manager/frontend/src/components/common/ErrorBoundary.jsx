import { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-2xl mb-2">⚠️</p>
            <h2 className="text-lg font-extrabold text-slate-900">Something went wrong on this page</h2>
            <p className="text-sm text-slate-500 mt-2">
              The app hit an unexpected error. Try refreshing, or go back to the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary text-sm font-bold px-4 py-2"
              >
                Refresh page
              </button>
              <Link to="/dashboard" className="btn-secondary text-sm font-bold px-4 py-2">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
