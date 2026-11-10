"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { FormActions, FormSheet } from "@/components/shared/form-sheet";
import { ListGroup, ListRow } from "@/components/shared/list-group";

import { updateBusinessInfo, updateOwnerProfile } from "./actions";
import {
  businessInfoSchema,
  ownerProfileSchema,
  type BusinessInfoInput,
  type OwnerProfileInput,
} from "./schema";
import type { SettingsData } from "./settings-view";

const NO_SECTOR = "__yok";
const EMPTY = "Girilmemiş";

/** Temel bilgiler: işletme ve hesap. Düzenleme sağ panelde / alt sayfada açılır. */
export function GeneralSection({
  business,
  owner,
}: {
  business: SettingsData["business"];
  owner: SettingsData["owner"];
}) {
  const router = useRouter();
  const [bizOpen, setBizOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const sector = SECTORS.find((s) => s.value === business.sector)?.label ?? business.sector;

  return (
    <div className="space-y-8">
      <ListGroup
        title="İşletme"
        action={
          <Button variant="plain" size="sm" onClick={() => setBizOpen(true)}>
            Düzenle
          </Button>
        }
      >
        <ListRow title="İşletme adı" subtitle={business.name || EMPTY} />
        <ListRow title="Sektör" subtitle={sector || EMPTY} />
        <ListRow title="Telefon" subtitle={business.phone || EMPTY} />
        <ListRow title="E-posta" subtitle={business.email || EMPTY} />
        <ListRow title="Adres" subtitle={business.address || EMPTY} />
      </ListGroup>

      <ListGroup
        title="Hesabınız"
        action={
          <Button variant="plain" size="sm" onClick={() => setOwnerOpen(true)}>
            Düzenle
          </Button>
        }
      >
        <ListRow title="Ad soyad" subtitle={owner.full_name || EMPTY} />
        <ListRow title="Telefon" subtitle={owner.phone || EMPTY} />
        <ListRow title="E-posta" subtitle={owner.email || EMPTY} />
        <ListRow title="Rol" subtitle={owner.roleLabel} />
      </ListGroup>

      <FormSheet
        open={bizOpen}
        onOpenChange={setBizOpen}
        title="İşletme bilgileri"
        description="Müşterilerinizin göreceği bilgiler."
      >
        <BusinessForm
          initial={business}
          onDone={() => {
            setBizOpen(false);
            router.refresh();
          }}
          onCancel={() => setBizOpen(false)}
        />
      </FormSheet>

      <FormSheet
        open={ownerOpen}
        onOpenChange={setOwnerOpen}
        title="Hesabınız"
        description="E-posta adresi ve rol buradan değiştirilemez."
      >
        <OwnerForm
          initial={owner}
          onDone={() => {
            setOwnerOpen(false);
            router.refresh();
          }}
          onCancel={() => setOwnerOpen(false)}
        />
      </FormSheet>
    </div>
  );
}

function BusinessForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: SettingsData["business"];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BusinessInfoInput>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: BusinessInfoInput) {
    setFormError(null);
    const res = await updateBusinessInfo(values);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("İşletme bilgileri kaydedildi");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">İşletme adı *</Label>
        <Input id="name" autoComplete="organization" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-subhead text-danger-text">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sector">Sektör</Label>
        <Controller
          control={control}
          name="sector"
          render={({ field }) => (
            <Select
              value={field.value || NO_SECTOR}
              onValueChange={(v) => field.onChange(v === NO_SECTOR ? "" : v)}
            >
              <SelectTrigger id="sector" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SECTOR}>Seçilmedi</SelectItem>
                {SECTORS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="info@ornek.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-subhead text-danger-text">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Input id="address" autoComplete="street-address" {...register("address")} />
      </div>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </FormActions>
    </form>
  );
}

function OwnerForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: SettingsData["owner"];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OwnerProfileInput>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: { full_name: initial.full_name, phone: initial.phone },
  });

  async function onSubmit(values: OwnerProfileInput) {
    setFormError(null);
    const res = await updateOwnerProfile(values);
    if (res.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Hesap bilgileri kaydedildi");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Ad soyad *</Label>
        <Input id="full_name" autoComplete="name" aria-invalid={!!errors.full_name} {...register("full_name")} />
        {errors.full_name && <p className="text-subhead text-danger-text">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner_phone">Telefon</Label>
        <Input id="owner_phone" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" {...register("phone")} />
      </div>

      {formError && (
        <p role="alert" className="text-subhead text-danger-text">
          {formError}
        </p>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </FormActions>
    </form>
  );
}
