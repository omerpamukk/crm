"use client";

import { useState } from "react";
import Link from "next/link";
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
  fullName: z.string().min(1, "Ad-soyad zorunludur"),
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});

type FormValues = z.infer<typeof schema>;

export default function KayitPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    setInfoMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already")
      ) {
        setFormError("Bu e-posta zaten kayıtlı");
      } else if (msg.includes("password")) {
        setFormError("Şifre en az 8 karakter olmalı");
      } else if (msg.includes("database error saving new user")) {
        setFormError(
          "Veritabanı hatası: kullanıcı profili oluşturulamadı. 0001_init.sql migration'ının (handle_new_user trigger'ı) Supabase'de çalıştırıldığından emin olun."
        );
      } else {
        setFormError(`Kayıt sırasında bir hata oluştu: ${error.message}`);
      }
      return;
    }

    // E-posta onayı açıksa oturum oluşmaz; kullanıcı önce e-postasını onaylamalı.
    if (!data.session) {
      setInfoMessage(
        "Hesabınız oluşturuldu. Devam etmek için e-postanıza gönderilen onay bağlantısına tıklayın."
      );
      return;
    }

    router.push("/isletme-kur");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kayıt ol</CardTitle>
        <CardDescription>CRM hesabınızı oluşturun.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad-soyad</Label>
            <Input id="fullName" autoComplete="name" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-danger">{errors.fullName.message}</p>
            )}
          </div>

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
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-danger">{formError}</p>}
          {infoMessage && (
            <p className="text-sm text-positive">{infoMessage}</p>
          )}
        </CardContent>

        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Oluşturuluyor..." : "Kayıt ol"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/giris" className="text-primary hover:underline">
              Giriş yap
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
