import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateJexl, assertValidDeclarativeHooksInConfig } from "@dyrected/core";
import config from "../../../dyrected.config.ts";
import { calculateAsoebiFullPrice, rsvpRecords } from "../rsvp-records.ts";
import { rsvpGroups } from "../rsvp-groups.ts";

describe("RSVP Records — Declarative JEXL Expressions & Functions Parity", () => {
  // Helper to extract fields from flat collection fields array
  const findField = (name: string) => (rsvpRecords as any).fields?.find((f: any) => f.name === name);

  const amountPaidField = findField("asoebiAmountPaid");
  const asoebiAmountPaidOnChangeExpr = amountPaidField?.admin?.hooks?.onChange;

  it("passes Dyrected full schema and declarative hooks validation", () => {
    assert.doesNotThrow(() => {
      assertValidDeclarativeHooksInConfig(config);
    });
  });

  it("exports a valid declarative onChange expression for asoebiAmountPaid", () => {
    assert.equal(typeof asoebiAmountPaidOnChangeExpr, "string");
    assert.ok(asoebiAmountPaidOnChangeExpr.length > 0);
  });

  describe("Asoebi Full Price Calculation Parity", () => {
    const scenarios = [
      {
        name: "No items selected",
        item: { wantsAsoebi: false, wantsAsoOke: false },
      },
      {
        name: "Only fabric (5 yards)",
        item: { wantsAsoebi: true, asoebiYards: 5, wantsAsoOke: false },
      },
      {
        name: "Only headwear (2 male caps, 1 female gele)",
        item: {
          wantsAsoebi: false,
          wantsAsoOke: true,
          asoOkeMaleQty: 2,
          asoOkeFemaleQty: 1,
        },
      },
      {
        name: "Both fabric (4 yards) and headwear (1 male cap, 2 female gele)",
        item: {
          wantsAsoebi: true,
          asoebiYards: 4,
          wantsAsoOke: true,
          asoOkeMaleQty: 1,
          asoOkeFemaleQty: 2,
        },
      },
    ];

    for (const { name, item } of scenarios) {
      it(`calculates price correctly for: ${name}`, async () => {
        const expectedPrice = calculateAsoebiFullPrice(item);

        // Under 'received' status, onChange evaluates the full calculated price expression
        const jexlPrice = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
          siblingData: {
            ...item,
            asoebiPaymentStatus: "received",
          },
          value: 0,
        });

        assert.equal(
          jexlPrice,
          expectedPrice,
          `Mismatch for ${name}: JEXL gave ${jexlPrice}, JS gave ${expectedPrice}`,
        );
      });
    }
  });

  describe("Asoebi Payment Status onChange Behavior", () => {
    const baseOrder = {
      wantsAsoebi: true,
      asoebiYards: 4, // 4 * 10,000 = 40,000
      wantsAsoOke: true,
      asoOkeMaleQty: 1, // 1 * 6,000  = 6,000
      asoOkeFemaleQty: 2, // 2 * 6,000  = 12,000
      // Total price = 58,000
    };

    it("resets amount to 0 when status is pending", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "pending",
        },
        value: 20000,
      });
      assert.equal(result, 0);
    });

    it("sets full price (₦58k) when status is received", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "received",
        },
        value: 0,
      });
      assert.equal(result, 58000);
    });

    it("sets full price (₦58k) when status is waived", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "waived",
        },
        value: 0,
      });
      assert.equal(result, 58000);
    });

    it("preserves partial payment amount if already entered (> 0)", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "partial",
        },
        value: 25000,
      });
      assert.equal(result, 25000);
    });

    it("defaults partial payment to full price if current value is 0", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "partial",
        },
        value: 0,
      });
      assert.equal(result, 58000);
    });

    it("preserves value for unhandled/custom status", async () => {
      const result = await evaluateJexl(asoebiAmountPaidOnChangeExpr, {
        siblingData: {
          ...baseOrder,
          asoebiPaymentStatus: "custom_status",
        },
        value: 15000,
      });
      assert.equal(result, 15000);
    });
  });

  describe("Field Condition Visibility Logic", () => {
    const spouseField = findField("spouseName");
    const asoebiYardsField = findField("asoebiYards");
    const paymentStatusField = findField("asoebiPaymentStatus");

    it("shows spouseName only when hasSpouse is true", async () => {
      const cond = spouseField?.admin?.condition;
      assert.equal(await evaluateJexl(cond, { hasSpouse: true }), true);
      assert.equal(await evaluateJexl(cond, { hasSpouse: false }), false);
      assert.equal(await evaluateJexl(cond, {}), false);
    });

    it("shows asoebiYards only when wantsAsoebi is true", async () => {
      const cond = asoebiYardsField?.admin?.condition;
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: true }), true);
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: false }), false);
      assert.equal(await evaluateJexl(cond, {}), false);
    });

    it("shows order fields when wantsAsoebi OR wantsAsoOke is true", async () => {
      const cond = paymentStatusField?.admin?.condition;
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: true, wantsAsoOke: false }), true);
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: false, wantsAsoOke: true }), true);
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: true, wantsAsoOke: true }), true);
      assert.equal(await evaluateJexl(cond, { wantsAsoebi: false, wantsAsoOke: false }), false);
    });
  });

  describe("Access Control Policy Evaluation", () => {
    const helperEval = async (rule: any, ctx: Record<string, any>) => {
      if (typeof rule === "boolean") return rule;
      if (typeof rule === "function") return rule(ctx);
      if (typeof rule === "string") return await evaluateJexl(rule, ctx);
      return false;
    };

    describe("rsvp_records Access Rules", () => {
      const access = (rsvpRecords as any).access;

      it("allows public read", async () => {
        assert.equal(await helperEval(access.read, { user: null }), true);
        assert.equal(await helperEval(access.read, { user: { id: "u1" } }), true);
      });

      it("allows public create (guests submitting RSVPs)", async () => {
        assert.equal(await helperEval(access.create, { user: null }), true);
        assert.equal(await helperEval(access.create, { user: { id: "u1" } }), true);
      });

      it("allows public update (guests editing RSVPs with tokens)", async () => {
        assert.equal(await helperEval(access.update, { user: null }), true);
        assert.equal(await helperEval(access.update, { user: { id: "u1" } }), true);
      });

      it("restricts delete to authenticated admins only", async () => {
        assert.equal(await helperEval(access.delete, { user: null }), false);
        assert.equal(await helperEval(access.delete, {}), false);
        assert.equal(await helperEval(access.delete, { user: { id: "admin-1", email: "admin@sweetunion.com" } }), true);
      });
    });

    describe("rsvp_groups Access Rules", () => {
      const access = (rsvpGroups as any).access;

      it("allows public read", async () => {
        assert.equal(await helperEval(access.read, { user: null }), true);
      });

      it("restricts create to authenticated admins only", async () => {
        assert.equal(await helperEval(access.create, { user: null }), false);
        assert.equal(await helperEval(access.create, { user: { id: "admin-1" } }), true);
      });

      it("allows update for dynamic RSVP responses", async () => {
        assert.equal(await helperEval(access.update, { user: null }), true);
      });

      it("restricts delete to authenticated admins only", async () => {
        assert.equal(await helperEval(access.delete, { user: null }), false);
        assert.equal(await helperEval(access.delete, { user: { id: "admin-1" } }), true);
      });
    });
  });

  describe("Asoebi Logistics Paid Submetrics Validation", () => {
    const asoebiView = (rsvpRecords as any).views?.find((v: any) => v.slug === "asoebi_logistics");
    const yardsCard = asoebiView?.metrics?.find((m: any) => m.label === "Total Yards");
    const maleCard = asoebiView?.metrics?.find((m: any) => m.label === "Total Male Aso Oke");
    const femaleCard = asoebiView?.metrics?.find((m: any) => m.label === "Total Female Aso Oke");
    const revenueCard = asoebiView?.metrics?.find((m: any) => m.label === "Total Expected Revenue");

    it("verifies all Paid submetrics use exact whole-integer transform pricing", () => {
      const yardPaid = yardsCard?.subMetrics?.find((s: any) => s.label === "Paid");
      const malePaid = maleCard?.subMetrics?.find((s: any) => s.label === "Paid");
      const femalePaid = femaleCard?.subMetrics?.find((s: any) => s.label === "Paid");
      const revFabric = revenueCard?.subMetrics?.find((s: any) => s.label === "Paid (Fabric)");
      const revMale = revenueCard?.subMetrics?.find((s: any) => s.label === "Paid (Male Aso Oke)");
      const revFemale = revenueCard?.subMetrics?.find((s: any) => s.label === "Paid (Female Aso Oke)");

      assert.equal(yardPaid?.transform, "value * 10000");
      assert.equal(malePaid?.transform, "value * 6000");
      assert.equal(femalePaid?.transform, "value * 6000");
      assert.equal(revFabric?.transform, "value * 10000");
      assert.equal(revMale?.transform, "value * 6000");
      assert.equal(revFemale?.transform, "value * 6000");
    });
  });
});
