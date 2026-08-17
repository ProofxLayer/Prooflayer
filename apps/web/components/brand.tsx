import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        <span className="mark-image" />
      </span>
      <span>ProofLayer</span>
    </Link>
  );
}
