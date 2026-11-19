export type BootstrapOwnerConfig =
  | { ok: true; ownerUid: string; shopId: string }
  | { ok: false; message: string };

export function validateBootstrapOwnerConfig(
  ownerUidValue: unknown,
  shopIdValue: unknown,
): BootstrapOwnerConfig {
  const ownerUid = typeof ownerUidValue === "string" ? ownerUidValue.trim() : "";
  const shopId = typeof shopIdValue === "string" ? shopIdValue.trim() : "";

  if (!ownerUid || ownerUid.length > 128 || ownerUid.includes("/")) {
    return { ok: false, message: "OWNER_UID is missing or invalid on the server." };
  }
  if (!shopId || shopId.length > 128 || shopId.includes("/")) {
    return { ok: false, message: "SHOP_ID is missing or invalid on the server." };
  }
  return { ok: true, ownerUid, shopId };
}

