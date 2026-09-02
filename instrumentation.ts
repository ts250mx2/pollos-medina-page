export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { iniciarWansoftScheduler } = await import("./lib/wansoft-scheduler");
  iniciarWansoftScheduler();
}
