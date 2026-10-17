/// <reference types="node" />
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildGuidedScript, GUIDED_ASSETS } from "@/lib/guided-script";
import { defaultFriendlyState, type FriendlyState } from "@/lib/friendly-flow";

const roots: string[] = [];
const state: FriendlyState = { ...defaultFriendlyState, source: "folder", preset: "custom", serverUrl: "https://photos.example.com", inputPath: "/example/photos",
  apiKey: "fixture-browser-key-not-for-download", fromApiKey: "fixture-source-browser-key-not-for-download" };
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

/** Every process/network interaction is a local fixture; never invokes real immich-go or curl. */
function fixture(options: { source?: FriendlyState["source"]; scenario?: string; installed?: boolean; badHash?: boolean; photoPath?: string; status?: string; server?: string } = {}) {
  const parent = path.resolve("node_modules/.cache/guided-tests"); mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(path.join(parent, "case-")); roots.push(root);
  const bin = path.join(root, "bin"); const photos = options.photoPath ?? path.join(root, "photos with spaces");
  mkdirSync(bin); mkdirSync(path.join(root, "tmp")); if (!options.photoPath) mkdirSync(photos);
  const js = path.join(root, "mock.cjs");
  writeFileSync(js, `const fs=require('fs');const path=require('path');
const args=process.argv.slice(3), kind=process.argv[2], root=process.env.FIXTURE_ROOT;
const calls=path.join(root,'calls.jsonl');fs.appendFileSync(calls,JSON.stringify({kind,args})+'\\n');
if(kind==='curl') {
 const outputIndex=args.indexOf('--output')>=0?args.indexOf('--output'):args.indexOf('-o');const out=args[outputIndex+1];
 if(args.some(a=>a.startsWith('https://github.com/'))) {fs.copyFileSync(process.env.MOCK_ARCHIVE,out);process.exit(0)}
 if(process.env.HTTP_STATUS==='network')process.exit(7);
 const h=args[args.indexOf('--header')+1]; if(!h?.startsWith('@'))process.exit(9);
 const key=fs.readFileSync(h.slice(1),'utf8');
 if(process.env.HTTP_STATUS==='retry' && key.includes('bad')){fs.writeFileSync(out,'{}');process.stdout.write('401');process.exit(0)}
 fs.writeFileSync(out,process.env.SCENARIO==='html'?'not Immich':'{"version":"3.3.0"}');process.stdout.write(process.env.HTTP_STATUS==='retry'?'200':process.env.HTTP_STATUS||'200');process.exit(0);
}
if(args[0]==='version'){console.log('immich-go version:'+ (process.env.INSTALLED==='old' && !process.env.DOWNLOADED?'0.27.0':'0.32.0')+', commit:fixture');process.exit(0)}
const log=args.find(a=>a.startsWith('--log-file=')).slice(11),scenario=process.env.SCENARIO;
let lines=['Asset Tracking Report:','Total Assets: 2','Processed: 2','Discarded: 0','Errors: 0','Pending: 0','Event Report:','uploaded successfully: 2','Check the log file: example.log'];
if(scenario==='missing')lines=['No summary'];
if(scenario==='pending')lines[5]='Pending: 1';
if(scenario==='inconsistent')lines[1]='Total Assets: 9';
if(scenario==='incomplete')lines=lines.filter(x=>!x.startsWith('Discarded:'));
if(scenario==='unclosed')lines.pop();
if(scenario==='event-error')lines.splice(8,0,'upload failed: 1');
if(scenario==='album-error')lines.unshift('ERR failed to add assets to album');
if(scenario==='warning')lines.unshift('WRN metadata warning');
if(scenario==='empty'){lines[1]='Total Assets: 0';lines[2]='Processed: 0'}
fs.writeFileSync(log,lines.map(l=>'2026-10-17 12:00:00 '+(/^(ERR|WRN) /.test(l)?l:'INF '+l)).join('\\n')+'\\n');
console.log('Synthetic CLI output only');process.exit(scenario==='failed'?3:0);
`);
  const wrapper = (kind: string, downloaded = false) => `#!/bin/bash\n${downloaded ? 'export DOWNLOADED=1\n' : ''}exec "$TEST_NODE" "$TEST_FIXTURE_JS" ${kind} "$@"\n`;
  for (const kind of ["immich-go", "curl"]) { writeFileSync(path.join(bin, kind), wrapper(kind)); chmodSync(path.join(bin, kind), 0o755); }
  writeFileSync(path.join(bin, "uname"), '#!/bin/bash\nif [ "$1" = -s ]; then echo Darwin; else echo arm64; fi\n'); chmodSync(path.join(bin, "uname"), 0o755);
  const payload = path.join(root, "payload"); mkdirSync(payload); writeFileSync(path.join(payload, "immich-go"), wrapper("immich-go", true)); chmodSync(path.join(payload, "immich-go"), 0o755);
  const archive = path.join(root, "fixture.tar.gz");
  const tar = spawnSync("tar", ["-czf", archive, "-C", payload, "immich-go"]); expect(tar.status).toBe(0);
  const digest = createHash("sha256").update(readFileSync(archive)).digest("hex");
  const source = options.source ?? "folder";
  const configState = { ...state, source, fromServerUrl: "https://source.example.com", inputPath: photos, serverUrl: options.server ?? state.serverUrl,
    advanced: { ...state.advanced, album: "A trip's $(touch INJECTED) \"photos\"", sourceAlbum: "A trip's album", sessionTag: true } };
  let script = buildGuidedScript(configState, "macos").content;
  script = script.split(GUIDED_ASSETS.Darwin_arm64).join(options.badHash ? "0".repeat(64) : digest);
  const scriptPath = path.join(root, "import.sh"); writeFileSync(scriptPath, script);
  const env = { ...process.env, PATH: bin+path.delimiter+process.env.PATH, FIXTURE_ROOT: root, TEST_NODE: process.execPath, TEST_FIXTURE_JS: js,
    XDG_CACHE_HOME: path.join(root,"cache"), XDG_STATE_HOME: path.join(root,"state"), TMPDIR: path.join(root,"tmp"),
    MOCK_ARCHIVE: archive, INSTALLED: options.installed===false?"old":"current", SCENARIO: options.scenario??"normal", HTTP_STATUS: options.status??"200",
    POWERSHELL_TELEMETRY_OPTOUT:"1", DOTNET_CLI_TELEMETRY_OPTOUT:"1", XDG_CONFIG_HOME:path.join(root,"ps-config"), XDG_DATA_HOME:path.join(root,"ps-data") };
  const collected = (result: SpawnSyncReturns<string>) => {
    const calls = existsSync(path.join(root,"calls.jsonl")) ? readFileSync(path.join(root,"calls.jsonl"),"utf8").trim().split("\n").map(line=>JSON.parse(line) as {kind:string;args:string[]}) : [];
    return { ...result, output: result.stdout+result.stderr, calls, imports: calls.filter(c=>c.kind==="immich-go" && c.args[0]==="upload") };
  };
  return { root, photos, script, runPowerShell: (input: string[]) => {
    const quote=(s:string)=>"'"+s.replace(/'/g,"''")+"'";
    let windowsScript=buildGuidedScript(configState,"windows").content.replace(/^\uFEFF/,"");
    let zipPath="";
    if(options.installed===false) {
      const winPayload=path.join(root,"win-payload");mkdirSync(winPayload,{recursive:true});
      writeFileSync(path.join(winPayload,"immich-go.exe"),wrapper("immich-go",true));
      zipPath=path.join(root,"fixture.zip");
      const zip=spawnSync(powerShellBinary,["-NoLogo","-NoProfile","-NonInteractive","-Command",`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory(${quote(winPayload)},${quote(zipPath)})`],{encoding:"utf8",env});
      expect(zip.status,zip.stderr).toBe(0);
      const hash=createHash("sha256").update(readFileSync(zipPath)).digest("hex");
      windowsScript=windowsScript.split(GUIDED_ASSETS.Windows_arm64).join(options.badHash?"0".repeat(64):hash);
    }
    const prelude = `$script:Answers = [Collections.Generic.Queue[string]]::new()\n${input.map(s=>`$script:Answers.Enqueue(${quote(s)})`).join("\n")}
Add-Type 'public class FixtureWebException : System.Exception { public FixtureReply Response { get; set; } } public class FixtureReply { public int StatusCode { get; set; } }'
function Read-Host { param([string]$Prompt,[switch]$AsSecureString)
 if($script:Answers.Count -eq 0){throw 'No fixture input remains'}
 $Answer=$script:Answers.Dequeue()
 if($AsSecureString){return ConvertTo-SecureString $Answer -AsPlainText -Force}; return $Answer
}
function Invoke-WebRequest { param([switch]$UseBasicParsing,[string]$Uri,[hashtable]$Headers,[int]$MaximumRedirection,[int]$TimeoutSec,[string]$OutFile)
 if($Uri.StartsWith('https://github.com/')) {
  [IO.File]::Copy($env:MOCK_ZIP,$OutFile)
  [IO.File]::AppendAllText((Join-Path $env:FIXTURE_ROOT 'calls.jsonl'),'{"kind":"ps-download","args":[]}' + [Environment]::NewLine)
  return
 }
 if($MaximumRedirection -ne 0){throw 'Fixture rejected redirect following'}
 if($env:HTTP_STATUS -eq 'network'){throw 'Fixture network failure'}
 if($env:HTTP_STATUS -eq '302'){throw 'Fixture redirect'}
 if($env:HTTP_STATUS -eq '401' -or ($env:HTTP_STATUS -eq 'retry' -and $Headers['x-api-key'] -eq 'bad-key')) {
  $Exception=[FixtureWebException]::new(); $Exception.Response=[FixtureReply]::new(); $Exception.Response.StatusCode=401; throw $Exception
 }
 return [pscustomobject]@{StatusCode=200;Content=$(if($env:SCENARIO -eq 'html'){'not Immich'}else{'{"version":"3.3.0"}'})}
}
function Expand-Archive { param([string]$LiteralPath,[string]$DestinationPath)
 Microsoft.PowerShell.Archive\\Expand-Archive -LiteralPath $LiteralPath -DestinationPath $DestinationPath
 & /bin/chmod 700 (Join-Path $DestinationPath 'immich-go.exe')
}
`;
    const scriptPath=path.join(root,"import.ps1");writeFileSync(scriptPath,prelude+windowsScript);
    return collected(spawnSync(powerShellBinary,["-NoLogo","-NoProfile","-NonInteractive","-File",scriptPath],{encoding:"utf8",timeout:15000,cwd:root,
      env:{...env, MOCK_ZIP:zipPath, OS:"Windows_NT", LOCALAPPDATA:path.join(root,"localappdata"), PROCESSOR_ARCHITECTURE:"ARM64", PROCESSOR_ARCHITEW6432:""}}));
  }, run: (input: string) => {
    const result = spawnSync("/bin/bash", [scriptPath], { input, encoding: "utf8", timeout: 12000, cwd: root,
      env });
    return collected(result);
  } };
}

describe("guided download generation", () => {
  it.each(["macos", "linux", "windows"] as const)("omits both browser-entered keys and uses the correct script type for %s", os => {
    const result=buildGuidedScript({...state,source:"immich",fromServerUrl:"https://source.example.com"},os);
    expect(result.content).not.toContain(state.apiKey); expect(result.content).not.toContain(state.fromApiKey);
    expect(result.content).not.toMatch(/@(?:Darwin|Linux|Windows)_/);
    expect(result.filename).toBe(os==="windows"?"go-desktop-import.ps1":"go-desktop-import.sh");
    if(os==="windows")expect(result.content.startsWith("\uFEFF")).toBe(true);
  });
  it("rejects option-like paths, invalid URLs, and control characters before creating a download", () => {
    expect(()=>buildGuidedScript({...state,inputPath:"--help"},"macos")).toThrow("path");
    expect(()=>buildGuidedScript({...state,serverUrl:"https://user:password@example.com"},"windows")).toThrow();
    expect(()=>buildGuidedScript({...state,inputPath:"/example/a\nb"},"macos")).toThrow("control");
  });
});

const powerShellBinary = process.env.PWSH_TEST_BINARY || (existsSync("node_modules/.cache/powershell-test/pwsh") ? path.resolve("node_modules/.cache/powershell-test/pwsh") : "pwsh");
const hasPowerShell = process.platform!=="win32" && spawnSync(powerShellBinary,["-NoLogo","-NoProfile","-NonInteractive","-Command","exit 0"],{env:{...process.env,POWERSHELL_TELEMETRY_OPTOUT:"1",XDG_CONFIG_HOME:path.resolve("node_modules/.cache/guided-tests/ps-config"),XDG_DATA_HOME:path.resolve("node_modules/.cache/guided-tests/ps-data")}}).status===0;
describe.skipIf(!hasPowerShell)("PowerShell guided script with isolated CLI/network/input fixtures", () => {
  it.each(["folder","takeout","icloud","immich"] as const)("keeps %s test-only by default", source => {
    const r=fixture({source}).runPowerShell(source==="immich"?["destination-key","source-key",""]:["destination-key",""]);
    expect(r.status,r.output).toBe(0);expect(r.imports).toHaveLength(1);expect(r.imports[0].args).toContain("--dry-run=true");
    expect(r.output).not.toContain("destination-key");expect(r.output).toContain("No live upload was started");
  });
  it("preserves native argument quoting and uploads only after exact consent",()=>{
    const f=fixture();const r=f.runPowerShell(["destination-key","UPLOAD"]);
    expect(r.status,r.output).toBe(0);expect(r.imports).toHaveLength(2);
    expect(r.imports[1].args).toContain('--into-album=A trip\'s $(touch INJECTED) "photos"');
    expect(existsSync(path.join(f.root,"INJECTED"))).toBe(false);
  });
  it.each(["pending","failed","missing","album-error","event-error","incomplete","inconsistent","unclosed","empty"])("stops before upload for %s",scenario=>{
    const r=fixture({scenario}).runPowerShell(["destination-key","UPLOAD"]);
    expect(r.status,r.output).not.toBe(0);expect(r.imports).toHaveLength(1);
  });
  it("blocks redirects and a non-Immich response before invoking the CLI",()=>{
    for(const options of [{status:"302"},{scenario:"html"}]) {
      const r=fixture(options).runPowerShell(["destination-key","UPLOAD"]);expect(r.status,r.output).not.toBe(0);expect(r.imports).toHaveLength(0);
    }
  });
  it("retries an unauthorized key without echoing it",()=>{
    const r=fixture({status:"retry"}).runPowerShell(["bad-key","good-key",""]);
    expect(r.status,r.output).toBe(0);expect(r.imports[0].args).toContain("--api-key=good-key");expect(r.output).not.toContain("good-key");
  });
  it.each([false,true])("verifies setup before execution, bad checksum=%s",badHash=>{
    const r=fixture({installed:false,badHash}).runPowerShell(["destination-key",""]);
    expect(r.calls.filter(c=>c.kind==="ps-download")).toHaveLength(1);
    if(badHash){expect(r.status,r.output).not.toBe(0);expect(r.imports).toHaveLength(0);expect(r.output).toContain("checksum did not match")}
    else {expect(r.status,r.output).toBe(0);expect(r.imports).toHaveLength(1)}
  });
});

describe.skipIf(process.platform==="win32")("Unix guided script with isolated CLI/network fixtures", () => {
  it.each(["folder","takeout","icloud","immich"] as const)("tests first and never uploads by default for %s", source => {
    const f=fixture({source}); const r=f.run(source==="immich"?"destination-key\nsource-key\n\n":"destination-key\n\n");
    expect(r.status,r.output).toBe(0); expect(r.imports).toHaveLength(1); expect(r.imports[0].args).toContain("--dry-run=true");
    expect(r.output).not.toContain("destination-key"); expect(r.output).toContain("No live upload was started");
    expect(readdirSync(path.join(f.root,"tmp"))).toHaveLength(0);
  });
  it("requires the exact UPLOAD response and preserves quoted arguments without executing them", () => {
    const f=fixture(); const r=f.run("destination-key\nUPLOAD\n"); expect(r.status,r.output).toBe(0);
    expect(r.imports.map(c=>c.args.find(a=>a.startsWith("--dry-run=")))).toEqual(["--dry-run=true","--dry-run=false"]);
    expect(r.imports[1].args).toContain('--into-album=A trip\'s $(touch INJECTED) "photos"');
    expect(existsSync(path.join(f.root,"INJECTED"))).toBe(false);
    expect(r.output).toContain("Check your Immich library");
  });
  it.each(["yes","upload","UPLOAD "])("does not treat %s as upload consent", answer => {
    const r=fixture().run(`destination-key\n${answer}\n`); expect(r.status,r.output).toBe(0); expect(r.imports).toHaveLength(1);
  });
  it.each(["failed","pending","inconsistent","incomplete","unclosed","missing","event-error","album-error","empty"])("stops before upload for %s test output, even if UPLOAD follows", scenario => {
    const r=fixture({scenario}).run("destination-key\nUPLOAD\n"); expect(r.status,r.output).not.toBe(0); expect(r.imports).toHaveLength(1); expect(r.output).toContain("No live upload was started");
  });
  it("allows explicit continuation after warnings while keeping those warnings visible", () => {
    const r=fixture({scenario:"warning"}).run("destination-key\nUPLOAD\n"); expect(r.status,r.output).toBe(0); expect(r.output).toContain("Warnings: 1"); expect(r.imports).toHaveLength(2);
  });
  it("retries a rejected key, blocks redirected requests, and rejects non-Immich responses", () => {
    const r=fixture({status:"retry"}).run("bad-key\ngood-key\n\n"); expect(r.status,r.output).toBe(0); expect(r.imports[0].args).toContain("--api-key=good-key");
    for(const options of [{status:"302"},{scenario:"html"},{status:"network"}]) {
      const bad=fixture(options).run("fixture-key\nUPLOAD\n"); expect(bad.status,bad.output).not.toBe(0); expect(bad.imports).toHaveLength(0);
    }
  });
  it("does not send a key over HTTP without explicit acknowledgement", () => {
    const r=fixture({server:"http://photos.example.com"}).run("\nfixture-key\nUPLOAD\n"); expect(r.imports).toHaveLength(0); expect(r.calls.filter(c=>c.kind==="curl")).toHaveLength(0);
  });
  it("stops at an invalid photo path before requesting a key or contacting a server", () => {
    const r=fixture({photoPath:"/example/missing"}).run("\n"); expect(r.calls).toHaveLength(0); expect(r.output).not.toContain("API key (input hidden)");
  });
  it("downloads a verified private copy when the installed CLI is outdated, without changing it", () => {
    const f=fixture({installed:false}); const r=f.run("destination-key\n\n"); expect(r.status,r.output).toBe(0);
    expect(r.output).toContain("Downloading official immich-go"); expect(r.imports).toHaveLength(1);
    expect(readFileSync(path.join(f.root,"bin","immich-go"),"utf8")).not.toContain("DOWNLOADED");
    const again=f.run("destination-key\n\n"); expect(again.status,again.output).toBe(0);
    expect(again.calls.filter(c=>c.kind==="curl"&&c.args.some(a=>a.startsWith("https://github.com/")))).toHaveLength(1);
  });
  it("never executes a downloaded binary with a mismatched checksum", () => {
    const r=fixture({installed:false,badHash:true}).run("fixture-key\nUPLOAD\n"); expect(r.status).not.toBe(0); expect(r.output).toContain("checksum did not match"); expect(r.imports).toHaveLength(0);
  });
});
