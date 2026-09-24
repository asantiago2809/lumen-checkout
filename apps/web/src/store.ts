import {
  configureStore,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { api, errorMessage, readPointer, writePointer } from "./api";
import type { Draft, Product, Quote, Step, Transaction } from "./types";

export type CheckoutState = {
  products: Product[];
  draft: Draft | null;
  quote: Quote | null;
  transaction: Transaction | null;
  step: Step;
  loading: "idle" | "loading" | "ready" | "failed";
  error: string | null;
  notice: string | null;
  idempotencyKey: string | null;
  saving: boolean;
  pendingSaveCount: number;
  savedDraft: Draft | null;
  saveError: string | null;
};
const initialState: CheckoutState = {
  products: [],
  draft: null,
  quote: null,
  transaction: null,
  step: "PRODUCT",
  loading: "idle",
  error: null,
  notice: null,
  idempotencyKey: null,
  saving: false,
  pendingSaveCount: 0,
  savedDraft: null,
  saveError: null,
};

// Only delivery progress is compared: card inputs never enter Redux or storage.
function draftContent(draft: Draft | null) {
  return (
    draft &&
    JSON.stringify([
      draft.productId,
      draft.quantity,
      draft.customer.fullName,
      draft.customer.email,
      draft.customer.phone,
      draft.delivery.addressLine1,
      draft.delivery.addressLine2 ?? "",
      draft.delivery.city,
      draft.delivery.region,
      draft.delivery.country,
      draft.delivery.postalCode ?? "",
    ])
  );
}
export function draftSaveStatus(state: CheckoutState) {
  if (state.saving) return "saving";
  if (state.saveError) return "error";
  return state.draft &&
    draftContent(state.draft) === draftContent(state.savedDraft)
    ? "saved"
    : "pending";
}

export const initialize = createAsyncThunk(
  "checkout/initialize",
  async () => {
    const [products, session] = await Promise.all([
      api.products(),
      api.session(),
    ]);
    const pointer = readPointer();
    const transaction = session.activeTransactionId
      ? await api.transaction(session.activeTransactionId)
      : null;
    return { products, session, transaction, pointer };
  },
  {
    condition: (_, { getState }) =>
      (getState() as { checkout: CheckoutState }).checkout.loading !==
      "loading",
  },
);

// Serialize draft writes; later edits cannot be replaced by a slower old request.
let pendingSave: Promise<unknown> = Promise.resolve();
export const persistDraft = createAsyncThunk(
  "checkout/save",
  async (draft: Draft) => {
    const saved = pendingSave
      .catch(() => undefined)
      .then(() => api.saveDraft(draft));
    pendingSave = saved;
    await saved;
  },
);
export const returnToProduct = createAsyncThunk("checkout/return", async () => {
  await pendingSave.catch(() => undefined);
  await api.clearDraft();
  return api.products();
});

const slice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    openDetails(state, action: PayloadAction<string>) {
      state.step = "DETAILS";
      state.error = null;
      if (state.draft?.productId !== action.payload)
        state.draft = {
          productId: action.payload,
          quantity: 1,
          step: "DETAILS",
          customer: {},
          delivery: { country: "CO" },
        };
    },
    updateDraft(
      state,
      action: PayloadAction<{
        group: "customer" | "delivery";
        field: string;
        value: string;
      }>,
    ) {
      if (!state.draft) return;
      const { group, field, value } = action.payload;
      (state.draft[group] as Record<string, string>)[field] = value;
    },
    setStep(state, action: PayloadAction<Step>) {
      state.step = action.payload;
      state.error = null;
    },
    review(state, action: PayloadAction<Quote>) {
      state.quote = action.payload;
      state.step = "SUMMARY";
      if (state.draft) state.draft.step = "SUMMARY";
      state.error = null;
    },
    receivedTransaction(state, action: PayloadAction<Transaction>) {
      if (state.transaction && state.transaction.id !== action.payload.id)
        return;
      state.transaction = action.payload;
      state.step = "RESULT";
      state.error = null;
      state.notice = null;
    },
    recoveredCheckout(
      state,
      action: PayloadAction<{ transaction: Transaction; draft: Draft | null }>,
    ) {
      // Recovery can find a reservation created by another tab. Its recipient
      // and delivery must replace this tab's stale draft together with the ID.
      state.transaction = action.payload.transaction;
      state.draft = action.payload.draft;
      state.savedDraft = action.payload.draft;
      state.saveError = null;
      state.quote = null;
      state.step = "RESULT";
      state.error = null;
      state.notice = null;
    },
    rememberKey(state, action: PayloadAction<string>) {
      state.idempotencyKey = action.payload;
    },
    showError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    showNotice(state, action: PayloadAction<string | null>) {
      state.notice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initialize.pending, (state) => {
      state.loading = "loading";
      state.error = null;
    });
    builder.addCase(initialize.fulfilled, (state, { payload }) => {
      state.loading = "ready";
      state.products = payload.products;
      state.draft = payload.session.draft;
      state.savedDraft = payload.session.draft;
      state.saveError = null;
      state.transaction = payload.transaction;
      state.idempotencyKey = payload.pointer?.idempotencyKey ?? null;
      if (payload.transaction) state.step = "RESULT";
      else if (payload.session.draft && payload.pointer?.step !== "PRODUCT") {
        state.step = "DETAILS";
        state.notice =
          "Recuperamos tus datos de entrega. Por seguridad, vuelve a ingresar la tarjeta y tus aceptaciones.";
      } else {
        state.step = "PRODUCT";
        state.idempotencyKey = null;
      }
      if (
        !payload.session.draft &&
        !payload.transaction &&
        payload.pointer &&
        payload.pointer.step !== "PRODUCT"
      )
        state.notice =
          "La sesión anterior ya no está disponible. Puedes iniciar una nueva compra.";
    });
    builder.addCase(initialize.rejected, (state, action) => {
      state.loading = "failed";
      state.error = action.error.message ?? "No pudimos cargar el producto.";
    });
    builder.addCase(persistDraft.pending, (state) => {
      state.pendingSaveCount += 1;
      state.saving = true;
      state.saveError = null;
    });
    builder.addCase(persistDraft.fulfilled, (state, action) => {
      state.pendingSaveCount = Math.max(0, state.pendingSaveCount - 1);
      state.saving = state.pendingSaveCount > 0;
      state.savedDraft = action.meta.arg;
      state.saveError = null;
    });
    builder.addCase(persistDraft.rejected, (state, action) => {
      state.pendingSaveCount = Math.max(0, state.pendingSaveCount - 1);
      state.saving = state.pendingSaveCount > 0;
      state.saveError = action.error.message ?? "No pudimos guardar tus datos.";
    });
    builder.addCase(returnToProduct.fulfilled, (state, action) => {
      Object.assign(state, initialState, {
        products: action.payload,
        loading: "ready",
      });
    });
    builder.addCase(returnToProduct.rejected, (state, action) => {
      state.error = errorMessage(action.error);
    });
  },
});
export const actions = slice.actions;
export const checkoutReducer = slice.reducer;
export function makeStore(preloadedState?: CheckoutState) {
  const store = configureStore({
    reducer: { checkout: slice.reducer },
    ...(preloadedState ? { preloadedState: { checkout: preloadedState } } : {}),
    devTools: false,
  });
  store.subscribe(() => {
    const state = store.getState().checkout;
    if (state.loading === "ready")
      writePointer({
        version: 1,
        productId: state.draft?.productId ?? state.products[0]?.id ?? null,
        step: state.step,
        transactionId: state.transaction?.id ?? null,
        idempotencyKey: state.idempotencyKey,
      });
  });
  return store;
}
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export const useAppDispatch = useDispatch.withTypes<AppStore["dispatch"]>();
export const useCheckout = () =>
  useSelector((state: RootState) => state.checkout);
