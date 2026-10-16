import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";

/** Render with a fresh Redux store, as the app does per request. */
export function renderWithStore(ui: React.ReactElement, store = makeStore()) {
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
