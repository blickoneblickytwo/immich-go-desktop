import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LogReview from "@/pages/LogReview";
import App from "@/App";
import { MAX_LOG_BYTES, parseLog } from "@/lib/log-review";
import { SAMPLE_LOG } from "@/lib/sample-log";

class WorkerStub {
  static instances: WorkerStub[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { WorkerStub.instances.push(this); }
  result(text = SAMPLE_LOG) { this.onmessage?.({ data: { type: "result", report: parseLog(text) } }); }
}

beforeEach(() => {
  WorkerStub.instances = [];
  vi.stubGlobal("Worker", WorkerStub);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({}, "", "/");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

const renderReview = () => render(<MemoryRouter><LogReview /></MemoryRouter>);
const choose = (file = new File([SAMPLE_LOG], "example-import.log")) => fireEvent.change(screen.getByLabelText("Choose log file"), { target: { files: [file] } });

describe("local log review lifecycle", () => {
  it("processes the explicit file in a worker without network or persistence, and escapes log markup", async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    renderReview(); choose();
    expect(WorkerStub.instances[0].postMessage).toHaveBeenCalledWith({ file: expect.any(File) });
    act(() => WorkerStub.instances[0].result(SAMPLE_LOG + '\n2026-10-16 12:00:20 ERR <img src="untrusted" onerror="alert(1)">'));
    expect(await screen.findByText("Your log review")).toBeVisible();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(document.querySelector('img[src="untrusted"]')).toBeNull();
    expect(document.body.textContent).toContain('<img src="untrusted"');
    expect(fetchSpy).not.toHaveBeenCalled(); expect(storageSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear log" }));
    expect(screen.queryByText("Your log review")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("example-import.log");
    expect(document.body.textContent).not.toContain('src="untrusted"');
  });

  it("rejects oversized and empty files before starting a worker", () => {
    renderReview();
    const file = new File(["test"], "large.log"); Object.defineProperty(file, "size", { value: MAX_LOG_BYTES + 1 });
    choose(file);
    expect(screen.getByRole("alert")).toHaveTextContent("25 MiB");
    choose(new File([], "empty.log"));
    expect(WorkerStub.instances).toHaveLength(0);
  });

  it("cancels and ignores a stale result, then terminates an active worker on leaving", () => {
    const view = renderReview(); choose();
    const first = WorkerStub.instances[0];
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(first.terminate).toHaveBeenCalled();
    act(() => first.result());
    expect(screen.queryByText("Your log review")).not.toBeInTheDocument();
    choose();
    view.unmount();
    expect(WorkerStub.instances[1].terminate).toHaveBeenCalled();
  });

  it("switches between appended runs without combining their totals", () => {
    renderReview(); choose();
    act(() => WorkerStub.instances[0].result(SAMPLE_LOG + '\n2026-10-16 12:01:00 INF Command: immich-go upload from-folder\n2026-10-16 12:01:01 ERR request timed out'));
    expect(screen.getByText("Partial log")).toBeVisible();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/This file contains 2 runs/), { target: { value: "0" } });
    expect(screen.getAllByText("110")[0]).toBeVisible();
    expect(screen.getByText("Asset summary found")).toBeVisible();
  });
});

it("keeps an unfinished connection form in memory when opening log review from Help and returning", async () => {
  render(<App />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Upload source" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("menuitemradio", { name: "Photos from my computer" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  const server = await screen.findByRole("textbox", { name: "Your server address" });
  fireEvent.change(server, { target: { value: "https://photos.example.com" } });
  fireEvent.change(screen.getByLabelText("Your API key (optional)"), { target: { value: "fixture-key-not-real" } });
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Help" }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByText("Reading import results"));
  fireEvent.click(screen.getByRole("link", { name: "Review an import log" }));
  expect(await screen.findByRole("heading", { name: "Understand your import." })).toBeVisible();
  expect(window.location.search).toBe("?view=import-report");
  fireEvent.click(screen.getByRole("link", { name: "Back to import" }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Your server address" })).toHaveValue("https://photos.example.com"));
  expect(screen.getByLabelText("Your API key (optional)")).toHaveValue("fixture-key-not-real");
  expect(screen.getByRole("checkbox", { name: "Remember on this device" })).not.toBeChecked();
});
