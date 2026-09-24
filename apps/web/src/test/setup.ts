import "@testing-library/jest-dom";
Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: jest.fn(),
});
beforeEach(() => {
  localStorage.clear();
});
