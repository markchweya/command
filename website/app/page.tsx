import './home.css'

export default function HomePage() {
  return (
    <main className="home">
      <div className="container">
        <h1 className="title">Command</h1>

        <p className="description">
          Connect ChatGPT to your local development workspace.
          Read files. Apply patches. Build faster — without copy and paste.
        </p>

        <div className="actions">
          <a href="/docs" className="button">
            Documentation
          </a>

          <a href="mailto:chweyahub@gmail.com" className="button secondary">
            Contact
          </a>
        </div>
      </div>

      <footer className="footer">
        Version 1.0.2 • Free • Built for Developers
      </footer>
    </main>
  )
}
