import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { api, ApiError, errorMessage, tokenize } from "./api";
import {
  Alert,
  BrandLogo,
  Dialog,
  Icon,
  PriceBreakdown,
  ProductImage,
} from "./components";
import {
  actions,
  persistDraft,
  returnToProduct,
  useAppDispatch,
  useCheckout,
} from "./store";
import type { CardInput, CheckoutConfig, Transaction } from "./types";
import {
  cardBrand,
  digits,
  formatCardNumber,
  formatExpiry,
  money,
  validateCard,
  validateDraft,
} from "./validation";
import { usePolling } from "./usePolling";

const emptyCard = (): CardInput => ({
  number: "",
  holder: "",
  expiry: "",
  cvc: "",
  installments: "1",
});
function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={input.name}>{label}</label>
      <input
        {...input}
        id={input.name}
        aria-invalid={!!error}
        aria-describedby={
          error
            ? `${input.name}-error`
            : hint
              ? `${input.name}-hint`
              : undefined
        }
      />
      {hint && !error && <small id={`${input.name}-hint`}>{hint}</small>}
      {error && (
        <small id={`${input.name}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}

const resultLabels = {
  APPROVED: "Tu luz está en camino.",
  DECLINED: "El pago fue rechazado.",
  ERROR: "No se completó el pago.",
  VOIDED: "El pago fue anulado.",
  PENDING: "Estamos confirmando tu pago.",
};

export function Checkout() {
  const state = useCheckout();
  const { draft, quote, transaction, step, error, notice } = state;
  const dispatch = useAppDispatch();
  const [card, setCard] = useState<CardInput>(emptyCard);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [terms, setTerms] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const form = useRef<HTMLFormElement>(null);
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const next = await api.config();
      if (mounted.current) setConfig(next);
    } catch (failure) {
      if (mounted.current) setConfigError(errorMessage(failure));
    } finally {
      if (mounted.current) setConfigLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void loadConfig();
    return () => {
      mounted.current = false;
    };
  }, [loadConfig]);
  useEffect(() => {
    if (!draft || transaction || step !== "DETAILS") return;
    const timer = setTimeout(() => {
      void dispatch(persistDraft(draft));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, transaction, step, dispatch]);

  const receive = useCallback(
    (next: Transaction) => {
      // Do not push a user out of the form while re-entering a card for an unsent payment.
      if (next.canPay && (step === "DETAILS" || step === "SUMMARY")) return;
      dispatch(actions.receivedTransaction(next));
      setUncertain(false);
    },
    [dispatch, step],
  );
  const pollError = useCallback(
    (message: string) => {
      dispatch(actions.showError(message));
    },
    [dispatch],
  );
  const polling = usePolling(transaction, receive, pollError);

  const close = () => {
    if (submitting.current) return;
    if (transaction) dispatch(actions.setStep("RESULT"));
    else {
      if (draft) void dispatch(persistDraft(draft));
      dispatch(actions.setStep("PRODUCT"));
    }
  };
  const allErrors = (): Record<string, string> => ({
    ...validateCard(card),
    ...(!transaction && draft ? validateDraft(draft) : {}),
    ...(!terms ? { terms: "Debes aceptar los términos para continuar." } : {}),
    ...(!personal
      ? { personal: "Debes autorizar el tratamiento de datos para continuar." }
      : {}),
  });
  const blur = (name: string) => {
    const current = allErrors();
    setErrors((previous) => ({ ...previous, [name]: current[name] }));
  };
  const updateCard = (name: keyof CardInput, value: string) => {
    const next = { ...card, [name]: value };
    setCard(next);
    if (errors[name])
      setErrors((previous) => ({
        ...previous,
        [name]: validateCard(next)[name],
      }));
  };

  async function review(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !draft) return;
    const invalid = allErrors();
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      dispatch(actions.showError("Revisa los campos marcados."));
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    if (!config) {
      dispatch(
        actions.showError(
          "El proveedor de pruebas no está disponible. Vuelve a intentar la conexión.",
        ),
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    dispatch(actions.showError(null));
    try {
      if (!transaction)
        await dispatch(persistDraft({ ...draft, step: "SUMMARY" })).unwrap();
      const next = transaction
        ? {
            productId: transaction.product.id,
            quantity: 1 as const,
            amounts: transaction.amounts,
          }
        : await api.quote(draft.productId);
      dispatch(actions.review(next));
    } catch (failure) {
      dispatch(actions.showError(errorMessage(failure)));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function pay() {
    if (submitting.current || !draft || !quote || !config) return;
    if (Object.keys(allErrors()).length) {
      dispatch(actions.setStep("DETAILS"));
      dispatch(
        actions.showError(
          "Por seguridad, vuelve a ingresar la tarjeta y tus aceptaciones.",
        ),
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    dispatch(actions.showError(null));
    let active = transaction;
    let paymentSent = false;
    try {
      if (!active) {
        const key = state.idempotencyKey ?? crypto.randomUUID();
        dispatch(actions.rememberKey(key));
        active = await api.create(draft, quote.amounts.totalInCents, key);
        dispatch(actions.receivedTransaction(active));
      }
      if (!active.canPay) {
        dispatch(actions.receivedTransaction(active));
        return;
      }
      const token = await tokenize(card, config);
      const installments = Number(card.installments);
      setCard(emptyCard());
      paymentSent = true;
      setUncertain(true);
      const result = await api.pay(active.id, token, installments, config);
      dispatch(actions.receivedTransaction(result));
      setUncertain(false);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "PRICE_CHANGED") {
        try {
          dispatch(actions.review(await api.quote(draft.productId)));
          dispatch(
            actions.showError(
              "El precio cambió. Revisa el nuevo total antes de confirmar.",
            ),
          );
        } catch (quoteFailure) {
          dispatch(actions.showError(errorMessage(quoteFailure)));
        }
      } else if (paymentSent) {
        dispatch(
          actions.showNotice(
            "Estamos confirmando el pago. No necesitas pagarlo de nuevo.",
          ),
        );
        dispatch(actions.showError(errorMessage(failure)));
        polling.restart();
      } else if (active) {
        setCard(emptyCard());
        dispatch(actions.showError(errorMessage(failure)));
      } else {
        // A lost creation response is resolved from the session; keep the same key on failure.
        try {
          const session = await api.session();
          if (session.activeTransactionId) {
            const recovered = await api.transaction(
              session.activeTransactionId,
            );
            dispatch(actions.receivedTransaction(recovered));
            setCard(emptyCard());
          }
        } catch {
          /* The retained idempotency key makes an explicit retry safe. */
        }
        dispatch(actions.showError(errorMessage(failure)));
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function finish() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    await dispatch(returnToProduct());
    submitting.current = false;
    if (mounted.current) setBusy(false);
  }
  const product =
    state.products.find((item) => item.id === draft?.productId) ??
    state.products[0];
  const title =
    step === "DETAILS"
      ? "Completa tus datos."
      : step === "SUMMARY"
        ? "Un último vistazo."
        : transaction
          ? transaction.canPay && !uncertain
            ? "Tu pedido está reservado."
            : resultLabels[transaction.status]
          : "Procesando tu compra.";
  const banner = (
    <>
      {notice && <Alert tone="info">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
    </>
  );
  const edit = () => {
    dispatch(actions.setStep("DETAILS"));
    dispatch(actions.showError(null));
  };

  return (
    <Dialog
      title={title}
      step={step}
      onClose={step !== "RESULT" ? close : undefined}
      locked={busy}
    >
      {step === "DETAILS" && (
        <>
          <p className="dialog-intro">
            Revisa el resumen antes de confirmar el pago. Todos los campos son
            obligatorios salvo donde se indica.
          </p>
          {banner}
          {configLoading && (
            <p className="muted" role="status">
              Conectando con el proveedor de pruebas…
            </p>
          )}
          {configError && (
            <Alert>
              {configError}
              <button
                className="text-button"
                type="button"
                onClick={() => void loadConfig()}
              >
                Volver a conectar
              </button>
            </Alert>
          )}
          <form ref={form} onSubmit={review} noValidate>
            <fieldset disabled={busy}>
              <legend>
                <span className="section-number">01</span> Tu tarjeta
              </legend>
              <div className="card-field">
                <Field
                  name="number"
                  label="Número de tarjeta"
                  value={card.number}
                  onChange={(event) =>
                    updateCard("number", formatCardNumber(event.target.value))
                  }
                  onBlur={() => blur("number")}
                  error={errors.number}
                  autoComplete="cc-number"
                  inputMode="numeric"
                  maxLength={23}
                  placeholder="0000 0000 0000 0000"
                />
                <div className="card-brand" aria-live="polite">
                  <BrandLogo brand={cardBrand(card.number)} />
                </div>
              </div>
              <Field
                name="holder"
                label="Nombre del titular"
                value={card.holder}
                onChange={(event) => updateCard("holder", event.target.value)}
                onBlur={() => blur("holder")}
                error={errors.holder}
                autoComplete="cc-name"
                maxLength={100}
              />
              <div className="field-row">
                <Field
                  name="expiry"
                  label="Vencimiento"
                  value={card.expiry}
                  onChange={(event) =>
                    updateCard("expiry", formatExpiry(event.target.value))
                  }
                  onBlur={() => blur("expiry")}
                  error={errors.expiry}
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="MM/AA"
                />
                <Field
                  name="cvc"
                  label="Código de seguridad"
                  value={card.cvc}
                  onChange={(event) =>
                    updateCard("cvc", digits(event.target.value).slice(0, 3))
                  }
                  onBlur={() => blur("cvc")}
                  error={errors.cvc}
                  type="password"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  maxLength={3}
                  hint="3 dígitos al reverso"
                />
              </div>
              <div className="field">
                <label htmlFor="installments">Número de cuotas</label>
                <select
                  id="installments"
                  name="installments"
                  value={card.installments}
                  onChange={(event) =>
                    updateCard("installments", event.target.value)
                  }
                >
                  {Array.from({ length: 36 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? "cuota" : "cuotas"}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
            {!transaction && draft && (
              <fieldset disabled={busy}>
                <legend>
                  <span className="section-number">02</span> Datos de entrega
                </legend>
                {(
                  [
                    {
                      name: "fullName",
                      label: "Nombre de quien recibe",
                      group: "customer",
                      autoComplete: "name",
                      maxLength: 100,
                    },
                    {
                      name: "email",
                      label: "Correo electrónico",
                      group: "customer",
                      autoComplete: "email",
                      type: "email",
                      maxLength: 254,
                    },
                    {
                      name: "phone",
                      label: "Teléfono",
                      group: "customer",
                      autoComplete: "tel",
                      type: "tel",
                      maxLength: 20,
                    },
                    {
                      name: "addressLine1",
                      label: "Dirección",
                      group: "delivery",
                      autoComplete: "address-line1",
                      maxLength: 160,
                    },
                    {
                      name: "addressLine2",
                      label: "Complemento (opcional)",
                      group: "delivery",
                      autoComplete: "address-line2",
                      maxLength: 100,
                    },
                    {
                      name: "city",
                      label: "Ciudad",
                      group: "delivery",
                      autoComplete: "address-level2",
                      maxLength: 80,
                    },
                    {
                      name: "region",
                      label: "Departamento",
                      group: "delivery",
                      autoComplete: "address-level1",
                      maxLength: 80,
                    },
                  ] as const
                ).map(({ name, label, group, ...attributes }) => (
                  <Field
                    key={name}
                    name={name}
                    label={label}
                    {...attributes}
                    value={(draft[group] as Record<string, string>)[name] ?? ""}
                    error={errors[name]}
                    onBlur={() => blur(name)}
                    onChange={(event) => {
                      dispatch(
                        actions.updateDraft({
                          group,
                          field: name,
                          value: event.target.value,
                        }),
                      );
                      if (errors[name])
                        setErrors((previous) => ({
                          ...previous,
                          [name]: validateDraft({
                            ...draft,
                            [group]: {
                              ...draft[group],
                              [name]: event.target.value,
                            },
                          })[name],
                        }));
                    }}
                  />
                ))}
                <p className="field-note">Destino: Colombia</p>
              </fieldset>
            )}
            {transaction && (
              <p className="field-note">
                La entrega corresponde a los datos de tu pedido reservado.
                Ingresa la tarjeta para completar este mismo pedido.
              </p>
            )}
            <fieldset className="consents" disabled={busy || !config}>
              <legend className="sr-only">Aceptaciones de pago</legend>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="terms"
                  checked={terms}
                  onChange={(event) => {
                    setTerms(event.target.checked);
                    setErrors((previous) => ({ ...previous, terms: "" }));
                  }}
                  aria-invalid={!!errors.terms}
                  aria-describedby={errors.terms ? "terms-error" : undefined}
                />
                <span>
                  Acepto los{" "}
                  {config ? (
                    <a
                      href={config.acceptance.terms.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      términos y condiciones del proveedor
                      <span className="sr-only"> (abre una pestaña nueva)</span>
                    </a>
                  ) : (
                    "términos y condiciones del proveedor"
                  )}
                  .
                </span>
              </label>
              {errors.terms && (
                <small id="terms-error" className="field-error">
                  {errors.terms}
                </small>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="personal"
                  checked={personal}
                  onChange={(event) => {
                    setPersonal(event.target.checked);
                    setErrors((previous) => ({ ...previous, personal: "" }));
                  }}
                  aria-invalid={!!errors.personal}
                  aria-describedby={
                    errors.personal ? "personal-error" : undefined
                  }
                />
                <span>
                  Autorizo el{" "}
                  {config ? (
                    <a
                      href={config.acceptance.personalData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      tratamiento de mis datos personales
                      <span className="sr-only"> (abre una pestaña nueva)</span>
                    </a>
                  ) : (
                    "tratamiento de mis datos personales"
                  )}
                  .
                </span>
              </label>
              {errors.personal && (
                <small id="personal-error" className="field-error">
                  {errors.personal}
                </small>
              )}
            </fieldset>
            {state.saveError && (
              <Alert>
                No pudimos guardar el progreso. Intenta continuar de nuevo para
                guardarlo.
              </Alert>
            )}
            <div className="form-actions">
              <p>El pago se confirma en el siguiente paso.</p>
              <button
                className="button primary"
                type="submit"
                disabled={busy || configLoading || !config}
              >
                {busy ? "Preparando resumen…" : "Continuar al resumen"}
                <Icon name="arrow" />
              </button>
              <button
                className="button text-button"
                type="button"
                disabled={busy}
                onClick={close}
              >
                {transaction
                  ? "Volver al estado del pedido"
                  : "Volver al producto"}
              </button>
              <p className="privacy-note">
                <Icon name="lock" /> La tarjeta permanece fuera de tu progreso
                guardado.
              </p>
            </div>
          </form>
        </>
      )}
      {step === "SUMMARY" && quote && (
        <>
          <p className="dialog-intro">
            Todo en su lugar. Confirma los detalles de tu compra.
          </p>
          {banner}
          <div className="summary-product">
            {product && <ProductImage product={product} thumbnail />}
            <div>
              <span className="eyebrow">LUZ DE ESCRITORIO</span>
              <h3>{product?.name}</h3>
              <p>1 unidad</p>
            </div>
          </div>
          {draft?.customer.fullName && (
            <section className="delivery-summary">
              <div>
                <span className="eyebrow">ENTREGA A</span>
                <strong>{draft.customer.fullName}</strong>
                <p>
                  {draft.delivery.addressLine1}
                  {draft.delivery.addressLine2
                    ? ` · ${draft.delivery.addressLine2}`
                    : ""}
                  <br />
                  {draft.delivery.city}, {draft.delivery.region}
                </p>
                <p>
                  {draft.customer.email}
                  <br />
                  {draft.customer.phone}
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={edit}
                disabled={busy}
              >
                Editar
              </button>
            </section>
          )}
          <div className="payment-summary">
            <BrandLogo brand={cardBrand(card.number)} />
            <span>
              Terminada en {digits(card.number).slice(-4)} · {card.installments}{" "}
              {card.installments === "1" ? "cuota" : "cuotas"}
            </span>
          </div>
          <PriceBreakdown amounts={quote.amounts} />
          <p className="sandbox-note">
            <Icon name="lock" /> Este flujo usa un proveedor de pagos en modo de
            pruebas.
          </p>
          <button
            className="button primary"
            onClick={() => void pay()}
            disabled={busy}
          >
            {busy
              ? "Confirmando…"
              : `Pagar ${money(quote.amounts.totalInCents)}`}
            <Icon name="arrow" />
          </button>
          <button className="button text-button" onClick={edit} disabled={busy}>
            Volver a mis datos
          </button>
        </>
      )}
      {step === "RESULT" && transaction && (
        <>
          <div className={`result-icon ${transaction.status.toLowerCase()}`}>
            <Icon
              name={
                transaction.status === "APPROVED"
                  ? "check"
                  : transaction.status === "PENDING"
                    ? "clock"
                    : "warning"
              }
            />
          </div>
          <p className="dialog-intro">
            {busy
              ? "Estamos procesando tu solicitud. Mantén esta ventana abierta."
              : transaction.canPay && !uncertain
                ? "Aún no hemos enviado el pago. Puedes completar este pedido con tu tarjeta."
                : transaction.statusMessage}
          </p>
          {banner}
          <dl className="receipt">
            <div>
              <dt>Referencia</dt>
              <dd>{transaction.reference}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                {
                  {
                    PENDING: "Pendiente de confirmación",
                    APPROVED: "Aprobado",
                    DECLINED: "Rechazado",
                    ERROR: "No completado",
                    VOIDED: "Anulado",
                  }[transaction.status]
                }
              </dd>
            </div>
            <div>
              <dt>Producto</dt>
              <dd>{transaction.product.name} · 1 unidad</dd>
            </div>
            {transaction.card && (
              <div>
                <dt>Medio de pago</dt>
                <dd>
                  {transaction.card.brand} · {transaction.card.lastFour}
                </dd>
              </div>
            )}
            {transaction.delivery && (
              <div>
                <dt>Entrega</dt>
                <dd>Preparada · {transaction.delivery.city}</dd>
              </div>
            )}
          </dl>
          <PriceBreakdown amounts={transaction.amounts} />
          {transaction.status === "PENDING" ? (
            <>
              <p className="pending-note">
                {polling.exhausted
                  ? "La confirmación está tardando más de lo habitual. Tu pedido sigue pendiente; puedes consultar su estado."
                  : "Consultaremos el estado de tu pedido. Puedes recargar esta página sin iniciar otra compra."}
              </p>
              {transaction.canPay && !uncertain && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={edit}
                >
                  Completar pago
                  <Icon name="arrow" />
                </button>
              )}
              <button
                className="button secondary"
                disabled={busy}
                onClick={polling.restart}
              >
                Consultar estado
              </button>
            </>
          ) : (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void finish()}
            >
              {busy ? "Actualizando disponibilidad…" : "Volver al producto"}
              <Icon name="arrow" />
            </button>
          )}
          <p className="result-footnote">Compra de prueba · entorno sandbox</p>
        </>
      )}
    </Dialog>
  );
}
