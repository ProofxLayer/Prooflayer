"use client";

import { useState } from "react";

type ProofToolsProps = {
  claimId: string;
  claim: string;
  verdict: string;
  confidence: number;
  evidenceHash: string;
  resultHash: string;
  policy: string;
  model: string;
  transactionHash?: string | null;
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] || character);
}

function shortHash(value: string) {
  return value.length > 24 ? value.slice(0, 20) + "..." : value;
}

function proofCardSvg(data: ProofToolsProps) {
  const claim = escapeXml(data.claim.slice(0, 92));
  const transaction = data.transactionHash ? shortHash(data.transactionHash) : "Not anchored";
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1400\" height=\"900\" viewBox=\"0 0 1400 900\">" +
    "<rect width=\"1400\" height=\"900\" fill=\"#050505\"/>" +
    "<rect x=\"44\" y=\"44\" width=\"1312\" height=\"812\" fill=\"none\" stroke=\"#303030\" stroke-width=\"2\"/>" +
    "<text x=\"88\" y=\"112\" fill=\"#c9c9c2\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"22\" font-weight=\"700\" letter-spacing=\"5\">PROOFLAYER / PUBLIC PROOF</text>" +
    "<text x=\"88\" y=\"190\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"24\">PROOF ID</text>" +
    "<text x=\"88\" y=\"236\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"30\">" + escapeXml(data.claimId) + "</text>" +
    "<line x1=\"88\" y1=\"284\" x2=\"1312\" y2=\"284\" stroke=\"#303030\" stroke-width=\"2\"/>" +
    "<text x=\"88\" y=\"360\" fill=\"#999994\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"20\" letter-spacing=\"3\">VERDICT</text>" +
    "<text x=\"88\" y=\"428\" fill=\"#f7f7f5\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"64\" font-weight=\"700\">" + escapeXml(data.verdict) + "</text>" +
    "<text x=\"1040\" y=\"360\" fill=\"#999994\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"20\" letter-spacing=\"3\">CONFIDENCE</text>" +
    "<text x=\"1040\" y=\"428\" fill=\"#f7f7f5\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"64\" font-weight=\"700\">" + data.confidence + "%</text>" +
    "<text x=\"88\" y=\"510\" fill=\"#c9c9c2\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"26\">" + claim + "</text>" +
    "<line x1=\"88\" y1=\"560\" x2=\"1312\" y2=\"560\" stroke=\"#303030\" stroke-width=\"2\"/>" +
    "<text x=\"88\" y=\"620\" fill=\"#999994\" font-family=\"Courier New, monospace\" font-size=\"18\">EVIDENCE HASH</text>" +
    "<text x=\"350\" y=\"620\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"18\">" + escapeXml(shortHash(data.evidenceHash)) + "</text>" +
    "<text x=\"88\" y=\"672\" fill=\"#999994\" font-family=\"Courier New, monospace\" font-size=\"18\">RESULT HASH</text>" +
    "<text x=\"350\" y=\"672\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"18\">" + escapeXml(shortHash(data.resultHash)) + "</text>" +
    "<text x=\"88\" y=\"724\" fill=\"#999994\" font-family=\"Courier New, monospace\" font-size=\"18\">POLICY</text>" +
    "<text x=\"350\" y=\"724\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"18\">" + escapeXml(data.policy) + "</text>" +
    "<text x=\"88\" y=\"776\" fill=\"#999994\" font-family=\"Courier New, monospace\" font-size=\"18\">X LAYER</text>" +
    "<text x=\"350\" y=\"776\" fill=\"#f7f7f5\" font-family=\"Courier New, monospace\" font-size=\"18\">" + escapeXml(transaction) + "</text>" +
    "<text x=\"88\" y=\"816\" fill=\"#999994\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"16\">Source evidence remains private. Verify this record at the shared ProofLayer link.</text>" +
    "</svg>";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProofTools(props: ProofToolsProps) {
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : window.location.origin + "/proof/" + encodeURIComponent(props.claimId);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadCard() {
    const svg = proofCardSvg(props);
    const image = new Image();
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, "prooflayer-" + props.claimId + ".png");
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    image.src = svgUrl;
  }

  return (
    <div className="proof-tools">
      <div className="metric">
        <span>Shareable proof link</span>
        <strong>{link}</strong>
      </div>
      <div className="actions">
        <button className="button" type="button" onClick={copyLink}>Copy proof link</button>
        <button className="button" type="button" onClick={downloadCard}>Download proof card</button>
      </div>
      {copied && <p className="loading">Proof link copied.</p>}
    </div>
  );
}
