'use client';

export default function DebugPanel() {
  return (
    <details style={{ padding: 8, border: '1px solid #eee', borderRadius: 8, marginBottom: 16 }}>
      <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Debug Info</summary>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>
        {JSON.stringify({
          hasWindow: typeof window !== 'undefined',
          hasShowDirectoryPicker: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          time: new Date().toISOString(),
        }, null, 2)}
      </pre>
    </details>
  );
}