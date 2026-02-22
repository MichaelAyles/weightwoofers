interface LandingPageProps {
  onSignUp: () => void;
  onLogIn: () => void;
}

export function LandingPage({ onSignUp, onLogIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-surface-dim flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-text mb-2">WeightWoofers</h1>
        <p className="text-text-muted mb-8">
          AI-powered pet food tracker. Log meals in natural language, track calories, and keep your pet healthy.
        </p>
        <div className="space-y-3">
          <button
            onClick={onSignUp}
            className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Sign Up
          </button>
          <button
            onClick={onLogIn}
            className="w-full bg-surface text-text font-medium py-3 rounded-lg border border-border hover:bg-surface-dim transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
