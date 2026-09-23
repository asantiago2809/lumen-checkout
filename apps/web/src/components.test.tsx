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
