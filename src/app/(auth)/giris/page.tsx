"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

type FormValues = z.infer<typeof schema>;

export default function GirisPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setFormError("E-posta veya şifre hatalı");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setFormError("E-postanız henüz onaylanmamış. Lütfen e-postanızı kontrol edin.");
      } else {
        setFormError("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      }
      return;
    }

    // Yönlendirme: süper-admin → /admin · işletmesi yok → /hesap-yok
    // · aboneliği askıda/iptal → /askida · normal → /panel
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (isAdmin) {
      router.push("/admin");
      router.refresh();
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", data.user.id)
      .single();

    if (!profile?.business_id) {
      router.push("/hesap-yok");
      router.refresh();
      return;
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("business_id", profile.business_id)
      .maybeSingle();

    const suspended = sub?.status === "suspended" || sub?.status === "cancelled";
    router.push(suspended ? "/askida" : "/panel");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giriş yap</CardTitle>
        <CardDescription>Hesabınıza giriş yapın.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}
        </CardContent>

        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Hesabın yalnızca işletme yöneticin tarafından oluşturulur.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
