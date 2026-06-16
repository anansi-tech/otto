import { BRAND } from "@/lib/config";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const success = ok === "1";

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 480,
        margin: "15vh auto",
        padding: "0 24px",
        textAlign: "center",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 22 }}>
        {success ? "Logged — clock reset." : "Link invalid or already used."}
      </h1>
      <p style={{ color: "#666" }}>
        {success
          ? `${BRAND} will keep watching and nudge you before you run out again.`
          : "This confirmation link is no longer valid. No action was taken."}
      </p>
    </main>
  );
}
