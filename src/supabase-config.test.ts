import { describe, it, expect } from "vitest";
import { publicSupabaseConfig } from "./supabase-config";
const project = "https://abcdefghijklmnopqrst.supabase.co";
const token = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.test_signature`;
describe("public Supabase configuration safety", () => {
  it("allows explicit demonstration mode and rejects incomplete configuration", () => {
    expect(publicSupabaseConfig("", undefined).configured).toBe(false);
    expect(() => publicSupabaseConfig(project, "")).toThrow("both");
  });
  it("accepts publishable and legacy anon keys", () => {
    expect(
      publicSupabaseConfig(project, "sb_publishable_example").configured,
    ).toBe(true);
    const c = publicSupabaseConfig(project, token("anon"));
    expect(c.configured && c.projectRef).toBe("abcdefghijklmnopqrst");
  });
  it("prevents privileged keys and user sessions from entering browser builds", () => {
    for (const key of [
      "sb_secret_private_value",
      "sbp_private_value",
      token("service_role"),
      token("authenticated"),
    ]) {
      try {
        publicSupabaseConfig(project, key);
        throw new Error("Accepted privileged key");
      } catch (error) {
        expect((error as Error).message).not.toContain(key);
        expect((error as Error).message).not.toBe("Accepted privileged key");
      }
    }
  });
  it("rejects dashboard, credential-bearing and insecure remote URLs", () => {
    for (const url of [
      "https://supabase.com/dashboard/project/test",
      "https://user:password@abcdefghijklmnopqrst.supabase.co",
      "http://abcdefghijklmnopqrst.supabase.co",
      "https://abcdefghijklmnopqrst.supabase.co?password=private",
    ])
      expect(() => publicSupabaseConfig(url, token("anon"))).toThrow();
  });
  it("supports local service testing", () => {
    const c = publicSupabaseConfig("http://127.0.0.1:55421", token("anon"));
    expect(c.configured && c.projectRef).toBeNull();
  });
});
