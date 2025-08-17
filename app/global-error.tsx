'use client';

export default function GlobalError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void;
}) {
  console.error('Global Error:', error);
  
  return (
    <html>
      <body>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Global error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
            {String(error?.stack ?? error?.message)}
          </pre>
          <button 
            onClick={reset} 
            style={{ 
              marginTop: 16, 
              padding: '8px 12px', 
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}