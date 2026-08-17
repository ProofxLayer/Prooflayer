import { Brand } from "../../../components/brand";
import { ProofTools } from "../../../components/proof-tools";
import Link from "next/link";
import { getClaim } from "../../../lib/store";
import { explorerUrlForChain } from "../../../lib/xlayer";

export default async function PublicProofPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const claim = await getClaim(claimId);
  if (!claim?.result) {
    return <main className="shell workspace"><nav className="nav"><Brand /><span className="status-pill">Public proof</span></nav><div className="card form-card"><div className="eyebrow">Proof not available</div><h1>{claimId}</h1><p>The proof has not produced a verification result yet.</p><Link className="button" href="/">Return home</Link></div></main>;
  }
  const result = claim.result;
  const attestation = (claim as typeof claim & { attestation?: { chainId: number; contractAddress: string; transactionHash: string | null } }).attestation;
  return <main className="shell workspace">
    <nav className="nav"><Brand /><span className="status-pill">Public proof</span></nav>
    <div className="workspace-head"><div><div className="eyebrow">Portable attestation</div><h1>{result.verdict}</h1><p>Proof ID {claimId} - ProofLayer publishes hashes and decision metadata. Source evidence stays private.</p></div></div>
    <div className="section-grid">
      <div className="card mini-card"><div className="eyebrow">Decision</div><h3>{result.confidence}% confidence</h3><p>{result.checks.filter((check) => check.status === "PASS").length} checks passed. {result.checks.filter((check) => check.status === "FAIL").length} checks failed.</p></div>
      <div className="card mini-card"><div className="eyebrow">X Layer</div><h3>{attestation ? "Anchored onchain" : "Anchor pending"}</h3><p>{attestation?.transactionHash ? <a href={explorerUrlForChain(attestation.chainId) + "/tx/" + attestation.transactionHash} target="_blank" rel="noreferrer">{attestation.transactionHash}</a> : "The result has not been anchored yet."}</p></div>
    </div>
    <div className="card form-card">
      <div className="metric"><span>Proof ID</span><strong>{claimId}</strong></div>
      <div className="metric"><span>Claim</span><strong>{claim.claim}</strong></div>
      <div className="metric"><span>Evidence hash</span><strong>{result.evidenceHash}</strong></div>
      <div className="metric"><span>Result hash</span><strong>{result.resultHash}</strong></div>
      <div className="metric"><span>Policy</span><strong>{result.policyId} / {result.policyVersion}</strong></div>
      <ProofTools claimId={claimId} claim={claim.claim} verdict={result.verdict} confidence={result.confidence} evidenceHash={result.evidenceHash} resultHash={result.resultHash} policy={result.policyId + " / " + result.policyVersion} model={result.modelVersion} transactionHash={attestation?.transactionHash} />
    </div>
    <Link className="button" href={"/app/claims/" + claimId}>Open verification record</Link>
  </main>;
}
