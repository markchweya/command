export default function DocsPage() {
  return (
    <div style={{ display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', height: '100vh', overflow: 'hidden' }}>
      <aside style={{
        width: 260,
        padding: '40px 20px',
        borderRight: '1px solid #eee',
        height: '100vh',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start'
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 20 }}>Documentation</h2>
        <NavItem href="#overview" label="Overview" />
        <NavItem href="#providers" label="Providers" />
        <NavItem href="#installation" label="Installation" />
        <NavItem href="#usage" label="Usage" />
        <NavItem href="#security" label="Security" />
        <NavItem href="#architecture" label="Architecture" />
        <NavItem href="#faq" label="FAQ" />
      </aside>

      <main style={{ padding: '60px', maxWidth: 900, height: '100vh', overflowY: 'auto' }}>
        <Section id="overview" title="Overview">
          <p>
            Command is a universal local AI bridge that connects Large Language Models
            (LLMs) to your development workspace. It enables AI systems to safely
            read, modify, and patch your project files without copy‑paste workflows.
          </p>
          <p>
            Command does not ship with its own model. It connects your chosen
            provider to your local project using a controlled execution layer.
          </p>
        </Section>

        <Section id="providers" title="Supported Providers">
          <p>Use the <code>--provider</code> flag to select your LLM:</p>
          <Code>command connect --provider openai</Code>
          <Code>command connect --provider claude</Code>
          <Code>command connect --provider ollama</Code>
          <Code>command connect --provider grok</Code>
          <Code>command connect --provider deepseek</Code>
          <p><strong>Default:</strong> openai</p>
        </Section>

        <Section id="installation" title="Installation">
          <ul>
            <li>Node.js 18+</li>
            <li>npm</li>
          </ul>
          <Code>npm install -g command-connect</Code>
        </Section>

        <Section id="usage" title="Usage Workflow">
          <ol>
            <li>Navigate into your project folder</li>
            <li>Run <code>command connect --provider &lt;provider&gt;</code></li>
            <li>Provide your API key (if required)</li>
            <li>Start interacting with your code using natural language</li>
          </ol>
          <p>Example prompt:</p>
          <Code>Refactor all API routes to use async/await.</Code>
        </Section>

        <Section id="security" title="Security Model">
          <ul>
            <li>All file operations execute locally</li>
            <li>No repository upload occurs</li>
            <li>Provider API keys remain on your machine</li>
            <li>Session ends when CLI stops</li>
          </ul>
          <p>
            Command is designed as a single‑developer tool. OAuth is optional
            because it is not a multi‑user hosted platform.
          </p>
        </Section>

        <Section id="architecture" title="Architecture">
          <p>Command consists of:</p>
          <ul>
            <li>CLI Interface</li>
            <li>Provider Adapter Layer</li>
            <li>Local File Execution Engine</li>
          </ul>
          <p>
            The provider adapter translates model tool calls into structured
            file operations handled by the local execution engine.
          </p>
        </Section>

        <Section id="faq" title="Frequently Asked Questions">
          <h3>Is my code public?</h3>
          <p>No. Everything runs locally.</p>

          <h3>Can I switch providers?</h3>
          <p>Yes. Restart with a different <code>--provider</code>.</p>

          <h3>Does -g bypass security?</h3>
          <p>No. It only installs the CLI globally.</p>
        </Section>

        <div style={{ marginTop: 80, fontSize: 13, color: '#777' }}>
          Command • Version 1.0.2 • Contact: chweyahub@gmail.com
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <a href={href} style={{ color: '#444', textDecoration: 'none', fontSize: 14 }}>
        {label}
      </a>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 60 }}>
      <h2 style={{ fontSize: 24, marginBottom: 20 }}>{title}</h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background: '#f4f4f4',
      padding: 16,
      borderRadius: 8,
      overflowX: 'auto',
      marginTop: 12
    }}>
      <code>{children}</code>
    </pre>
  )
}
