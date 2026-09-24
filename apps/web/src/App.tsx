import { useEffect, useRef } from "react";
import { Checkout } from "./Checkout";
import { Alert, Icon, ProductImage } from "./components";
import { actions, initialize, useAppDispatch, useCheckout } from "./store";
import { money } from "./validation";

export function App() {
  const state = useCheckout();
  const dispatch = useAppDispatch();
  const trigger = useRef<HTMLButtonElement>(null);
  const priorStep = useRef(state.step);
  const modal = state.step !== "PRODUCT";
  const product = state.products[0];
  useEffect(() => {
    if (state.loading === "idle") void dispatch(initialize());
  }, [dispatch, state.loading]);
  useEffect(() => {
    if (priorStep.current !== "PRODUCT" && state.step === "PRODUCT")
      trigger.current?.focus();
    priorStep.current = state.step;
  }, [state.step]);
  return (
    <>
      <div className="page" inert={modal}>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <header className="site-header">
          <a className="wordmark" href="/" aria-label="Lumen, inicio">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M3 18a13 13 0 0 1 26 0M9 18a7 7 0 0 1 14 0M16 18v9M9 27h14" />
            </svg>
            lumen<span className="brand-dot">.</span>
          </a>
          <span className="header-caption">
            Objetos para habitar tus ideas.
          </span>
          <span className="sandbox-pill">
            <span />
            Sandbox
          </span>
        </header>
        <main id="main">
          <div className="collection-line">
            <span>LA COLECCIÓN / 01</span>
            <span>Compra de prueba · entorno sandbox</span>
          </div>
          {state.notice && <Alert tone="info">{state.notice}</Alert>}
          {state.loading === "loading" || state.loading === "idle" ? (
            <section className="loading-product" aria-busy="true">
              <div className="skeleton scene-skeleton" />
              <div>
                <div className="skeleton text-skeleton" />
                <div className="skeleton text-skeleton short" />
                <p role="status">Cargando producto…</p>
              </div>
            </section>
          ) : state.loading === "failed" ? (
            <section className="empty-state">
              <Icon name="warning" />
              <h1>No pudimos cargar el producto.</h1>
              <p>{state.error}</p>
              <button
                className="button primary"
                onClick={() => void dispatch(initialize())}
              >
                Volver a intentar
              </button>
            </section>
          ) : !product ? (
            <section className="empty-state">
              <h1>La colección vuelve pronto.</h1>
              <p>No hay productos disponibles en este momento.</p>
              <button
                className="button secondary"
                onClick={() => void dispatch(initialize())}
              >
                Consultar disponibilidad
              </button>
            </section>
          ) : (
            <>
              <section
                className="product-grid"
                aria-labelledby="product-heading"
              >
                <div className="product-heading">
                  <span className="eyebrow">LUZ DE ESCRITORIO</span>
                  <h1 id="product-heading">
                    Una luz para
                    <br /> tus <em>ideas.</em>
                  </h1>
                </div>
                <figure className="product-scene">
                  <div className="scene-label" aria-hidden="true">
                    <span>
                      LUZ, FORMA
                      <br />Y UNA PAUSA.
                    </span>
                    <span>01 / LUMEN</span>
                  </div>
                  <ProductImage product={product} />
                  <figcaption>
                    <span>LA PIEZA</span>
                    <span>
                      {product.name}
                      <span className="decorative-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </span>
                  </figcaption>
                </figure>
                <div className="product-information">
                  <div className="product-title-line">
                    <h2>{product.name}</h2>
                    <span>01</span>
                  </div>
                  <p className="product-description">{product.description}</p>
                  <div className="price-line">
                    <span>{money(product.priceInCents)}</span>
                    <span className="currency">COP</span>
                  </div>
                  <p
                    className={`stock ${product.stock === 0 ? "sold-out" : ""}`}
                  >
                    <span aria-hidden="true" />
                    {product.stock > 0
                      ? `Disponible · ${product.stock} ${product.stock === 1 ? "unidad" : "unidades"}`
                      : "Agotado"}
                  </p>
                  <div className="purchase-actions">
                    <button
                      ref={trigger}
                      className="button primary"
                      disabled={product.stock === 0}
                      onClick={() => dispatch(actions.openDetails(product.id))}
                    >
                      {product.stock === 0
                        ? "Por ahora, agotado"
                        : "Pagar con tarjeta"}
                      <Icon name="arrow" />
                    </button>
                    {product.stock === 0 && (
                      <button
                        className="text-button"
                        onClick={() => void dispatch(initialize())}
                      >
                        Consultar disponibilidad
                      </button>
                    )}
                  </div>
                  <div className="order-note">
                    <Icon name="card" />
                    <div>
                      <strong>Cada detalle, antes de pagar.</strong>
                      <p>
                        Revisa tu producto, el cargo base y el envío en el
                        resumen de compra.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <section className="editorial-note">
                <span className="eyebrow">UN ESPACIO, TUYO.</span>
                <p>
                  Hay ideas que solo necesitan
                  <br /> un poco de <em>luz.</em>
                </p>
                <span className="note-symbol" aria-hidden="true">
                  ✳
                </span>
              </section>
            </>
          )}
        </main>
        <footer>
          <span>
            lumen<span className="brand-dot">.</span>
          </span>
          <p>Demostración técnica · pagos en sandbox</p>
          <span>HECHO PARA EXPLORAR.</span>
        </footer>
      </div>
      {modal && <Checkout />}
    </>
  );
}
