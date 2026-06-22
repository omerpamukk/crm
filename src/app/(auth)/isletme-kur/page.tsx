"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { SECTORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "İşletme adı zorunludur"),
  sector: z.string().min(1, "Sektör seçin"),
});

type FormValues = z.infer<typeof schema>;

export default function IsletmeKurPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Zaten işletmesi olan kullanıcı buraya gelirse doğrudan panele yönlendir.
  useEffect(() => {
    const supabase = createClient();
    async function checkExisting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/giris");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profile?.business_id) {
        router.replace("/panel");
        return;
      }
      setChecking(false);
    }
    checkExisting();
  }, [router]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/giris");
      return;
    }

    // 1) İşletmeyi oluştur.
    // id'yi client'ta üretiyoruz; böylece insert'i RETURNING'siz yapabiliyoruz.
    // (RETURNING/.select(), henüz profile bağlı olmayan yeni satırı
    //  businesses_select_own politikasına takıp 42501 hatasına yol açıyordu.)
    const businessId = crypto.randomUUID();
    const { error: businessError } = await supabase
      .from("businesses")
      .insert({ id: businessId, name: values.name, sector: values.sector });

    if (businessError) {
      setFormError("İşletme oluşturulamadı. Lütfen tekrar deneyin.");
      return;
    }

    // 2) Profili bu işletmeye bağla
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ business_id: businessId })
      .eq("id", user.id);

    if (profileError) {
      setFormError(
        "İşletme kaydedildi ancak profil güncellenemedi. Lütfen tekrar deneyin."
      );
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>İşletmeni kur</CardTitle>
        <CardDescription>
          Başlamadan önce işletme bilgilerini gir.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">İşletme adı</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Sektör</Label>
            <Controller
              control={control}
              name="sector"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="sector" className="w-full">
                    <SelectValue placeholder="Sektör seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sector && (
              <p className="text-sm text-danger">{errors.sector.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}
        </CardContent>

        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Devam et"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
