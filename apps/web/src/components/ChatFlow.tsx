import type { ChatResponseMessage } from '../lib/types';

interface ChatFlowProps {
  messages: ChatResponseMessage[];
  loading: boolean;
}

export function ChatFlow({ messages, loading }: ChatFlowProps) {
  if (messages.length === 0 && !loading) return null;

  return (
    <div className="mx-4 mt-3 space-y-2 max-w-md mx-auto">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text'
            }`}
          >
            <p>{msg.content}</p>
            {msg.actions && msg.actions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {msg.actions.map((action, j) => (
                  <span
                    key={j}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      action.type === 'logged'
                        ? 'bg-success/15 text-success'
                        : action.type === 'created_food'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-text-muted/15 text-text-muted'
                    }`}
                  >
                    {action.type === 'logged' && action.kcal != null
                      ? `Logged ${Math.round(action.kcal)} kcal`
                      : action.description}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-muted">
            Thinking...
          </div>
        </div>
      )}
    </div>
  );
}
