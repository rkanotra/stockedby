// StockedBy is maintained as a lightweight side project. Persistence is
// intentionally disabled so the public tools never open a database
// connection, even if an old deployment environment still contains stale
// Supabase variables. Callers already treat null as the supported
// no-persistence mode: tests still run, while accounts, saved reports,
// history and paid workspaces stay offline.
export function supabase() {
  return null;
}
