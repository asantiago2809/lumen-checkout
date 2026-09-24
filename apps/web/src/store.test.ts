import { api } from "./api";
import {
  actions,
  checkoutReducer,
  draftSaveStatus,
  initialize,
  makeStore,
  persistDraft,
  returnToProduct,
} from "./store";
import {
  approved,
  draft,
  product,
  quote,
  readyState,
  session,
  transaction,
} from "./test/fixtures";

beforeEach(() => {
  jest.restoreAllMocks();
});
test("reducers maintain the five-step flow with safe state only", () => {
  let state = checkoutReducer(undefined, { type: "unknown" });
  state = checkoutReducer(
    state,
    actions.updateDraft({
      group: "customer",
      field: "email",
      value: "ignored",
    }),
  );
  expect(state.draft).toBeNull();
  state = checkoutReducer(state, actions.openDetails(product.id));
  expect(state.step).toBe("DETAILS");
  state = checkoutReducer(
    state,
    actions.updateDraft({
      group: "customer",
      field: "fullName",
      value: "Demo",
    }),
  );
  state = checkoutReducer(
    state,
    actions.updateDraft({ group: "delivery", field: "city", value: "Bogotá" }),
  );
  state = checkoutReducer(state, actions.openDetails(product.id));
  expect(state.draft?.customer.fullName).toBe("Demo");
  state = checkoutReducer(state, actions.review(quote));
  expect(state.step).toBe("SUMMARY");
  state = checkoutReducer(state, actions.rememberKey("stable"));
  state = checkoutReducer(state, actions.receivedTransaction(transaction));
  expect(state.step).toBe("RESULT");
  state = checkoutReducer(
    state,
    actions.receivedTransaction({ ...approved, id: "late-other-transaction" }),
  );
  expect(state.transaction?.status).toBe("PENDING");
  state = checkoutReducer(state, actions.receivedTransaction(approved));
  expect(state.transaction?.status).toBe("APPROVED");
  state = checkoutReducer(state, actions.showError("An error"));
  state = checkoutReducer(state, actions.showNotice("A notice"));
  expect(state.error).toBe("An error");
  state = checkoutReducer(state, actions.setStep("PRODUCT"));
  expect(state.error).toBeNull();
  expect(state.step).toBe("PRODUCT");
  expect(checkoutReducer(readyState(), actions.review(quote)).quote).toEqual(
    quote,
  );
});
test("bootstrap loads products and recovers draft, never card", async () => {
  jest.spyOn(api, "products").mockResolvedValue([product]);
  jest.spyOn(api, "session").mockResolvedValue({ ...session, draft });
  const store = makeStore();
  await store.dispatch(initialize());
  expect(store.getState().checkout.step).toBe("DETAILS");
  expect(store.getState().checkout.notice).toContain("tarjeta");
  const persisted = JSON.parse(localStorage.getItem("lumen.checkout.v1")!);
  expect(Object.keys(persisted).sort()).toEqual([
    "idempotencyKey",
    "productId",
    "step",
    "transactionId",
    "version",
  ]);
  expect(JSON.stringify(persisted)).not.toContain(draft.customer.email);
});
test("recovers authoritative transaction even if pointer differs", async () => {
  jest.spyOn(api, "products").mockResolvedValue([product]);
  jest.spyOn(api, "session").mockResolvedValue({
    ...session,
    draft,
    activeTransactionId: transaction.id,
  });
  jest.spyOn(api, "transaction").mockResolvedValue(transaction);
  localStorage.setItem(
    "lumen.checkout.v1",
    JSON.stringify({
      version: 1,
      productId: product.id,
      step: "SUMMARY",
      transactionId: "stale",
      idempotencyKey: "retained",
    }),
  );
  const store = makeStore();
  await store.dispatch(initialize());
  expect(store.getState().checkout.transaction).toEqual(transaction);
  expect(store.getState().checkout.idempotencyKey).toBe("retained");
});
test("session expiration clears stale progress and explains recovery", async () => {
  jest.spyOn(api, "products").mockResolvedValue([]);
  jest.spyOn(api, "session").mockResolvedValue(session);
  localStorage.setItem(
    "lumen.checkout.v1",
    JSON.stringify({
      version: 1,
      productId: product.id,
      step: "SUMMARY",
      transactionId: null,
      idempotencyKey: null,
    }),
  );
  const store = makeStore();
  await store.dispatch(initialize());
  expect(store.getState().checkout.notice).toContain("anterior");
  expect(store.getState().checkout.step).toBe("PRODUCT");
});
test("initializes product on ordinary reload without reopening a dismissed form", async () => {
  jest.spyOn(api, "products").mockResolvedValue([product]);
  jest.spyOn(api, "session").mockResolvedValue({ ...session, draft });
  localStorage.setItem(
    "lumen.checkout.v1",
    JSON.stringify({
      version: 1,
      productId: product.id,
      step: "PRODUCT",
      transactionId: null,
      idempotencyKey: null,
    }),
  );
  const store = makeStore();
  await store.dispatch(initialize());
  expect(store.getState().checkout.step).toBe("PRODUCT");
});
test("prevents concurrent bootstraps and surfaces failures", async () => {
  jest.spyOn(api, "products").mockRejectedValue(new Error("No connection"));
  jest.spyOn(api, "session").mockResolvedValue(session);
  const store = makeStore();
  await Promise.all([
    store.dispatch(initialize()),
    store.dispatch(initialize()),
  ]);
  expect(api.products).toHaveBeenCalledTimes(1);
  expect(store.getState().checkout.loading).toBe("failed");
  expect(
    checkoutReducer(readyState(), {
      ...initialize.rejected(null, "id"),
      error: {},
    }).error,
  ).toBe("No pudimos cargar el producto.");
});
test("draft writes are ordered and failures do not erase a newer edit", async () => {
  const save = jest
    .spyOn(api, "saveDraft")
    .mockRejectedValueOnce(new Error("Disconnected"))
    .mockResolvedValue({ draft });
  const store = makeStore(readyState({ draft }));
  await store.dispatch(persistDraft(draft));
  expect(store.getState().checkout.saveError).toBe("Disconnected");
  await store.dispatch(
    persistDraft({ ...draft, customer: { fullName: "New name" } }),
  );
  expect(save).toHaveBeenCalledTimes(2);
  expect(store.getState().checkout.saveError).toBeNull();
  expect(
    checkoutReducer(readyState(), {
      ...persistDraft.rejected(null, "id", draft),
      error: {},
    }).saveError,
  ).toBe("No pudimos guardar tus datos.");
});
test("return clears server draft then refreshes stock, failure preserves the result", async () => {
  const clear = jest.spyOn(api, "clearDraft").mockResolvedValue();
  jest.spyOn(api, "products").mockResolvedValue([{ ...product, stock: 11 }]);
  const store = makeStore(
    readyState({ transaction: approved, step: "RESULT", draft }),
  );
  clear.mockRejectedValueOnce(new Error("Network"));
  await store.dispatch(returnToProduct());
  expect(store.getState().checkout.transaction).toEqual(approved);
  await store.dispatch(returnToProduct());
  expect(store.getState().checkout.products[0].stock).toBe(11);
  expect(store.getState().checkout.transaction).toBeNull();
  expect(store.getState().checkout.step).toBe("PRODUCT");
});

test("only the last confirmed delivery snapshot is saved while writes are queued", async () => {
  const resolvers: Array<() => void> = [];
  const save = jest.spyOn(api, "saveDraft").mockImplementation(
    (value) =>
      new Promise((resolve) => {
        resolvers.push(() => resolve({ draft: value }));
      }),
  );
  const store = makeStore(readyState({ draft, savedDraft: draft }));
  expect(draftSaveStatus(store.getState().checkout)).toBe("saved");
  store.dispatch(
    actions.updateDraft({
      group: "customer",
      field: "fullName",
      value: "First edit",
    }),
  );
  expect(draftSaveStatus(store.getState().checkout)).toBe("pending");
  const first = store.dispatch(persistDraft(store.getState().checkout.draft!));
  await Promise.resolve();
  await Promise.resolve();
  store.dispatch(
    actions.updateDraft({
      group: "customer",
      field: "fullName",
      value: "Latest edit",
    }),
  );
  const latest = store.dispatch(persistDraft(store.getState().checkout.draft!));
  expect(store.getState().checkout.pendingSaveCount).toBe(2);
  expect(save).toHaveBeenCalledTimes(1);
  resolvers[0]();
  await first;
  expect(draftSaveStatus(store.getState().checkout)).toBe("saving");
  expect(store.getState().checkout.pendingSaveCount).toBe(1);
  expect(store.getState().checkout.savedDraft?.customer.fullName).toBe(
    "First edit",
  );
  resolvers[1]();
  await latest;
  expect(draftSaveStatus(store.getState().checkout)).toBe("saved");
  expect(store.getState().checkout.savedDraft?.customer.fullName).toBe(
    "Latest edit",
  );
  expect(store.getState().checkout.pendingSaveCount).toBe(0);
});

test("a response to an older edit cannot mark newer debounced changes as saved", async () => {
  let resolve!: () => void;
  jest.spyOn(api, "saveDraft").mockImplementation(
    (value) =>
      new Promise((done) => {
        resolve = () => done({ draft: value });
      }),
  );
  const store = makeStore(readyState({ draft }));
  const first = store.dispatch(persistDraft(draft));
  await Promise.resolve();
  await Promise.resolve();
  store.dispatch(
    actions.updateDraft({
      group: "delivery",
      field: "city",
      value: "Medellín",
    }),
  );
  resolve();
  await first;
  expect(draftSaveStatus(store.getState().checkout)).toBe("pending");
  expect(store.getState().checkout.draft?.delivery.city).toBe("Medellín");
  expect(store.getState().checkout.savedDraft?.delivery.city).toBe(
    draft.delivery.city,
  );
});

test("failed save retains its edits and a successful retry confirms them", async () => {
  jest
    .spyOn(api, "saveDraft")
    .mockRejectedValueOnce(new Error("Offline"))
    .mockImplementation(async (value) => ({ draft: value }));
  const store = makeStore(readyState({ draft }));
  await store.dispatch(persistDraft(draft));
  expect(draftSaveStatus(store.getState().checkout)).toBe("error");
  expect(store.getState().checkout.draft).toEqual(draft);
  expect(store.getState().checkout.savedDraft).toBeNull();
  await store.dispatch(persistDraft(draft));
  expect(draftSaveStatus(store.getState().checkout)).toBe("saved");
});
