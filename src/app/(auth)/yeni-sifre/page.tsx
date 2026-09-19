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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Buraya yalnızca geçerli bir sıfırlama bağlantısıyla gelinebilir:
  // /auth/callback kodu oturuma çevirmiş olmalı.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data }) => setHasSession(!!data.session))
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
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bağlantı doğrulanıyor…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!hasSession) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bağlantı geçersiz</CardTitle>
          <CardDescription>
            Sıfırlama bağlantısının süresi dolmuş veya daha önce kullanılmış.
            Yeni bir bağlantı isteyebilirsin.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Yeni şifre belirle</CardTitle>
        <CardDescription>En az 8 karakterli bir şifre seç.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Yeni şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="text-sm text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Yeni şifre (tekrar)</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? "confirm-error" : undefined}
              {...register("confirm")}
            />
            {errors.confirm && (
              <p id="confirm-error" role="alert" className="text-sm text-danger">
                {errors.confirm.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
