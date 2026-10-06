import { describe, expect, it } from "vitest";
import { validatePublicHttpsTarget } from "../src/network-security.js";

const blockedIpv6Families: Array<[string, string[]]> = [
  ["unspecified", ["::", "0:0:0:0:0:0:0:0", "0000:0000:0000:0000:0000:0000:0000:0000"]],
  [
    "loopback",
    ["::1", "0::1", "0:0:0:0:0:0:0:1", "0000:0000:0000:0000:0000:0000:0000:0001"],
  ],
  ["unique-local fc", ["fc00::1", "FC00:0000:0000:0000:0000:0000:0000:0001"]],
  ["unique-local fd", ["fd00::1", "FD00:0000:0000:0000:0000:0000:0000:0001"]],
  ["link-local fe80", ["fe80::1", "FE80:0000:0000:0000:0000:0000:0000:0001"]],
  ["link-local fe90", ["fe90::1", "FE90:0000:0000:0000:0000:0000:0000:0001"]],
  ["link-local fea0", ["fea0::1", "FEA0:0000:0000:0000:0000:0000:0000:0001"]],
  ["link-local feb0", ["feb0::1", "FEB0:0000:0000:0000:0000:0000:0000:0001"]],
  ["multicast", ["ff02::1", "FF02:0000:0000:0000:0000:0000:0000:0001"]],
  [
    "documentation",
    [
      "2001:db8::",
      "2001:db8::1",
      "2001:0db8:0000:0000:0000:0000:0000:0001",
      "2001:0DB8::192.0.2.1",
    ],
  ],
  [
    "mapped loopback",
    [
      "::ffff:127.0.0.1",
      "::FFFF:7F00:0001",
      "0:0:0:0:0:ffff:7f00:1",
      "0000:0000:0000:0000:0000:FFFF:127.0.0.1",
    ],
  ],
  [
    "mapped private",
    [
      "::ffff:10.0.0.1",
      "0:0:0:0:0:ffff:0a00:0001",
      "0000:0000:0000:0000:0000:ffff:10.0.0.1",
    ],
  ],
  [
    "mapped public remains denied",
    [
      "::ffff:8.8.8.8",
      "0:0:0:0:0:ffff:0808:0808",
      "0000:0000:0000:0000:0000:FFFF:8.8.8.8",
    ],
  ],
];

const publicIpv6Forms = [
  "2001:4860:4860::8888",
  "2001:4860:4860:0:0:0:0:8888",
  "2001:4860:4860:0000:0000:0000:0000:8888",
  "2606:4700:4700::1111",
  "2606:4700:4700:0000:0000:0000:0000:1111",
  "2001:4860:ABCD::1",
];

const blockedResult = {
  ok: false,
  error_code: "gateway.network.ssrf_blocked",
  side_effects: [],
};

describe("public HTTPS target address classification", () => {
  it.each(blockedIpv6Families)("denies every %s spelling", (_label, forms) => {
    for (const address of forms) {
      const input = target([address]);
      const before = structuredClone(input);
      expect(validatePublicHttpsTarget(input), address).toEqual(blockedResult);
      expect(input).toEqual(before);
    }
  });

  it.each(blockedIpv6Families)(
    "denies mixed resolved sets containing %s in either order",
    (_label, forms) => {
      for (const address of forms) {
        for (const addresses of [
          [publicIpv6Forms[0]!, address],
          [address, "8.8.8.8"],
        ]) {
          const input = target(addresses);
          const before = structuredClone(input);
          expect(validatePublicHttpsTarget(input), address).toEqual(blockedResult);
          expect(input).toEqual(before);
        }
      }
    },
  );

  it.each(publicIpv6Forms)(
    "preserves public IPv6 %s and closed transport flags",
    (address) => {
      const input = target([address]);
      const before = structuredClone(input);
      expect(validatePublicHttpsTarget(input)).toEqual({
        ok: true,
        url: input.url,
        dns_revalidation_required: true,
        redirects_allowed: false,
        credentials_forwarded: false,
        side_effects: [],
      });
      expect(input).toEqual(before);
    },
  );

  it("preserves IPv6 literal URL normalization and hostname denial", () => {
    expect(
      validatePublicHttpsTarget({
        ...target([publicIpv6Forms[0]!]),
        url: "https://[2001:4860:4860:0:0:0:0:8888]/resource",
      }),
    ).toMatchObject({ ok: true, url: "https://[2001:4860:4860::8888]/resource" });
    for (const [, forms] of blockedIpv6Families) {
      for (const address of forms) {
        expect(
          validatePublicHttpsTarget({
            ...target(["8.8.8.8"]),
            url: `https://[${address}]/resource`,
          }),
          address,
        ).toEqual(blockedResult);
      }
    }
  });

  it.each([
    "2001:4860::1%en0",
    "2001:4860::1%1",
    "2001:4860::1%25en0",
    "::gggg",
    "2001:::1",
    "[::1]",
    "::1\n",
    " ::1",
  ])(
    "contains unsupported or malformed resolved IPv6 %j without throwing",
    (address) => {
      const input = target([address]);
      const before = structuredClone(input);
      expect(validatePublicHttpsTarget(input)).toEqual(blockedResult);
      expect(input).toEqual(before);
    },
  );

  it("preserves the existing IPv4 classification", () => {
    for (const address of [
      "0.0.0.1",
      "10.0.0.1",
      "127.0.0.1",
      "100.64.0.1",
      "169.254.0.1",
      "172.16.0.1",
      "192.0.0.1",
      "192.0.2.1",
      "192.168.0.1",
      "198.18.0.1",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
    ]) {
      expect(validatePublicHttpsTarget(target([address])), address).toEqual(
        blockedResult,
      );
    }
    expect(validatePublicHttpsTarget(target(["8.8.8.8", "1.1.1.1"]))).toMatchObject({
      ok: true,
    });
  });
});

function target(resolved_ips: string[]) {
  return {
    url: "https://public.example.test/resource",
    resolved_ips,
    redirect_chain: [],
  };
}
