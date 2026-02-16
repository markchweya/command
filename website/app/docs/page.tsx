import './docs.css'

export default function DocsPage() {
  return (
    <div className="docs">
      <aside className="sidebar">
        <h2>Documentation</h2>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#installation">Installation</a>
          <a href="#connect">Connecting to ChatGPT</a>
          <a href="#usage">Usage</a>
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

        <section id="connect">
          <h2>Connecting to ChatGPT</h2>

          <h3>1. Enable Developer Mode</h3>
          <p>
            Open ChatGPT and go to <strong>Settings → Beta features</strong> and enable
            <strong> Developer Mode</strong> (or GPTs / App creation access if required).
          </p>

          <h3>2. Create a New App</h3>
          <p>
            In ChatGPT, navigate to the GPT / App creation section and create a new app.
          </p>
          <ul>
            <li><strong>App Name:</strong> Command</li>
            <li><strong>Description:</strong> Connects ChatGPT to a local development workspace.</li>
            <li><strong>App URL:</strong> Paste the URL provided by <code>command connect</code></li>
          </ul>

          <h3>3. Run Command Locally</h3>
          <pre><code>command connect</code></pre>
          <p>
            The CLI will start a local bridge and provide you with a URL.
            Paste that URL into the App configuration inside ChatGPT.
          </p>

          <h3>4. Connect from ChatGPT</h3>
          <p>
            After saving your app, open a new ChatGPT conversation and type:
          </p>
          <pre><code>/Command</code></pre>
          <p>
            (Replace <strong>Command</strong> with the exact name of your app if different.)
            This will initiate the connection to your local workspace.
          </p>
        </section>

        <section id="usage">
          <h2>Usage</h2>
          <p>
            Once connected, you can ask ChatGPT to read files, refactor code,
            or apply structured changes to your project.
          </p>
          <p>Example:</p>
          <pre><code>Refactor all API routes to use async/await.</code></pre>
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
            Future versions of Command will support additional AI providers
            and expanded integration capabilities.
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
