"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, MailCheck } from "lucide-react";

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

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
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
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-positive/10 text-positive">
            <MailCheck className="size-5" />
          </span>
          <CardTitle>E-postanı kontrol et</CardTitle>
          <CardDescription>
            Bu adres kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
            Bağlantı kısa süre geçerlidir.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/giris">
              <ArrowLeft className="size-4" />
              Girişe dön
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Şifremi unuttum</CardTitle>
        <CardDescription>
          Hesabının e-posta adresini gir; sıfırlama bağlantısı gönderelim.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@firma.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-sm text-danger">
                {errors.email.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
          </Button>
          <Link
            href="/giris"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Girişe dön
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
