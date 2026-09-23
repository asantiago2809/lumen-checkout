const mockRender = jest.fn();
jest.mock("react-dom/client", () => ({
  createRoot: jest.fn(() => ({ render: mockRender })),
}));
jest.mock("./styles.css", () => ({}));
test("mounts the Redux application at the HTML entrypoint", () => {
  document.body.innerHTML = '<div id="root"></div>';
  require("./main");
  expect(mockRender).toHaveBeenCalledTimes(1);
});
