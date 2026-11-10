"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";

import { createClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "../auth-shell";

const schema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
});

type FormValues = z.infer<typeof schema>;

export default function SifremiUnuttumPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);

    // Bilerek PKCE değil "implicit" akış: PKCE'de bağlantı yalnızca isteğin
    // yapıldığı tarayıcıda çalışır (doğrulayıcı orada saklanır). Kullanıcı
    // maili telefonda ya da başka tarayıcıda açınca sessizce giriş ekranına
    // düşüyordu. Implicit akışta token'lar bağlantıyla gelir;
    // /sifre-baglanti onları oturuma çevirip /yeni-sifre'ye gönderir.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } }
    );
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/sifre-baglanti`,
    });

    if (error) {
      console.error("resetPasswordForEmail:", error);
      setFormError("Bağlantı gönderilemedi. Lütfen birazdan tekrar deneyin.");
      return;
    }

    // Güvenlik: e-posta kayıtlı olmasa da aynı mesaj gösterilir.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        icon={MailCheck}
        title="E-postanızı kontrol edin"
        description="Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Bağlantı kısa süre geçerlidir."
        footer={
          <Button variant="secondary" size="lg" asChild className="w-full">
            <Link href="/giris">
              <ArrowLeft />
              Girişe dön
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Şifremi unuttum"
      description="Hesabınızın e-posta adresini girin; size sıfırlama bağlantısı gönderelim."
      footer={
        <Link
          href="/giris"
          className="focus-ring inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem] text-primary-text hover:underline"
        >
          Girişe dön
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ornek@firma.com"
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

        {formError && (
          <p role="alert" className="text-subhead text-danger-text">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
        </Button>
      </form>
    </AuthCard>
  );
}
