export function getFollowUpReminder(date: string) {
  const createdAt = new Date(date);
  if (Number.isNaN(createdAt.getTime())) return null;

  const elapsedDays = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);
  if (elapsedDays >= 180) return { label: "🔥 Reactivar (6 meses)", className: "bg-red-50 text-red-700" };
  if (elapsedDays >= 90) return { label: "⚠️ Urgente (3 meses)", className: "bg-orange-50 text-orange-700" };
  if (elapsedDays >= 30) return { label: "🔔 Seguimiento (1 mes)", className: "bg-amber-50 text-amber-700" };
  return null;
}
