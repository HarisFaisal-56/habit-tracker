import clsx from "clsx";

type IdentityStatementProps = {
  identity: string | undefined;
  className?: string;
};

/** A habit's identity framing, e.g. “I am someone who reads”. Renders nothing when unset. */
export function IdentityStatement({ identity, className }: IdentityStatementProps) {
  if (!identity) return null;
  return (
    <span
      className={clsx("block text-sm text-emerald-800 italic dark:text-emerald-300", className)}
    >
      “{identity}”
    </span>
  );
}
