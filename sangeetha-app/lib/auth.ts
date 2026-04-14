export function isOwner(role: string | null | undefined) {
  return role === "owner";
}

export function isWorker(role: string | null | undefined) {
  return role === "employee";
}
