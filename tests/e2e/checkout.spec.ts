import AxeBuilder from '@axe-core/playwright';
import { randomInt } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect, customer, delivery, qaProductId } from './server';

// These structurally valid synthetic values never leave intercepted tokenization.
// Real sandbox runs must use separately supplied official sandbox data.
function syntheticCard() {
  const prefix = `4${Array.from({ length: 14 }, () => randomInt(0, 10)).join('')}`;
  let sum = 0;
  [...prefix].forEach((digit, index) => { const value = Number(digit) * (index % 2 === 0 ? 2 : 1); sum += value > 9 ? value - 9 : value; });
  return prefix + ((10 - sum % 10) % 10);
}

async function openCheckout(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lumen One', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
  await expect(page.getByRole('dialog', { name: 'Completa tus datos.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeEnabled();
}

async function fillCard(page: Page, number: string) {
  await page.getByLabel('Número de tarjeta', { exact: true }).fill(number);
  await page.getByLabel('Nombre del titular', { exact: true }).fill('Titular de Prueba');
  await page.getByLabel('Vencimiento', { exact: true }).fill(`12${String((new Date().getFullYear() + 3) % 100).padStart(2, '0')}`);
  await page.getByLabel('Código de seguridad', { exact: true }).fill('123');
  await page.getByRole('checkbox', { name: /Acepto los/ }).check();
  await page.getByRole('checkbox', { name: /Autorizo el/ }).check();
}

async function fillDelivery(page: Page) {
  await page.getByLabel('Nombre de quien recibe', { exact: true }).fill(customer.fullName);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(customer.email);
  await page.getByLabel('Teléfono', { exact: true }).fill(customer.phone);
  await page.getByLabel('Dirección', { exact: true }).fill(delivery.addressLine1);
  await page.getByLabel('Ciudad', { exact: true }).fill(delivery.city);
  await page.getByLabel('Departamento', { exact: true }).fill(delivery.region);
}

async function review(page: Page) {
  await page.getByRole('button', { name: 'Continuar al resumen' }).click();
  await expect(page.getByRole('dialog', { name: 'Un último vistazo.' })).toBeVisible();
}

async function axeSerious(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? '')).map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
}

test.beforeEach(async ({ page, harness }) => {
  // Our API is always real HTTP. Only the external card-tokenization boundary is intercepted.
  await page.route('https://sandbox.wompi.co/v1/tokens/cards', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ status: 'CREATED', data: { id: 'qa-ephemeral-card-token' } }) }));
});

test.afterEach(async ({ page }) => {
  // Stop pending browser fetches/polling before the isolated API is disposed.
  await page.close();
});

test('QA-F01/V01/V03: real catalogue, responsive boundaries and accessible product', async ({ page, harness }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('Disponible · 12 unidades', { exact: true })).toBeVisible();
  expect((await page.getByRole('heading', { level: 1 }).innerText()).replace(/\s+/g, ' ')).toContain('Una luz para tus ideas.');
  const product = (await harness.store.get(`PRODUCT#${qaProductId}`)).value;
  const productImage = page.getByRole('img', { name: product.imageAlt, exact: true });
  await expect(productImage).toBeVisible();
  await expect.poll(() => productImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('product-initial-viewport.png'), fullPage: true });
  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const button = page.getByRole('button', { name: 'Pagar con tarjeta' });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('QA-F02/F03/V02/V03: modal validation, keyboard containment and focus restoration', async ({ page }, testInfo) => {
  await openCheckout(page);
  await expect(page.getByRole('checkbox', { name: /Acepto los/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Autorizo el/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Continuar al resumen' }).click();
  await expect(page.getByLabel('Número de tarjeta', { exact: true })).toBeFocused();
  await expect(page.getByText('Revisa los campos marcados.', { exact: true })).toBeVisible();
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('form-empty-validation.png') });
  const originalViewport = page.viewportSize()!;
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continuar al resumen' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeInViewport();
  }
  await page.setViewportSize(originalViewport);
  for (let index = 0; index < 24; index++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeFocused();
});

test('QA-F08/F12/R06/S01: approved checkout, double click, refresh and stock exactly once', async ({ page, harness }, testInfo) => {
  const card = syntheticCard();
  let ownApiCardLeak = false;
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/') && (request.postData() ?? '').includes(card)) ownApiCardLeak = true;
  });
  await openCheckout(page);
  await fillCard(page, card);
  await fillDelivery(page);
  await review(page);
  await expect(page.getByText('Cargo base', { exact: true })).toBeVisible();
  await expect(page.getByText('Envío', { exact: true })).toBeVisible();
  expect(await page.locator('[role="dialog"]').innerText().then(text => text.replace(/\s/g, '').includes(card))).toBe(false);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect([card, customer.fullName, customer.email, delivery.addressLine1].some(value => storage.includes(value))).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('summary-masked.png') });
  await page.getByRole('button', { name: /^Pagar \$/ }).dblclick();
  await expect(page.getByRole('heading', { name: 'Tu luz está en camino.' })).toBeVisible();
  expect(ownApiCardLeak).toBe(false);
  expect(harness.gateway.createCount).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu luz está en camino.' })).toBeVisible();
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('approved-restored.png') });
  await page.getByRole('button', { name: 'Volver al producto', exact: true }).click();
  await expect(page.getByText('Disponible · 11 unidades', { exact: true })).toBeVisible();
  const state = await harness.readState();
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(1);
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 11, stockReserved: 0, stockAvailable: 11 });
  expect(JSON.stringify(state).includes(card)).toBe(false);
});

test('QA-R01/R02: refresh restores delivery but clears card and both consents', async ({ page, harness }) => {
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Completa tus datos.' })).toBeVisible();
  await expect(page.getByLabel('Nombre de quien recibe', { exact: true })).toHaveValue(customer.fullName);
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue(delivery.addressLine1);
  await expect(page.getByLabel('Número de tarjeta', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Código de seguridad', { exact: true })).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: /Acepto los/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Autorizo el/ })).not.toBeChecked();
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-M11/R05: ambiguous payment remains pending after refresh with no new charge', async ({ page, harness }, testInfo) => {
  harness.gateway.mode = 'uncertain';
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completar pago' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago.' })).toBeVisible();
  await page.getByRole('button', { name: 'Consultar estado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago.' })).toBeVisible();
  expect(harness.gateway.createCount).toBe(1);
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('pending-unknown-restored.png') });
  const state = await harness.readState();
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 12, stockReserved: 1, stockAvailable: 11 });
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(0);
});

test('QA-F09: rejected payment returns unchanged physical stock and no delivery', async ({ page, harness }, testInfo) => {
  harness.gateway.mode = 'declined';
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'El pago fue rechazado.' })).toBeVisible();
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('declined.png') });
  await page.getByRole('button', { name: 'Volver al producto', exact: true }).click();
  await expect(page.getByText('Disponible · 12 unidades', { exact: true })).toBeVisible();
  expect(Object.keys(await harness.readState()).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(0);
});

test('QA-F11: unavailable payment service has honest recovery and disabled submit', async ({ page, harness }, testInfo) => {
  harness.gateway.mode = 'unavailable';
  await page.goto('/');
  await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
  await expect(page.getByRole('button', { name: 'Volver a conectar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeDisabled();
  expect(harness.gateway.createCount).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('provider-unavailable.png') });
  harness.gateway.mode = 'approved';
  await page.getByRole('button', { name: 'Volver a conectar' }).click();
  await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeEnabled();
});

test('QA-M02: changed total requires a fresh review before payment', async ({ page, harness }) => {
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  const product = await harness.store.get(`PRODUCT#${qaProductId}`);
  await harness.store.commit([{ key: `PRODUCT#${qaProductId}`, expectedVersion: product.version, value: { ...product.value, priceInCents: product.value.priceInCents + 10000 } }]);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByText('El precio cambió. Revisa el nuevo total antes de confirmar.', { exact: true })).toBeVisible();
  expect(harness.gateway.createCount).toBe(0);
  expect(Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'))).toHaveLength(0);
  await expect(page.getByRole('dialog', { name: 'Un último vistazo.' })).toBeVisible();
});

test('QA-R04: tokenization failure and reload resume the existing unpaid order', async ({ page, harness }) => {
  await page.route('https://sandbox.wompi.co/v1/tokens/cards', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu pedido está reservado.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completar pago' })).toBeEnabled();
  const before = Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'));
  expect(before).toHaveLength(1);
  expect(harness.gateway.createCount).toBe(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Completar pago' })).toBeVisible();
  await page.getByRole('button', { name: 'Completar pago' }).click();
  await expect(page.getByLabel('Número de tarjeta', { exact: true })).toHaveValue('');
  await page.route('https://sandbox.wompi.co/v1/tokens/cards', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ status: 'CREATED', data: { id: 'qa-second-ephemeral-token' } }) }));
  await fillCard(page, syntheticCard());
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu luz está en camino.' })).toBeVisible();
  expect(Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'))).toEqual(before);
  expect(harness.gateway.createCount).toBe(1);
});

test('QA-R03: a lost creation response recovers the persisted order from session', async ({ page, harness }) => {
  let dropped = false;
  await page.route('**/api/transactions', async route => {
    if (route.request().method() === 'POST' && !dropped) {
      dropped = true;
      await route.fetch(); // Real API commits the order; only its transport response is lost.
      await route.abort('connectionfailed');
    } else await route.continue();
  });
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'Tu pedido está reservado.' })).toBeVisible();
  expect(dropped).toBe(true);
  expect(harness.gateway.createCount).toBe(0);
  const before = Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'));
  expect(before).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu pedido está reservado.' })).toBeVisible();
  expect(Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'))).toEqual(before);
});

test('QA-V01/V04: long summary remains readable at narrow and landscape sizes', async ({ page, harness }, testInfo) => {
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await page.getByLabel('Nombre de quien recibe', { exact: true }).fill('Persona de Prueba con Nombre Extenso '.repeat(2).trim());
  await page.getByLabel('Dirección', { exact: true }).fill('Calle de prueba con nomenclatura extensa '.repeat(3).trim());
  await page.getByLabel('Complemento (opcional)', { exact: true }).fill('Torre de prueba, acceso de visitantes, apartamento de demostración');
  await review(page);
  const product = (await harness.store.get(`PRODUCT#${qaProductId}`)).value;
  await expect(page.locator('.summary-product img')).toHaveAttribute('src', product.imageUrl);
  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 667, height: 375 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: /^Pagar \$/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: /^Pagar \$/ })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`summary-long-${size.width}x${size.height}.png`) });
  }
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-X01: reduced motion dynamically removes skeleton and CTA motion', async ({ page, harness }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/products', async route => { await gate; await route.continue(); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.getByText('Cargando producto…', { exact: true })).toBeVisible();
  expect(await page.locator('.skeleton').first().evaluate(element => getComputedStyle(element).animationName)).toBe('pulse');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.skeleton').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior)).toBe('auto');
  release();
  const cta = page.getByRole('button', { name: 'Pagar con tarjeta' });
  await expect(cta).toBeVisible();
  await cta.hover();
  const arrow = cta.locator('svg');
  expect(await arrow.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await arrow.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await arrow.evaluate(element => getComputedStyle(element).transitionDuration)).not.toBe('0s');
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-X02: skip link, reverse focus loop, inert background and keyboard actions', async ({ page, browserName }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeEnabled();
  await expect(page.locator('html')).toHaveAttribute('lang', /^es(?:-[A-Za-z]{2})?$/);
  await expect(page).toHaveTitle(/Lumen/i);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  const firstFocus = await page.evaluate(() => ({ focused: document.hasFocus(), tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 80) }));
  await testInfo.attach('first-tab-focus', { body: JSON.stringify(firstFocus), contentType: 'application/json' });
  if (browserName === 'webkit' && firstFocus.tag === 'BUTTON') {
    // Windows WebKit skips links in its native Tab policy, including Alt+Tab.
    // Verify link activation separately; do not claim native link tabbing passed.
    testInfo.annotations.push({ type: 'limitation', description: 'WebKit native Tab skips links; skip-link Enter activation is verified after explicit focus.' });
    await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeFocused();
    await skip.focus();
  }
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  const trigger = page.getByRole('button', { name: 'Pagar con tarjeta' });
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Completa tus datos.' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const continueButton = dialog.getByRole('button', { name: 'Continuar al resumen' });
  // Wait for merchant config before testing its enabled submit control.
  await expect(continueButton).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Completa tus datos.' })).toBeFocused();
  expect(await page.locator('.page').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Volver al producto' })).toBeFocused();
  for (let index = 0; index < 28; index++) {
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await page.locator('.page button').evaluate((element: HTMLElement) => element.focus());
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await continueButton.focus();
  await expect(continueButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Número de tarjeta', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('.page').evaluate(element => (element as HTMLElement).inert)).toBe(false);
  await expect(trigger).toBeFocused();
});

test('QA-X03: editing a summary preserves delivery and never reveals full card outside fields', async ({ page, harness }) => {
  const card = syntheticCard();
  await openCheckout(page);
  await fillCard(page, card);
  await fillDelivery(page);
  await review(page);
  const summary = page.getByRole('dialog', { name: 'Un último vistazo.' });
  expect((await summary.innerText()).replace(/\s/g, '').includes(card)).toBe(false);
  await summary.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Nombre de quien recibe', { exact: true })).toHaveValue(customer.fullName);
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue(delivery.addressLine1);
  const changed = 'Calle de prueba 20, entrega editada';
  await page.getByLabel('Dirección', { exact: true }).fill(changed);
  await review(page);
  await expect(summary.getByText(changed, { exact: false })).toBeVisible();
  expect((await summary.innerText()).replace(/\s/g, '').includes(card)).toBe(false);
  await summary.getByRole('button', { name: 'Volver a mis datos' }).click();
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue(changed);
  await review(page);
  expect((await summary.innerText()).replace(/\s/g, '').includes(card)).toBe(false);
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage.includes(card)).toBe(false);
  expect(JSON.stringify(await harness.readState()).includes(card)).toBe(false);
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-X04: leaving a pending result and reopening retains the same payment and reservation', async ({ page, harness }) => {
  harness.gateway.mode = 'pending';
  await openCheckout(page);
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await page.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago.' })).toBeVisible();
  const before = Object.keys(await harness.readState()).filter(key => key.startsWith('TX#'));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goto('about:blank');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completar pago' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar estado', exact: true }).click();
  const state = await harness.readState();
  expect(Object.keys(state).filter(key => key.startsWith('TX#'))).toEqual(before);
  expect(state[before[0]].value.status).toBe('PENDING');
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 12, stockReserved: 1, stockAvailable: 11 });
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(0);
  expect(harness.gateway.createCount).toBe(1);
});

test('QA-X05: mobile target sizes and extra product form summary viewports', async ({ page, harness }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openCheckout(page);
  const inputMetrics = await page.locator('.field input, .field select').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { field: element.getAttribute('name'), height: box.height, fontSize: parseFloat(getComputedStyle(element).fontSize) };
  }));
  expect(inputMetrics.every(item => item.height >= 48 && item.fontSize >= 16)).toBe(true);
  const consentMetrics = await page.locator('label.checkbox').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { name: element.textContent?.trim(), width: box.width, height: box.height };
  }));
  for (const item of consentMetrics) {
    expect.soft(item.width, `${item.name} label touch width`).toBeGreaterThanOrEqual(44);
    expect.soft(item.height, `${item.name} label touch height`).toBeGreaterThanOrEqual(44);
  }
  await testInfo.attach('mobile-field-target-metrics', { body: JSON.stringify({ inputMetrics, consentMetrics }), contentType: 'application/json' });
  const checkButtons = async () => {
    const metrics = await page.getByRole('dialog').locator('button').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: box.width, height: box.height };
    }).filter(item => item.width > 0 && item.height > 0));
    for (const item of metrics) {
      expect.soft(item.width, `${item.name} touch width`).toBeGreaterThanOrEqual(44);
      expect.soft(item.height, `${item.name} touch height`).toBeGreaterThanOrEqual(44);
    }
    const ctas = await page.getByRole('dialog').locator('button.button.primary').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(ctas.every(height => height >= 48)).toBe(true);
  };
  await checkButtons();
  await fillCard(page, syntheticCard());
  await fillDelivery(page);
  await review(page);
  await checkButtons();
  // Only masked summaries and empty fields are captured.
  for (const size of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: /^Pagar \$/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: /^Pagar \$/ })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`summary-extra-${size.width}.png`) });
    await page.getByRole('button', { name: 'Cerrar formulario de pago' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Cerrar formulario de pago' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`summary-top-extra-${size.width}.png`) });
  }
  await page.reload();
  await expect(page.getByLabel('Número de tarjeta', { exact: true })).toHaveValue('');
  for (const size of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Continuar al resumen' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`form-extra-${size.width}.png`) });
    await page.getByRole('button', { name: 'Cerrar formulario de pago' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Cerrar formulario de pago' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`form-top-extra-${size.width}.png`) });
  }
  await page.keyboard.press('Escape');
  for (const size of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Pagar con tarjeta' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`product-extra-${size.width}.png`), fullPage: true });
  }
  harness.gateway.mode = 'unavailable';
  await page.getByRole('button', { name: 'Pagar con tarjeta' }).click();
  await expect(page.getByRole('button', { name: 'Volver a conectar' })).toBeVisible();
  for (const size of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    const labels = await page.locator('label.checkbox').evaluateAll(elements => elements.map(element => ({ height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width })));
    expect(labels.every(item => item.height >= 44 && item.width >= 44)).toBe(true);
  }
});

test('QA-X06: catalogue loading error and sold-out states remain clear and recoverable', async ({ page, harness }, testInfo) => {
  let release!: () => void;
  let phase: 'held' | 'error' | 'real' = 'held';
  const gate = new Promise<void>(resolve => { release = resolve; });
  // Deliberate transport fault injection only; success/stock responses still come from the real API.
  await page.route('**/api/products', async route => {
    if (phase === 'held') await gate;
    if (phase === 'error') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Fallo temporal de catálogo de prueba.' } }) });
    else await route.continue();
  });
  await page.goto('/');
  await expect(page.getByText('Cargando producto…', { exact: true })).toBeVisible();
  await expect(page.locator('.loading-product')).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: testInfo.outputPath('catalogue-loading.png'), fullPage: true });
  phase = 'real'; release();
  await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeEnabled();
  phase = 'error';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No pudimos cargar el producto.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeEnabled();
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('catalogue-error.png'), fullPage: true });
  const product = await harness.store.get(`PRODUCT#${qaProductId}`);
  await harness.store.commit([{ key: `PRODUCT#${qaProductId}`, expectedVersion: product.version, value: { ...product.value, stockOnHand: 0, stockReserved: 0, stockAvailable: 0 } }]);
  phase = 'real';
  await page.getByRole('button', { name: 'Volver a intentar' }).click();
  await expect(page.getByText('Agotado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Por ahora, agotado' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Consultar disponibilidad' })).toBeEnabled();
  expect(await axeSerious(page)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('catalogue-sold-out.png'), fullPage: true });
  const empty = await harness.store.get(`PRODUCT#${qaProductId}`);
  await harness.store.commit([{ key: `PRODUCT#${qaProductId}`, expectedVersion: empty.version, value: { ...empty.value, stockOnHand: 1, stockAvailable: 1 } }]);
  await page.getByRole('button', { name: 'Consultar disponibilidad' }).click();
  await expect(page.getByText('Disponible · 1 unidad', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagar con tarjeta' })).toBeEnabled();
  expect(harness.gateway.createCount).toBe(0);
});
