/** Admin panelinden firma kullanıcısına yapılan işlemlerin saf uygunluk kontrolleri. */

export interface TargetProfile {
  id: string;
  business_id: string | null;
  role: string | null;
}

/** Hedef kullanıcı bu firmaya ait ve platform admini değilse null; aksi halde Türkçe hata. */
export function checkTargetUser(
  target: TargetProfile | null,
  businessId: string,
  isPlatformAdmin: boolean,
): string | null {
  if (!target || !target.business_id || target.business_id !== businessId) {
    return "Bu kullanıcı bu firmaya ait değil.";
  }
  if (isPlatformAdmin) return "Ajans yöneticisi hesapları buradan yönetilemez.";
  return null;
}

/** userId, firmanın tek "owner"ı mı? */
export function isLastOwner(profiles: { id: string; role: string | null }[], userId: string): boolean {
  const owners = profiles.filter((p) => p.role === "owner");
  return owners.length === 1 && owners[0].id === userId;
}
