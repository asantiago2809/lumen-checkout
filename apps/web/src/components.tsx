import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Amounts, Product } from "./types";
import { money } from "./validation";

export function Icon({
  name,
  className = "",
}: {
  name: "arrow" | "close" | "check" | "clock" | "card" | "lock" | "warning";
  className?: string;
}) {
  const paths = {
    arrow: "M5 12h14m-5-5 5 5-5 5",
    close: "m6 6 12 12M6 18 18 6",
    check: "m5 12 4 4L19 6",
    clock: "M12 7v5l3 2",
    card: "M3 8h18M6 16h4",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M12 14v3",
    warning: "M12 8v5m0 3v.1",
  };
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "clock" && <circle cx="12" cy="12" r="9" />}
      {name === "card" && <rect x="2" y="4" width="20" height="16" rx="3" />}
      {name === "lock" && <rect x="4" y="10" width="16" height="12" rx="3" />}
      {name === "warning" && (
        <path d="m10.3 3.4-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.6l-8-14a2 2 0 0 0-3.4 0Z" />
      )}
      <path d={paths[name]} />
    </svg>
  );
}
export function BrandLogo({ brand }: { brand: string | null }) {
  if (brand?.toLowerCase() === "visa")
    return (
      <svg
        className="brand-logo"
        role="img"
        aria-label="Visa"
        viewBox="0 0 64 32"
      >
        <text
          x="2"
          y="24"
          fill="#1434CB"
          fontSize="25"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          letterSpacing="-1"
        >
          VISA
        </text>
      </svg>
    );
  if (brand?.toLowerCase() === "mastercard")
    return (
      <svg
        className="brand-logo"
        role="img"
        aria-label="Mastercard"
        viewBox="0 0 64 40"
      >
        <circle cx="24" cy="18" r="15" fill="#EB001B" />
        <circle cx="41" cy="18" r="15" fill="#F79E1B" />
        <path
          d="M32.5 5.65a15 15 0 0 1 0 24.7 15 15 0 0 1 0-24.7"
          fill="#FF5F00"
        />
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontSize="7"
          fill="#192A25"
          fontFamily="Arial, sans-serif"
        >
          mastercard
        </text>
      </svg>
    );
  return (
    <span className="unknown-card">
      <Icon name="card" />
      <span>Visa / Mastercard</span>
    </span>
  );
}
export function PriceBreakdown({ amounts }: { amounts: Amounts }) {
  return (
    <dl className="price-breakdown">
      <div>
        <dt>Producto</dt>
        <dd>{money(amounts.subtotalInCents)}</dd>
      </div>
      <div>
        <dt>Cargo base</dt>
        <dd>{money(amounts.baseFeeInCents)}</dd>
      </div>
      <div>
        <dt>Envío</dt>
        <dd>{money(amounts.deliveryFeeInCents)}</dd>
      </div>
      <div className="total">
        <dt>
          Total <span>COP</span>
        </dt>
        <dd>{money(amounts.totalInCents)}</dd>
      </div>
    </dl>
  );
}
export function Alert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "info";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`alert ${tone}`}
    >
      <Icon name={tone === "error" ? "warning" : "lock"} />
      <div>{children}</div>
    </div>
  );
}
export function ProductImage({
  product,
  thumbnail = false,
}: {
  product: Product;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Preserve stock and all product data when an existing local seed has the first illustration URL.
  const imageUrl =
    product.id === "product_lumen_one" && product.imageUrl === "/lumen-lamp.svg"
      ? "/lumen-one-1200.webp"
      : product.imageUrl;
  const responsive = !failed && imageUrl === "/lumen-one-1200.webp";
  return (
    <picture>
      {responsive && (
        <source
          type="image/webp"
          srcSet="/lumen-one-640.webp 640w, /lumen-one-1200.webp 1200w"
          sizes={
            thumbnail
              ? "88px"
              : "(max-width: 767px) calc(100vw - 40px), (max-width: 1440px) 50vw, 640px"
          }
        />
      )}
      <img
        src={failed ? "/lumen-lamp.svg" : imageUrl}
        alt={thumbnail ? "" : product.imageAlt}
        width={thumbnail ? 88 : 1200}
        height={thumbnail ? 88 : 1200}
        fetchPriority={thumbnail ? "auto" : "high"}
        onError={() => {
          if (!failed) setFailed(true);
        }}
      />
    </picture>
  );
}
export function Dialog({
  title,
  step,
  onClose,
  children,
  locked = false,
}: {
  title: string;
  step: string;
  onClose?: () => void;
  children: ReactNode;
  locked?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    titleRef.current?.focus();
    panel.current?.scrollTo?.(0, 0);
  }, [step]);
  return (
    <div className="backdrop">
      <div
        ref={panel}
        className={`dialog dialog-${step.toLowerCase()}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !locked && onClose) {
            event.preventDefault();
            onClose();
          }
          if (event.key !== "Tab") return;
          const focusable = panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          );
          if (!focusable?.length) {
            event.preventDefault();
            return;
          }
          const first = focusable[0],
            last = focusable[focusable.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === titleRef.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="dialog-head">
          <div className="eyebrow">TU COMPRA, PASO A PASO</div>
          {onClose && (
            <button
              className="icon-button"
              aria-label="Cerrar formulario de pago"
              onClick={onClose}
              disabled={locked}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        <ol className="steps" aria-label="Progreso de compra">
          {["DETAILS", "SUMMARY", "RESULT"].map((item, index) => (
            <li key={item} aria-current={step === item ? "step" : undefined}>
              <span>{index + 1}</span>
              {["Datos", "Resumen", "Resultado"][index]}
            </li>
          ))}
        </ol>
        <h2 id="checkout-title" ref={titleRef} tabIndex={-1}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
