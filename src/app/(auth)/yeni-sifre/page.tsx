"use client";

import { useEffect, useState } from "react";
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

const schema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Şifreler eşleşmiyor",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function YeniSifrePage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Buraya yalnızca geçerli bir sıfırlama bağlantısıyla gelinebilir:
  // /sifre-baglanti (veya eski PKCE akışında /auth/callback) oturumu kurmuş olmalı.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setHasSession(!!data.session);
        setEmail(data.session?.user.email ?? null);
      })
      .finally(() => setChecking(false));
  }, []);

  async function onSubmit(values: FormValues) {
    setFormError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      console.error("updateUser:", error);
      setFormError("Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (checking) {
    return <AuthCard title="Bağlantı doğrulanıyor…" />;
  }

  if (!hasSession) {
    return (
      <AuthCard
        title="Bağlantı geçersiz"
        description="Sıfırlama bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı isteyebilirsiniz."
        footer={
          <Button size="lg" asChild className="w-full">
            <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
          </Button>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Yeni şifre belirle"
      description={
        // Hangi hesabın şifresinin değiştiği açıkça görünsün: başkasının
        // ürettiği bir bağlantıyla gelen kullanıcı bunu fark edebilmeli.
        email ? (
          <>
            <span className="font-medium break-all text-label">{email}</span> hesabı için en az 8 karakterli bir şifre seçin.
          </>
        ) : (
          "En az 8 karakterli bir şifre seçin."
        )
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">Yeni şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
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

        <div className="space-y-2">
          <Label htmlFor="confirm">Yeni şifre (tekrar)</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className="h-11 md:h-9"
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "confirm-error" : undefined}
            {...register("confirm")}
          />
          {errors.confirm && (
            <p id="confirm-error" role="alert" className="text-subhead text-danger-text">
              {errors.confirm.message}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-subhead text-danger-text">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Kaydediliyor..." : "Şifreyi güncelle"}
        </Button>
      </form>
    </AuthCard>
  );
}
