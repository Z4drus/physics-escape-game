import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh justify-center overflow-y-auto p-6">
      <div className="glass my-auto w-full max-w-md rounded-xl p-2">
        <div className="bg-background-deep rounded-lg p-6">
          <h1 className="text-xl">Cette salle n&apos;existe pas</h1>
          <p className="text-ink-fade mt-3 text-sm">
            Le couloir que vous cherchez ne fait pas partie du bâtiment.
          </p>
          <Link
            href="/"
            className="bg-ink text-background ease-smooth mt-6 flex h-11 w-full cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-opacity duration-[200ms] hover:opacity-90"
          >
            Retourner au laboratoire
          </Link>
        </div>
      </div>
    </main>
  );
}
