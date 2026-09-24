import {
  cardBrand,
  digits,
  formatCardNumber,
  formatExpiry,
  luhn,
  money,
  normalizePhone,
  validateCard,
  validateDraft,
} from "./validation";
import { card, draft } from "./test/fixtures";

describe("card and delivery validation", () => {
  test.each([
    ["4242424242424242", "Visa"],
    ["5555555555554444", "Mastercard"],
    ["2221000000000009", "Mastercard"],
    ["2720990000000000", "Mastercard"],
    ["2220000000000000", null],
    ["2721000000000000", null],
    ["", null],
    ["378282246310005", null],
  ])("identifies network %s", (number, expected) => {
    expect(cardBrand(number)).toBe(expected);
  });
  test("Luhn rejects damaged, too short and too long numbers", () => {
    expect(luhn(card.number)).toBe(true);
    expect(luhn("4242424242424243")).toBe(false);
    expect(luhn("42")).toBe(false);
    expect(luhn("4".repeat(20))).toBe(false);
  });
  test("formatting is deterministic and bounded", () => {
    expect(digits("12 ab-34")).toBe("1234");
    expect(formatCardNumber("42424242424242420000")).toBe(
      "4242 4242 4242 4242 000",
    );
    expect(formatExpiry("122039")).toBe("12/20");
    expect(formatExpiry("1")).toBe("1");
    expect(normalizePhone("+57 300 000 0000")).toBe("3000000000");
  });
  test("accepts valid cards, including expiry during the current month", () => {
    expect(validateCard(card, new Date(2026, 8, 23))).toEqual({});
    expect(
      validateCard(
        { ...card, number: "5555555555554444", expiry: "09/26" },
        new Date(2026, 8, 30),
      ),
    ).toEqual({});
  });
  test.each([
    [{ number: "" }, "number", "válido"],
    [{ number: "378282246310005" }, "number", "Visa o Mastercard"],
    [{ number: "4242424242424243" }, "number", "válido"],
    [{ number: "5555555555554444000" }, "number", "válido"],
    [{ holder: " " }, "holder", "nombre"],
    [{ holder: "x".repeat(101) }, "holder", "nombre"],
    [{ expiry: "13/29" }, "expiry", "MM/AA"],
    [{ expiry: "08/26" }, "expiry", "vencida"],
    [{ expiry: "12/25" }, "expiry", "vencida"],
    [{ cvc: "12" }, "cvc", "3 dígitos"],
    [{ installments: "0" }, "installments", "1 y 36"],
    [{ installments: "37" }, "installments", "1 y 36"],
    [{ installments: "a" }, "installments", "1 y 36"],
  ])("rejects invalid card input %s", (update, field, message) => {
    expect(
      validateCard({ ...card, ...update }, new Date(2026, 8, 23))[
        field as string
      ],
    ).toContain(message);
  });
  test("checks every required delivery field and respects bounds", () => {
    expect(validateDraft(draft)).toEqual({});
    expect(
      Object.keys(validateDraft({ ...draft, customer: {}, delivery: {} })),
    ).toEqual(["fullName", "email", "phone", "addressLine1", "city", "region"]);
    const invalid = validateDraft({
      ...draft,
      customer: {
        fullName: "x".repeat(101),
        email: "x".repeat(255),
        phone: "42",
      },
      delivery: {
        addressLine1: "x".repeat(161),
        addressLine2: "x".repeat(101),
        city: "x".repeat(81),
        region: "x".repeat(81),
      },
    });
    expect(Object.keys(invalid)).toHaveLength(7);
  });
  test("renders complete COP amounts without truncating cents", () => {
    expect(money(20350000)).toContain("203.500");
    expect(money(20350001)).toContain("203.500,01");
  });
});
