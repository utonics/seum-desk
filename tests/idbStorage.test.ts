import { describe, it, expect } from "vitest";
import { idbAvailable, idbStorage } from "@/lib/idbStorage";

describe("idbStorage (IndexedDB가 없는 환경)", () => {
  it("조용히 비활성화된다 — 읽으면 null, 쓰기·삭제는 예외 없이 끝난다", async () => {
    expect(idbAvailable()).toBe(false);
    expect(await idbStorage.getItem("x")).toBeNull();
    await expect(idbStorage.setItem("x", "1")).resolves.toBeUndefined();
    await expect(idbStorage.removeItem("x")).resolves.toBeUndefined();
  });
});
