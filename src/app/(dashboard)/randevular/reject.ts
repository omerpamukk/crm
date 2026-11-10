/**
 * GeldiButton işlem başarısız olunca eski hâline dönsün diye promise'in
 * reddedilmesini bekler; eylem işlevleri ise başarısızlıkta false döner.
 */
export async function reject(result: Promise<boolean>): Promise<void> {
  if (!(await result)) throw new Error("işlem tamamlanamadı");
}
