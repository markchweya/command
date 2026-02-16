export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      textAlign: 'center',
      padding: '0 24px'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '-1px' }}>
        Command
      </h1>

      <p style={{ maxWidth: 700, fontSize: '1.1rem', lineHeight: 1.6, color: '#444' }}>
        Connect ChatGPT to your local development workspace.
        Read files. Apply patches. Build faster — without copy and paste.
      </p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
        <a
          href="/docs"
          style={{
            border: '1px solid #111',
            padding: '10px 18px',
            borderRadius: 8,
            textDecoration: 'none',
            color: '#111'
          }}
        >
          Documentation
        </a>

        <a
          href="mailto:chweyahub@gmail.com"
          style={{
            border: '1px solid #111',
            padding: '10px 18px',
            borderRadius: 8,
            textDecoration: 'none',
            color: '#111'
          }}
        >
          Contact
        </a>
      </div>

      <footer style={{ position: 'absolute', bottom: 24, fontSize: 12, color: '#888' }}>
        Version 1.0.2 • Free • Built for Developers
      </footer>
    </main>
  )
}
