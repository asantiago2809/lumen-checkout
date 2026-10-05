import { fireEvent, render, screen } from "@testing-library/react";
import {
  Alert,
  BrandLogo,
  Dialog,
  Icon,
  PriceBreakdown,
  ProductImage,
} from "./components";
import { product, quote } from "./test/fixtures";

test("dialog traps keyboard focus and Escape closes only when unlocked", () => {
  const close = jest.fn();
  const view = render(
    <Dialog title="Datos" step="DETAILS" onClose={close}>
      <button>Primero</button>
      <button>Último</button>
    </Dialog>,
  );
  expect(screen.getByRole("heading", { name: "Datos" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("heading"), {
    key: "Tab",
    shiftKey: true,
  });
  expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("button", { name: "Último" }), {
    key: "Tab",
  });
  expect(
    screen.getByRole("button", { name: "Cerrar formulario de pago" }),
  ).toHaveFocus();
  fireEvent.keyDown(
    screen.getByRole("button", { name: "Cerrar formulario de pago" }),
    { key: "Tab", shiftKey: true },
  );
  expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
  view.rerender(
    <Dialog title="Resultado" step="RESULT" locked onClose={close}>
      <button>Último</button>
    </Dialog>,
  );
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
  view.rerender(
    <Dialog title="Resultado" step="RESULT">
      <p>Sin controles aún</p>
    </Dialog>,
  );
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
});
test("visual components expose accessible card logos and complete amounts", () => {
  render(
    <>
      <BrandLogo brand="visa" />
      <BrandLogo brand="MASTERCARD" />
      <BrandLogo brand={null} />
      <PriceBreakdown amounts={quote.amounts} />
      <Alert>Revisa los datos</Alert>
      <Alert tone="info">Recuperado</Alert>
      <Icon name="arrow" />
      <Icon name="check" />
      <Icon name="close" />
      <Icon name="clock" />
    </>,
  );
  expect(screen.getByRole("img", { name: "Visa" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Mastercard" })).toBeInTheDocument();
  expect(screen.getByText("Cargo base")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Revisa");
  expect(screen.getByRole("status")).toHaveTextContent("Recuperado");
});
test("product photography has responsive sources with a bounded SVG fallback", () => {
  const photo = { ...product, imageUrl: "/lumen-one-1200.webp" };
  const view = render(<ProductImage product={photo} />);
  expect(view.container.querySelector("source")).toHaveAttribute(
    "srcset",
    "/lumen-one-640.webp 640w, /lumen-one-1200.webp 1200w",
  );
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByRole("img")).toHaveAttribute("src", "/lumen-lamp.svg");
  expect(view.container.querySelector("source")).toBeNull();
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByRole("img")).toHaveAttribute("src", "/lumen-lamp.svg");
  view.unmount();
  const small = render(<ProductImage product={photo} thumbnail />);
  expect(small.container.querySelector("source")).toHaveAttribute(
    "sizes",
    "88px",
  );
});

test("price breakdown displays the supplied VAT rate, amount and authoritative total", () => {
  const amounts = {
    ...quote.amounts,
    vatRatePercent: 19,
    vatInCents: 3591000,
    totalInCents: 23941000,
  };
  const view = render(<PriceBreakdown amounts={amounts} />);
  expect(screen.getByText("IVA (19%)").nextElementSibling).toHaveTextContent(
    "35.910",
  );
  expect(view.container.querySelector(".total dd")).toHaveTextContent(
    "239.410",
  );
  expect(
    [...view.container.querySelectorAll("dt")].map(
      (label) => label.textContent,
    ),
  ).toEqual(["Producto", "Cargo base", "Envío", "IVA (19%)", "Total COP"]);
  // The UI presents snapshots supplied by the server; it does not derive a tax
  // from the subtotal or replace a supplied total with a client-side sum.
  view.rerender(
    <PriceBreakdown
      amounts={{
        ...amounts,
        vatRatePercent: 5,
        vatInCents: 123,
        totalInCents: 456,
      }}
    />,
  );
  expect(screen.getByText("IVA (5%)").nextElementSibling).toHaveTextContent(
    "1,23",
  );
  expect(view.container.querySelector(".total dd")).toHaveTextContent("4,56");
});

test.each([{}, { vatRatePercent: 19 }, { vatInCents: 3591000 }])(
  "price breakdown omits VAT when the historical snapshot lacks either field: %s",
  (vat) => {
    const view = render(
      <PriceBreakdown
        amounts={{
          currency: "COP",
          subtotalInCents: 18900000,
          baseFeeInCents: 250000,
          deliveryFeeInCents: 1200000,
          totalInCents: 20350000,
          ...vat,
        }}
      />,
    );
    expect(screen.queryByText(/^IVA/)).not.toBeInTheDocument();
    expect(view.container.querySelectorAll("dt")).toHaveLength(4);
    expect(view.container.querySelector(".total dd")).toHaveTextContent(
      "203.500",
    );
  },
);

test("price breakdown renders an explicitly supplied zero VAT instead of treating it as absent", () => {
  render(
    <PriceBreakdown
      amounts={{ ...quote.amounts, vatRatePercent: 0, vatInCents: 0 }}
    />,
  );
  expect(screen.getByText("IVA (0%)").nextElementSibling).toHaveTextContent(
    "0",
  );
});
