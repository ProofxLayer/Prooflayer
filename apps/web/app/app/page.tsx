import Link from "next/link";
import { Brand } from "../../components/brand";
import { ProofLookup } from "../../components/proof-lookup";

const workflow = [
  ["01", "Private evidence", "Upload the evidence that supports your selected claim. Source files stay private."],
  ["02", "Explainable verdict", "Groq evaluates the claim against the active policy and returns checks, confidence, and limitations."],
  ["03", "X Layer attestation", "The evidence hash, result hash, policy, and verdict are anchored on X Layer Testnet."],
];

export default function WorkspacePage() {
  return (
    <main className="shell workspace">
      <nav className="nav">
        <Brand />
        <div className="nav-links">
          <Link href="/">Back home</Link>
          <span>Operator workspace</span>
        </div>
      </nav>

      <section className="workspace-head">
        <div>
          <div className="eyebrow">ProofLayer workspace / X Layer Testnet</div>
          <h1>Turn a claim into inspectable proof.</h1>
          <p>
            Submit real-world evidence, receive an explainable decision, and publish a portable
            attestation when the verification completes.
          </p>
        </div>
        <Link className="button primary" href="/app/claims/new">
          Verify Proof
        </Link>
      </section>

      <section className="workspace-grid">
        <div className="card form-card">
          <div className="eyebrow">Start here</div>
          <h2>Verify a new claim</h2>
          <p>
            Choose a proof policy, then bring the evidence that supports the same claim. Receipts, delivery records,
            inspection documents, and installation evidence can each be evaluated under their own policy.
          </p>
          <div className="actions">
            <Link className="button primary" href="/app/claims/new">
              Start verification
            </Link>
          </div>
        </div>

        <aside className="card side-card">
          <div className="eyebrow">Live pipeline</div>
          <div className="metric"><span>AI provider</span><strong>Groq</strong></div>
          <div className="metric"><span>Storage</span><strong>Private</strong></div>
          <div className="metric"><span>Network</span><strong>X Layer Testnet</strong></div>
          <ProofLookup />
        </aside>
      </section>

      <section className="section">
        <div className="eyebrow">The proof loop</div>
        <h2>One workspace. Three accountable steps.</h2>
        <div className="section-grid">
          {workflow.map(([number, title, body]) => (
            <article className="card mini-card" key={number}>
              <div className="number">{number}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
