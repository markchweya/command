import './docs.css'

export default function DocsPage() {
  return (
    <div className="docs">
      <aside className="sidebar">
        <h2>Documentation</h2>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#installation">Installation</a>
          <a href="#usage">Usage</a>
          <a href="#command">The Command</a>
          <a href="#security">Security</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#faq">FAQ</a>
        </nav>
      </aside>

      <main className="content">
        <section id="overview">
          <h1>Overview</h1>
          <p>
            Command is a local AI bridge that connects ChatGPT to your development workspace.
            It allows you to interact with your codebase using natural language — without
            copy‑paste workflows.
          </p>
          <p>
            Command runs entirely on your machine. It does not host or train models.
            It connects your local project to ChatGPT through a controlled execution layer.
          </p>
        </section>

        <section id="installation">
          <h2>Installation</h2>
          <ul>
            <li>Node.js 18+</li>
            <li>npm</li>
          </ul>
          <pre><code>npm install -g command-connect</code></pre>
        </section>

        <section id="usage">
          <h2>Usage</h2>
          <p>
            Navigate into your project folder and run:
          </p>
          <pre><code>command connect</code></pre>
          <p>
            You will be prompted for your ChatGPT API key.
            Once connected, you can begin interacting with your project using natural language.
          </p>
          <p>Example:</p>
          <pre><code>Refactor all API routes to use async/await.</code></pre>
        </section>

        <section id="command">
          <h2>The Command</h2>
          <p>
            Currently, Command supports ChatGPT as its AI provider.
          </p>
          <p>
            The primary command is:
          </p>
          <pre><code>command connect</code></pre>
          <p>
            This establishes a secure session between ChatGPT and your local workspace.
          </p>
        </section>

        <section id="security">
          <h2>Security Model</h2>
          <ul>
            <li>All file operations execute locally</li>
            <li>No repository upload occurs</li>
            <li>Your API key remains on your machine</li>
            <li>The session ends when the CLI stops</li>
          </ul>
          <p>
            Command is designed as a developer tool — not a hosted platform.
          </p>
        </section>

        <section id="roadmap">
          <h2>Roadmap</h2>
          <p>
            Future versions of Command will support additional AI providers.
          </p>
          <p>
            Planned integrations include:
          </p>
          <ul>
            <li>Claude</li>
            <li>Local models</li>
            <li>Additional enterprise providers</li>
          </ul>
          <p>
            For now, ChatGPT is the only supported provider.
          </p>
        </section>

        <section id="faq">
          <h2>Frequently Asked Questions</h2>

          <h3>Does Command host models?</h3>
          <p>No. It connects your local project to ChatGPT.</p>

          <h3>Is my code public?</h3>
          <p>No. All execution happens locally.</p>

          <h3>Are multiple providers supported?</h3>
          <p>Not yet. Additional providers are planned for future releases.</p>
        </section>

        <div className="docs-footer">
          Command • Version 1.0.2 • Contact: chweyahub@gmail.com
        </div>
      </main>
    </div>
  )
}
