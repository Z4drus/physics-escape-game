import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="panel-shadow bg-surface w-full max-w-md rounded-[28px] p-2">
        <div className="bg-surface-raised rounded-[20px] p-6">
          <h1 className="text-xl font-semibold">
            Cette pièce n&apos;existe pas
          </h1>
          <p className="text-muted mt-2 text-sm">
            Le couloir que vous cherchez ne fait pas partie du bâtiment.
          </p>
          <Link
            href="/"
            className="bg-accent text-background mt-6 flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-sm font-semibold transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent-strong)] active:scale-[0.96]"
          >
            Retourner à la salle
          </Link>
        </div>
      </div>
    </main>
  );
}
