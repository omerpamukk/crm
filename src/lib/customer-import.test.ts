import { describe, expect, it } from "vitest";

import { guessMapping, parseBirthday, parseConsent, parseCsv, parseImport } from "./customer-import";

describe("müşteri aktarımı", () => {
  it("başlıkları tahmin eder", () => {
    expect(guessMapping(["Adı Soyadı", "Cep Telefonu", "E-posta", "Doğum Tarihi", "Notlar", "SMS İzni"])).toEqual({
      full_name: 0,
      phone: 1,
      email: 2,
      birthday: 3,
      note: 4,
      consent: 5,
    });
    expect(guessMapping(["Müşteri", "Tel"])).toEqual({ full_name: 0, phone: 1 });
  });

  it("satırları temizler, dosyadaki tekrarı ayıklar", () => {
    const r = parseImport(
      [
        ["Ayşe  Yılmaz", "0532 111 22 33", "AYSE@ornek.com", "15.03.1990", "", "evet"],
        ["", "0532 999 99 99"],
        ["Fatma", 5321112233, "", "", "", ""],
        ["Zeynep", "123", "bozuk", "", "VIP", "hayır"],
        ["", "", "", "", "", ""],
      ],
      { full_name: 0, phone: 1, email: 2, birthday: 3, note: 4, consent: 5 }
    );
    expect(r.rows).toEqual([
      { full_name: "Ayşe Yılmaz", phone: "905321112233", email: "ayse@ornek.com", birthday: "1990-03-15", note: null, consent: true },
      { full_name: "Zeynep", phone: null, email: null, birthday: null, note: "VIP", consent: false },
    ]);
    expect(r.missingName).toBe(1);
    expect(r.duplicateInFile).toBe(1);
    expect(r.badPhone).toBe(1);
  });

  it("tarih ve izin biçimleri", () => {
    expect(parseBirthday("1990-3-5")).toBe("1990-03-05");
    expect(parseBirthday("5/3/1990")).toBe("1990-03-05");
    expect(parseBirthday(new Date(Date.UTC(1985, 11, 1)))).toBe("1985-12-01");
    expect(parseBirthday("31.13.1990")).toBeNull();
    expect(parseConsent("Evet")).toBe(true);
    expect(parseConsent("X")).toBe(true);
    expect(parseConsent("Hayır")).toBe(false);
  });

  it("CSV: noktalı virgül ve tırnak", () => {
    expect(parseCsv('﻿Ad;Tel\n"Yılmaz; Ayşe";0532\r\nAli;0533\n')).toEqual([
      ["Ad", "Tel"],
      ["Yılmaz; Ayşe", "0532"],
      ["Ali", "0533"],
    ]);
  });
});
