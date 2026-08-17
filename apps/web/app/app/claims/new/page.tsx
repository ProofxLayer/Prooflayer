"use client";

import { Brand } from "../../../../components/brand";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const policyOptions = [
  {
    id: "purchase_completed_v1",
    label: "Purchase completed",
    claim: "This item was purchased from the seller shown in the receipt.",
    notes: "The receipt identifies the item, seller, and transaction.",
  },
  {
    id: "payment_completed_v1",
    label: "Payment or invoice settled",
    claim: "This payment or invoice was completed for the stated amount.",
    notes: "The evidence identifies the transaction and completed payment state.",
  },
  {
    id: "delivery_completed_v1",
    label: "Delivery received",
    claim: "This item was delivered to the intended recipient.",
    notes: "The delivery evidence shows the item and delivery event.",
  },
  {
    id: "service_completed_v1",
    label: "Service completed",
    claim: "The described service was completed by the named provider.",
    notes: "The evidence identifies the service, provider, and completion details.",
  },
  {
    id: "inspection_completed_v1",
    label: "Inspection completed",
    claim: "This subject received the inspection or service described.",
    notes: "The inspection was completed and identifies the subject.",
  },
  {
    id: "work_completed_v1",
    label: "Work or installation completed",
    claim: "The described work was completed for the stated subject.",
    notes: "The evidence identifies the work and completion details.",
  },
  {
    id: "solar_installation_completed_v1",
    label: "Solar installation completed",
    claim: "This solar installation was completed and inspected.",
    notes: "The installation was completed and inspected.",
  },
  {
    id: "expense_incurred_v1",
    label: "Expense incurred",
    claim: "This expense was incurred for the stated item or service.",
    notes: "The receipt identifies the expense, merchant, date, and amount.",
  },
  {
    id: "custom_proof_v1",
    label: "Custom proof",
    claim: "",
    notes: "",
  },
];

export default function NewClaimPage() {
  const router = useRouter();
  const [policyId, setPolicyId] = useState(policyOptions[0].id);
  const [claim, setClaim] = useState(policyOptions[0].claim);
  const [notes, setNotes] = useState(policyOptions[0].notes);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function changePolicy(value: string) {
    const selected = policyOptions.find((policy) => policy.id === value) ?? policyOptions[0];
    setPolicyId(selected.id);
    setClaim(selected.claim);
    setNotes(selected.notes);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const photo = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    const report = (form.elements.namedItem("report") as HTMLInputElement).files?.[0];
    if (!claim.trim()) {
      setError("Describe exactly what you want ProofLayer to verify.");
      return;
    }
    if (!photo && !report) {
      setError("Choose at least one evidence file.");
      return;
    }
    setStatus("Uploading private evidence...");
    const payload = new FormData();
    payload.append("claim", claim.trim());
    payload.append("policyId", policyId);
    payload.append("notes", notes);
    if (photo) payload.append("evidence", photo);
    if (report) payload.append("evidence", report);
    const response = await fetch("/api/claims", { method: "POST", body: payload });
    const created = await response.json();
    if (!response.ok) {
      setError(created.error || "Unable to store evidence.");
      setStatus("");
      return;
    }
    setStatus("Evidence stored. Asking Groq for an auditable decision...");
    const verified = await fetch("/api/claims/" + created.claimId + "/verify", { method: "POST" });
    const result = await verified.json();
    if (!verified.ok) {
      setError(result.error || "Unable to verify claim.");
      setStatus("");
      return;
    }
    router.push("/app/claims/" + created.claimId);
  }

  const selected = policyOptions.find((policy) => policy.id === policyId) ?? policyOptions[0];
  const isCustom = policyId === "custom_proof_v1";

  return <main className="shell workspace">
    <nav className="nav"><Brand /><Link href="/app" className="nav-links">Back to workspace</Link></nav>
    <div className="workspace-head">
      <div>
        <div className="eyebrow">New verification</div>
        <h1>Submit real evidence.</h1>
        <p>Choose what you are proving, then give ProofLayer the evidence that supports that claim.</p>
      </div>
    </div>
    <form className="card form-card" onSubmit={submit}>
      <label className="label" htmlFor="policy">What are you proving?</label>
      <select className="input" id="policy" value={policyId} onChange={(event) => changePolicy(event.target.value)}>
        {policyOptions.map((policy) => <option key={policy.id} value={policy.id}>{policy.label}</option>)}
      </select>
      <label className="label" htmlFor="claim">{isCustom ? "What should be verified?" : "Claim to verify"}</label>
      <input
        className="input"
        id="claim"
        value={claim}
        placeholder={isCustom ? "Example: This laptop was handed over to the buyer on the stated date." : undefined}
        onChange={(event) => setClaim(event.target.value)}
      />
      {isCustom && <p className="loading">Custom proof evaluates your exact claim. Be specific about the subject, event, and facts the evidence should support.</p>}
      <label className="label" htmlFor="photo">Evidence image (optional)</label>
      <input className="input" id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
      <label className="label" htmlFor="report">Supporting evidence (optional)</label>
      <input className="input" id="report" name="report" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,application/json,text/plain" />
      <label className="label" htmlFor="notes">Context notes</label>
      <textarea className="textarea" id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <p className="loading">Selected policy: {selected.label}. Evidence remains private.</p>
      {status && <p className="loading">{status}</p>}
      {error && <p className="error">{error}</p>}
      <div className="actions"><button className="button primary" type="submit">Verify evidence</button><Link className="button" href="/app">Cancel</Link></div>
    </form>
  </main>;
}
