import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { App } from "./App";
import * as transport from "./api";
import { actions, makeStore, type CheckoutState } from "./store";
import {
  approved,
  card,
  config,
  draft,
  product,
  quote,
  readyState,
  session,
  transaction,
} from "./test/fixtures";

function mount(state: CheckoutState = readyState()) {
  const store = makeStore(state);
  const view = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return { store, ...view };
}
async function openForm(state?: CheckoutState) {
  const view = mount(state);
  if (!state || state.step === "PRODUCT")
    fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" }));
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: /Acepto los/ })).toBeEnabled(),
  );
  return view;
}
function fillCard(number = card.number) {
  for (const [label, value] of [
    ["Número de tarjeta", number],
    ["Nombre del titular", card.holder],
    ["Vencimiento", card.expiry],
    ["Código de seguridad", card.cvc],
  ])
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  for (const name of [/Acepto los/, /Autorizo el/]) {
    const input = screen.getByRole("checkbox", { name }) as HTMLInputElement;
    if (!input.checked) fireEvent.click(input);
  }
}
function fillDelivery() {
  for (const [label, value] of [
    ["Nombre de quien recibe", "Cliente Demo"],
    ["Correo electrónico", "demo@example.com"],
    ["Teléfono", "3000000000"],
    ["Dirección", "Calle de ejemplo 10"],
    ["Complemento (opcional)", "Apto 20"],
    ["Ciudad", "Bogotá"],
    ["Departamento", "Bogotá D.C."],
  ])
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
}
async function review() {
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
  await screen.findByRole("heading", { name: "Un último vistazo." });
}
async function openSummary() {
  const view = await openForm();
  fillCard();
  fillDelivery();
  await review();
  return view;
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(transport.api, "products").mockResolvedValue([product]);
  jest.spyOn(transport.api, "session").mockResolvedValue(session);
  jest.spyOn(transport.api, "config").mockResolvedValue(config);
  jest
    .spyOn(transport.api, "saveDraft")
    .mockImplementation(async (value) => ({ draft: value }));
  jest.spyOn(transport.api, "quote").mockResolvedValue(quote);
  jest.spyOn(transport.api, "create").mockResolvedValue(transaction);
  jest.spyOn(transport.api, "pay").mockResolvedValue(approved);
  jest.spyOn(transport.api, "transaction").mockResolvedValue(transaction);
  jest.spyOn(transport.api, "clearDraft").mockResolvedValue();
  jest.spyOn(transport, "tokenize").mockResolvedValue("tok_ephemeral_fixture");
});

test("loads catalog, renders real data, handles unavailable illustration", async () => {
  mount({ ...readyState(), loading: "idle", products: [] });
  expect(screen.getByText("Cargando producto…")).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Lumen One" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Disponible · 12 unidades")).toBeInTheDocument();
  const image = screen.getByRole("img", { name: product.imageAlt });
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/lumen-lamp.svg");
});
test("shows loading failure and retries the catalog", async () => {
  jest
    .mocked(transport.api.products)
    .mockRejectedValueOnce(new Error("No hay conexión"));
  mount({ ...readyState(), loading: "idle" });
  expect(
    await screen.findByRole("heading", {
      name: "No pudimos cargar el producto.",
    }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
  expect(
    await screen.findByText("Disponible · 12 unidades"),
  ).toBeInTheDocument();
});
test("shows empty collection and reloads availability", async () => {
  mount(readyState({ products: [] }));
  expect(screen.getByText("La colección vuelve pronto.")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar disponibilidad" }),
  );
  expect(
    await screen.findByText("Disponible · 12 unidades"),
  ).toBeInTheDocument();
});
test("zero stock disables payment and one unit uses correct copy", async () => {
  jest
    .mocked(transport.api.products)
    .mockResolvedValue([{ ...product, stock: 1, imageUrl: "/broken.svg" }]);
  mount(readyState({ products: [{ ...product, stock: 0 }] }));
  expect(
    screen.getByRole("button", { name: "Por ahora, agotado" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Consultar disponibilidad" }),
  );
  expect(await screen.findByText("Disponible · 1 unidad")).toBeInTheDocument();
  const image = screen.getByRole("img", { name: product.imageAlt });
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/lumen-lamp.svg");
});
test("form uses an accessible modal, restores trigger focus and saves only delivery", async () => {
  const { store } = await openForm();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  fillCard();
  fillDelivery();
  expect(screen.getByRole("img", { name: "Visa" })).toBeInTheDocument();
  expect(JSON.stringify(store.getState())).not.toContain("4242");
  expect(localStorage.getItem("lumen.checkout.v1")).not.toContain(
    "demo@example.com",
  );
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Pagar con tarjeta" }),
  ).toHaveFocus();
  await waitFor(() => expect(transport.api.saveDraft).toHaveBeenCalled());
});
test("invalid form explains errors and focuses first invalid field", async () => {
  await openForm();
  fireEvent.blur(screen.getByLabelText("Nombre del titular"));
  expect(screen.getByText(/Ingresa el nombre del titular/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
  expect(
    await screen.findByText("Revisa los campos marcados."),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByLabelText("Número de tarjeta")).toHaveFocus(),
  );
  fillCard("5555555555554444");
  fillDelivery();
  expect(screen.getByRole("img", { name: "Mastercard" })).toBeInTheDocument();
  fireEvent.blur(screen.getByLabelText("Correo electrónico"));
  fireEvent.change(screen.getByLabelText("Número de cuotas"), {
    target: { value: "3" },
  });
  await review();
  expect(screen.getByText(/3 cuotas/)).toBeInTheDocument();
});
test("configuration failure is honest and can reconnect without mock fallback", async () => {
  jest
    .mocked(transport.api.config)
    .mockRejectedValueOnce(new Error("Sandbox temporalmente indisponible"));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" }));
  expect(
    await screen.findByText("Sandbox temporalmente indisponible"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Continuar al resumen" }),
  ).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: /Acepto los/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Volver a conectar" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Continuar al resumen" }),
    ).toBeEnabled(),
  );
});
test("completed checkout creates before tokenization and pay, prevents duplicate clicks, refreshes stock", async () => {
  const { store } = await openSummary();
  expect(screen.getByText("Cargo base")).toBeInTheDocument();
  expect(screen.getByText("Envío")).toBeInTheDocument();
  expect(screen.getByText("Apto 20", { exact: false })).toBeInTheDocument();
  const confirm = screen.getByRole("button", { name: /Pagar.*203/ });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(
    await screen.findByRole("heading", { name: "Tu luz está en camino." }),
  ).toBeInTheDocument();
  expect(transport.api.create).toHaveBeenCalledTimes(1);
  expect(transport.api.pay).toHaveBeenCalledTimes(1);
  expect(
    jest.mocked(transport.api.create).mock.invocationCallOrder[0],
  ).toBeLessThan(jest.mocked(transport.tokenize).mock.invocationCallOrder[0]);
  expect(
    jest.mocked(transport.tokenize).mock.invocationCallOrder[0],
  ).toBeLessThan(jest.mocked(transport.api.pay).mock.invocationCallOrder[0]);
  expect(JSON.stringify(store.getState())).not.toContain("tok_ephemeral");
  expect(JSON.stringify(store.getState())).not.toContain("424242424242");
  expect(screen.getByText("Preparada · Bogotá")).toBeInTheDocument();
  jest
    .mocked(transport.api.products)
    .mockResolvedValue([{ ...product, stock: 11 }]);
  fireEvent.click(screen.getByRole("button", { name: "Volver al producto" }));
  expect(
    await screen.findByText("Disponible · 11 unidades"),
  ).toBeInTheDocument();
  expect(transport.api.clearDraft).toHaveBeenCalled();
});
test("summary editing preserves ephemeral card and receipt changes no amount on its own", async () => {
  await openSummary();
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue(card.number);
  await review();
  fireEvent.click(screen.getByRole("button", { name: "Volver a mis datos" }));
  expect(screen.getByLabelText("Dirección")).toHaveValue("Calle de ejemplo 10");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Volver al producto" }));
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
test("draft save and quote errors retain editable data", async () => {
  await openForm();
  fillCard();
  fillDelivery();
  jest
    .mocked(transport.api.saveDraft)
    .mockRejectedValue(new Error("No se guardó"));
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
  expect(await screen.findByText("No se guardó")).toBeInTheDocument();
  expect(
    screen.getByText(/No pudimos guardar el progreso/),
  ).toBeInTheDocument();
  jest
    .mocked(transport.api.saveDraft)
    .mockImplementation(async (value) => ({ draft: value }));
  jest
    .mocked(transport.api.quote)
    .mockRejectedValueOnce(new Error("Sin unidades disponibles"));
  fireEvent.click(screen.getByRole("button", { name: "Continuar al resumen" }));
  expect(
    await screen.findByText("Sin unidades disponibles"),
  ).toBeInTheDocument();
  await review();
});
test("refresh restoration retains delivery while requiring card and consent again", async () => {
  await openForm(
    readyState({
      draft,
      step: "DETAILS",
      notice: "Recuperamos tus datos de entrega. Ingresa tu tarjeta.",
    }),
  );
  expect(screen.getByLabelText("Nombre de quien recibe")).toHaveValue(
    "Cliente Demo",
  );
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue("");
  expect(
    screen.getByRole("checkbox", { name: /Acepto los/ }),
  ).not.toBeChecked();
  fillCard();
  await review();
});
test("price change requires an explicit new confirmation", async () => {
  await openSummary();
  jest
    .mocked(transport.api.create)
    .mockRejectedValueOnce(
      new transport.ApiError("PRICE_CHANGED", "Cambió el precio", 409),
    );
  jest.mocked(transport.api.quote).mockResolvedValueOnce({
    ...quote,
    amounts: {
      ...quote.amounts,
      subtotalInCents: 19000000,
      totalInCents: 20450000,
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  expect(
    await screen.findByText(
      "El precio cambió. Revisa el nuevo total antes de confirmar.",
    ),
  ).toBeInTheDocument();
  expect(transport.api.pay).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Pagar.*204/ })).toBeEnabled();
});
test("failed creation keeps idempotency key for explicit retry", async () => {
  const { store } = await openSummary();
  jest
    .mocked(transport.api.create)
    .mockRejectedValueOnce(
      new transport.ApiError("NETWORK_ERROR", "Sin conexión"),
    );
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  await screen.findByText("Sin conexión");
  const key = store.getState().checkout.idempotencyKey;
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  await screen.findByText("Tu luz está en camino.");
  expect(
    jest.mocked(transport.api.create).mock.calls.map((call) => call[2]),
  ).toEqual([key, key]);
});
test("lost creation response recovers the existing transaction without auto charging", async () => {
  await openSummary();
  const reservedDraft = {
    ...draft,
    customer: { ...draft.customer, fullName: "Destinatario de la reserva" },
    delivery: { ...draft.delivery, addressLine1: "Calle de la reserva 17" },
  };
  jest
    .mocked(transport.api.create)
    .mockRejectedValueOnce(new Error("Respuesta perdida"));
  jest.mocked(transport.api.session).mockResolvedValueOnce({
    ...session,
    draft: reservedDraft,
    activeTransactionId: transaction.id,
  });
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  await screen.findByText("Tu pedido está reservado.");
  expect(transport.api.pay).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Completar pago" }));
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue("");
  expect(screen.queryByLabelText("Dirección")).not.toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /Acepto los/ }),
  ).not.toBeChecked();
  expect(
    screen.getByRole("checkbox", { name: /Autorizo el/ }),
  ).not.toBeChecked();
  fillCard();
  await review();
  expect(screen.getByText(reservedDraft.customer.fullName)).toBeInTheDocument();
  expect(
    screen.getByText(reservedDraft.delivery.addressLine1, { exact: false }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  await screen.findByText("Tu luz está en camino.");
  expect(transport.api.create).toHaveBeenCalledTimes(1);
});
test("tokenization failure does not send payment and leaves reserved order resumable", async () => {
  await openSummary();
  jest
    .mocked(transport.tokenize)
    .mockRejectedValueOnce(new Error("Tarjeta no válida"));
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  expect(await screen.findByText("Tarjeta no válida")).toBeInTheDocument();
  expect(transport.api.pay).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Completar pago" }));
  expect(screen.getByLabelText("Número de tarjeta")).toHaveValue("");
  fireEvent.click(
    screen.getByRole("button", { name: "Volver al estado del pedido" }),
  );
  expect(screen.getByText("Tu pedido está reservado.")).toBeInTheDocument();
});
test("ambiguous payment transport failure keeps pending and prevents an automatic second payment", async () => {
  await openSummary();
  jest
    .mocked(transport.api.pay)
    .mockRejectedValueOnce(new Error("Respuesta incierta"));
  jest.mocked(transport.api.transaction).mockResolvedValue({
    ...transaction,
    canPay: false,
    submissionStatus: "UNKNOWN",
  });
  fireEvent.click(screen.getByRole("button", { name: /Pagar.*203/ }));
  await waitFor(() => expect(transport.api.transaction).toHaveBeenCalled());
  expect(
    screen.getByRole("heading", { name: "Estamos confirmando tu pago." }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Completar pago" }),
  ).not.toBeInTheDocument();
  expect(transport.api.pay).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Consultar estado" }));
  await waitFor(() => expect(transport.api.transaction).toHaveBeenCalled());
});
test.each([
  ["DECLINED", "El pago fue rechazado."],
  ["ERROR", "No se completó el pago."],
  ["VOIDED", "El pago fue anulado."],
] as const)("terminal %s is never labeled approved", async (status, title) => {
  mount(
    readyState({
      draft,
      step: "RESULT",
      transaction: { ...transaction, status, canPay: false },
    }),
  );
  await act(async () => {});
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Volver al producto" }),
  ).toBeEnabled();
});
test("pending refresh presents only status consultation, then a server approval", async () => {
  jest.mocked(transport.api.transaction).mockResolvedValue(approved);
  mount(
    readyState({
      draft,
      step: "RESULT",
      transaction: {
        ...transaction,
        canPay: false,
        submissionStatus: "SUBMITTED",
      },
    }),
  );
  expect(
    screen.queryByRole("button", { name: "Completar pago" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Consultar estado" }));
  await screen.findByText("Tu luz está en camino.");
  expect(transport.api.pay).not.toHaveBeenCalled();
});
test("failed stock refresh keeps the receipt available", async () => {
  jest
    .mocked(transport.api.clearDraft)
    .mockRejectedValueOnce(new Error("Network"));
  mount(readyState({ draft, step: "RESULT", transaction: approved }));
  fireEvent.click(screen.getByRole("button", { name: "Volver al producto" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByText("LUM-FIXTURE")).toBeInTheDocument();
});
test("late config response after closing cannot reopen checkout", async () => {
  let resolve!: (value: typeof config) => void;
  jest.mocked(transport.api.config).mockImplementationOnce(
    () =>
      new Promise((res) => {
        resolve = res;
      }),
  );
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Pagar con tarjeta" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Cerrar formulario de pago" }),
  );
  await act(async () => {
    resolve(config);
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
