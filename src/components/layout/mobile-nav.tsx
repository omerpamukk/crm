"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import type { NavSection } from "@/lib/nav";

export function MobileNav({
  businessName,
  displayName,
  roleLabel,
  sections,
  badges,
  counts,
}: {
  businessName: string;
  displayName: string;
  roleLabel: string;
  sections?: NavSection[];
  badges?: Record<string, number>;
  counts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="size-5" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[17rem] p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menü</SheetTitle>
        <SidebarNav
          businessName={businessName}
          displayName={displayName}
          roleLabel={roleLabel}
          sections={sections}
          badges={badges}
          counts={counts}
          onNavigate={() => setOpen(false)}
          variant="full"
        />
      </SheetContent>
    </Sheet>
  );
}
