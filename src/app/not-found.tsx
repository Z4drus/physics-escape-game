import Link from "next/link";
import { useTranslations } from "next-intl";

/** Page introuvable, dans la langue active. */
export default function NotFound() {
  const t = useTranslations("ui.notFound");

  return (
    <main className="flex min-h-dvh justify-center overflow-y-auto p-6">
      <div className="glass my-auto w-full max-w-md rounded-xl p-2">
        <div className="bg-background-deep rounded-lg p-6">
          <h1 className="text-xl">{t("title")}</h1>
          <p className="text-ink-fade mt-3 text-sm">{t("body")}</p>
          <Link
            href="/"
            className="bg-ink text-background ease-smooth mt-6 flex h-11 w-full cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-opacity duration-[200ms] hover:opacity-90"
          >
            {t("back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
