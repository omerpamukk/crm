"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "../auth-shell";
import { useRecoveryLink } from "../use-recovery-link";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

type FormValues = z.infer<typeof schema>;

export default function GirisPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // Supabase panelinden gönderilen kurtarma linki Site URL köküne gelir;
  // kök oturumsuz kullanıcıyı buraya yönlendirir (# kısmı korunur).
  // Uygulamadan istenen linkler doğrudan /sifre-baglanti'ya gider.
  const link = useRecoveryLink();
  const shownError = formError ?? (link.status === "error" ? link.message : null);

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

  if (link.status === "verifying") {
    return <AuthCard title="Bağlantı doğrulanıyor…" description="Birkaç saniye içinde yönlendirileceksiniz." />;
  }

  return (
    <AuthCard
      title="Giriş yap"
      description="Hesabınıza giriş yapın."
      footer={
        <p className="text-subhead text-label-2">
          Hesabınız yalnızca işletme yöneticiniz tarafından oluşturulur.
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11 md:h-9"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-subhead text-danger-text">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Şifre</Label>
            <Link
              href="/sifremi-unuttum"
              className="focus-ring -my-2 inline-flex min-h-11 items-center rounded-md px-1 text-subhead text-primary-text hover:underline md:min-h-0 md:py-2"
            >
              Şifremi unuttum
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11 md:h-9"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-subhead text-danger-text">
              {errors.password.message}
            </p>
          )}
        </div>

        {shownError && (
          <p role="alert" className="text-subhead text-danger-text">
            {shownError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
        </Button>
      </form>
    </AuthCard>
  );
}
