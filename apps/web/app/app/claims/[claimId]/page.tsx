import { Brand } from "../../../../components/brand";
import { ProofTools } from "../../../../components/proof-tools";
import Link from "next/link";
import { getClaim } from "../../../../lib/store";
import { explorerUrlForChain } from "../../../../lib/xlayer";

export default async function ClaimResultPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const claim = await getClaim(claimId);
  if (!claim?.result) {
    return <main className="shell workspace"><nav className="nav"><Brand /></nav><div className="card form-card"><div className="eyebrow">Verification unavailable</div><h1>{claimId}</h1><p>No completed verification exists for this proof ID yet.</p><Link className="button" href="/app/claims/new">Start a verification</Link></div></main>;
  }
  const result = claim.result;
  const attestation = "attestation" in claim ? claim.attestation : null;
  return <main className="shell workspace">
    <nav className="nav"><Brand /><Link href="/app" className="nav-links">Workspace</Link></nav>
    <div className="workspace-head">
      <div><div className="eyebrow">Verification record</div><h1>{result.verdict}</h1><p>{claim.claim}</p></div>
      <span className="status-pill">{result.confidence}% confidence</span>
    </div>
    <div className="section-grid">
      <div className="card mini-card"><div className="eyebrow">Decision checks</div><h3>{result.checks.filter((check) => check.status === "PASS").length} passed</h3><p>{result.checks.filter((check) => check.status === "FAIL").length} failed - {result.checks.filter((check) => check.status === "REVIEW").length} need review</p></div>
      <div className="card mini-card"><div className="eyebrow">X Layer testnet</div><h3>{attestation ? "Anchored onchain" : "Anchor unavailable"}</h3><p>{attestation?.transactionHash ? <a href={explorerUrlForChain(attestation.chainId) + "/tx/" + attestation.transactionHash} target="_blank" rel="noreferrer">View transaction</a> : "The verifier could not complete an onchain anchor."}</p></div>
    </div>
    <div className="card form-card">
      <div className="metric"><span>Proof ID</span><strong>{claimId}</strong></div>
      <div className="metric"><span>Evidence hash</span><strong>{result.evidenceHash}</strong></div>
      <div className="metric"><span>Result hash</span><strong>{result.resultHash}</strong></div>
      <div className="metric"><span>Model</span><strong>{result.modelVersion}</strong></div>
      <div className="metric"><span>Policy</span><strong>{result.policyId} / {result.policyVersion}</strong></div>
      <ProofTools claimId={claimId} claim={claim.claim} verdict={result.verdict} confidence={result.confidence} evidenceHash={result.evidenceHash} resultHash={result.resultHash} policy={result.policyId + " / " + result.policyVersion} model={result.modelVersion} transactionHash={attestation?.transactionHash} />
      <div className="actions"><Link className="button primary" href={"/proof/" + claimId}>Open public proof</Link><Link className="button" href="/app/claims/new">Verify another</Link></div>
    </div>
  </main>;
}
