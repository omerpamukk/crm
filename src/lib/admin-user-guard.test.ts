import { describe, expect, it } from "vitest";
import { checkTargetUser, isLastOwner } from "./admin-user-guard";

const t = { id: "u1", business_id: "b1", role: "reception" };

describe("checkTargetUser", () => {
  it("kendi firmasındaki normal kullanıcıya izin verir", () => {
    expect(checkTargetUser(t, "b1", false)).toBeNull();
  });
  it("başka firmanın kullanıcısını reddeder", () => {
    expect(checkTargetUser(t, "b2", false)).toBe("Bu kullanıcı bu firmaya ait değil.");
  });
  it("profili olmayanı ve firmasızı reddeder", () => {
    expect(checkTargetUser(null, "b1", false)).not.toBeNull();
    expect(checkTargetUser({ ...t, business_id: null }, "b1", false)).not.toBeNull();
  });
  it("platform adminini reddeder", () => {
    expect(checkTargetUser(t, "b1", true)).not.toBeNull();
  });
});

describe("isLastOwner", () => {
  it("tek owner ise true", () => {
    expect(isLastOwner([{ id: "a", role: "owner" }, { id: "b", role: "reception" }], "a")).toBe(true);
  });
  it("iki owner varsa false", () => {
    expect(isLastOwner([{ id: "a", role: "owner" }, { id: "b", role: "owner" }], "a")).toBe(false);
  });
  it("owner olmayan kullanıcı için false", () => {
    expect(isLastOwner([{ id: "a", role: "owner" }, { id: "b", role: "reception" }], "b")).toBe(false);
  });
});
