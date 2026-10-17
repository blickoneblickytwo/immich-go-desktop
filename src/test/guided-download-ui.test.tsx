import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

beforeEach(()=>{
  window.history.replaceState({},"","/");localStorage.clear();
  vi.stubGlobal("ResizeObserver",class{observe(){} unobserve(){} disconnect(){}});
  vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  vi.spyOn(window.navigator,"platform","get").mockReturnValue("Win32");
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});

it("downloads a guided script without the form key, keeping manual execution separate",async()=>{
  let blob:Blob|undefined;let filename="";
  const create=vi.fn((value:Blob)=>{blob=value;return "blob:fixture"});
  vi.stubGlobal("URL",class extends URL { static createObjectURL=create;static revokeObjectURL=vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(function(){filename=this.download});
  render(<App/>);
  fireEvent.keyDown(screen.getByRole("button",{name:"Upload source"}),{key:"ArrowDown"});
  fireEvent.click(await screen.findByRole("menuitemradio",{name:"Photos from my computer"}));
  fireEvent.click(screen.getByRole("button",{name:"Continue"}));
  fireEvent.change(await screen.findByRole("textbox",{name:"Your server address"}),{target:{value:"https://photos.example.com"}});
  const key="fixture-browser-key-1234567890";
  fireEvent.change(screen.getByLabelText("Your API key (optional)"),{target:{value:key}});
  fireEvent.click(screen.getByRole("button",{name:"Continue"}));
  fireEvent.change(await screen.findByLabelText("Where are your photos?"),{target:{value:"/example/photos%batch%"}});
  fireEvent.click(screen.getByRole("button",{name:"Prepare import"}));
  await waitFor(()=>expect(screen.getByRole("heading",{name:"Ready for your test run."})).toBeVisible());
  expect(screen.getByText("Manual command").closest("details")).not.toHaveAttribute("open");
  fireEvent.click(screen.getByRole("button",{name:"Download guided script"}));
  await waitFor(()=>expect(create).toHaveBeenCalledOnce());
  const text=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsText(blob!)});
  expect(text).not.toContain(key);expect(text).toContain("UPLOAD");expect(text).toContain("checksum");
  expect(filename).toMatch(/^go-desktop-import\.(sh|ps1)$/);
  expect(screen.getByText("How to run the download").closest("details")).toHaveAttribute("open");
  fireEvent.click(screen.getByText("Manual command",{exact:true}));
  fireEvent.click(screen.getByRole("button",{name:"CMD"}));
  expect(screen.getByRole("alert")).toHaveTextContent("PowerShell");
  expect(screen.getByRole("button",{name:"Download guided script"})).toBeEnabled();
});
