interface LandingPageProps {
  onSignUp: () => void;
  onLogIn: () => void;
}

const features = [
  {
    title: 'Natural Language Logging',
    description: 'Just type "1 scoop of kibble" — our AI understands what you mean.',
  },
  {
    title: 'Smart Calorie Tracking',
    description: 'Science-based NRC formulas calculate your pet\'s ideal daily intake.',
  },
  {
    title: 'Learns As You Go',
    description: 'The more you log, the smarter it gets. Nicknames, portions, brands — all remembered.',
  },
];

export function LandingPage({ onSignUp, onLogIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-orange-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-bold text-text text-lg">WeightWoofers</span>
        <button
          onClick={onLogIn}
          className="text-sm font-medium text-text-muted hover:text-text transition-colors"
        >
          Log In
        </button>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-16 flex flex-col items-center text-center">
        <img
          src="/logo.jpg"
          alt="WeightWoofers logo — a happy corgi on a scale"
          className="w-56 h-56 object-contain rounded-full shadow-lg mb-8"
        />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text leading-tight mb-4">
          Keep your pet at a <span className="text-primary">healthy weight</span>
        </h1>
        <p className="text-lg text-text-muted max-w-xl mb-8">
          AI-powered food tracking that understands plain English. Log meals in seconds, get science-backed calorie budgets, and watch your pet thrive.
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={onSignUp}
            className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors shadow-md"
          >
            Get Started
          </button>
          <button
            onClick={onLogIn}
            className="flex-1 bg-white text-text font-semibold py-3 rounded-xl border border-border hover:bg-surface-dim transition-colors shadow-sm"
          >
            Log In
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-sm border border-white/60"
            >
              <h3 className="font-bold text-text mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white/60 backdrop-blur border-t border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-text mb-10">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Add your pet', desc: 'Enter breed, weight, and activity level. We calculate their ideal daily calories.' },
              { step: '2', title: 'Log meals naturally', desc: 'Type something like "half a can of tuna feast" — no menus, no dropdowns.' },
              { step: '3', title: 'Stay on track', desc: 'See daily totals at a glance. We\'ll ask follow-ups to fill in any gaps.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-lg mb-3 shadow">
                  {s.step}
                </div>
                <h3 className="font-bold text-text mb-1">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-text mb-3">Ready to start tracking?</h2>
        <p className="text-text-muted mb-6">Free to use. Takes 30 seconds to set up.</p>
        <button
          onClick={onSignUp}
          className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary-dark transition-colors shadow-md"
        >
          Create Your Account
        </button>
      </section>

      <footer className="text-center text-xs text-text-muted py-6 border-t border-border/30">
        WeightWoofers &middot; Pet Food Tracking
      </footer>
    </div>
  );
}
