"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProofLookup() {
  const router = useRouter();
  const [proofId, setProofId] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = proofId.trim();
    if (value) router.push("/app/claims/" + encodeURIComponent(value));
  }

  return (
    <form className="proof-lookup" onSubmit={submit}>
      <label className="label" htmlFor="proof-id">Open an existing proof</label>
      <div className="actions">
        <input
          className="input"
          id="proof-id"
          value={proofId}
          onChange={(event) => setProofId(event.target.value)}
          placeholder="PL-..."
          autoComplete="off"
          required
        />
        <button className="button" type="submit">Open proof</button>
      </div>
      <p className="loading">Use the permanent proof ID. No account or browseable history is required.</p>
    </form>
  );
}
