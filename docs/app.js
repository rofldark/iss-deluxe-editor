/* ISS Deluxe Text Studio - user interface. All work happens locally in this page. */
(() => {
  "use strict";
  const K = window.ISSD;
  const $ = (id) => document.getElementById(id);
  const PAGE = 100;

  // --- texts -----------------------------------------------------------------
  const I18N = {
    en: {
      privacy: "Your ROM stays in your browser.",
      heroTitle: "Edit player names and texts of ISS Deluxe",
      heroLead: "Load your own ROM, change player names and in-game texts, and save the changed ROM or a patch. Everything runs in your browser, nothing is uploaded.",
      dropTitle: "Drop your ROM here",
      dropOr: "or click to choose a file",
      dropHint: "International Superstar Soccer Deluxe (Europe) · .sfc / .smc",
      tabNames: "Player names", tabTexts: "Texts", tabProse: "Running texts",
      allTeams: "All teams", allAreas: "All texts", team: "Team", guessed: "(name guessed)",
      gHelp: "Controller help", gTrain: "Training / prompts", gScenario: "Scenario",
      search: "Search offset or text…", onlyChanged: "Only changed",
      noteNames: "Up to 8 characters per name; shorter names are padded. Allowed: letters (no umlauts), digits and . ! ? ' - : and space. The team names are guessed from the player names.",
      noteTexts: "The length must stay exactly the same (count the spaces). Neighbouring texts are stored without a separator. Allowed: letters (no umlauts), digits and . ! ? ' - : and space.",
      noteProse: "Help pages, training descriptions and scenario descriptions in the small font. One line per entry (the game shows 4-6 lines at once); the length of every line must stay exactly the same. Sentences may continue in the next line. Allowed: letters (no umlauts), digits and . , - ' / and space.",
      dlRom: "Download ROM", dlBps: "Patch (.bps)", dlIps: "Patch (.ips)",
      exportBtn: "Save edits…", importBtn: "Load edits…", resetBtn: "Reset all",
      resetConfirm: "Discard all {n} edits?",
      changes: "{n} changed", errorsN: "{n} problems",
      colOff: "Offset", colOrig: "Original", colNew: "New text", colLen: "Length",
      empty: "Nothing to show.", prev: "‹ Prev", next: "Next ›", rows: "{a}–{b} of {c}",
      romOk: "expected ROM", romBad: "different ROM",
      bannerWrong: "This is not the expected ROM (Europe, CRC32 CBA724BA). The offsets are probably wrong. Edit at your own risk and check the result carefully.",
      bannerHeader: "A 512-byte copier header was found. It is kept in the saved ROM; patches are relative to the headerless ROM.",
      loadFailed: "This file does not look like International Superstar Soccer Deluxe (Europe).",
      tooBig: "That file is too large for a SNES ROM of this game.",
      hMax: "max {max}", hExact: "exactly {max}",
      btnReset: "Undo", reset: "Undo changes to this line",
      eBadChar: "“{c}” is not in the game's character set. Allowed: letters (no umlauts), digits and {allowed} and space. Raw bytes as \\xNN.",
      eBadEsc: "Invalid escape near “{c}”. Use \\xNN (two hex digits).",
      eNames: "{len} characters, max {max}.",
      eExact: "{len} characters, must be exactly {max} (count the spaces).",
      eUnknown: "Unknown entry.",
      errorsTitle: "The ROM was not built:",
      jump: "show",
      toastBuilt: "Done: {n} places changed, checksum fixed.",
      toastPatch: "Patch created ({size} bytes).",
      toastNoChange: "No changes yet. Edit some texts first.",
      toastRestored: "Restored {n} edits from your last session.",
      toastImported: "Imported {n} edits.",
      toastImportBad: "That file does not belong to this ROM or is not an edits file.",
      footLegal: "Fan tool, not affiliated with the owners of the game. No ROM or game data is included, bring your own copy. Nothing you load leaves this page.",
    },
    de: {
      privacy: "Deine ROM bleibt in deinem Browser.",
      heroTitle: "Spielernamen und Texte von ISS Deluxe bearbeiten",
      heroLead: "Lade deine eigene ROM, ändere Spielernamen und Spieltexte und speichere die geänderte ROM oder einen Patch. Alles läuft im Browser, nichts wird hochgeladen.",
      dropTitle: "ROM hier ablegen",
      dropOr: "oder klicken, um eine Datei zu wählen",
      dropHint: "International Superstar Soccer Deluxe (Europe) · .sfc / .smc",
      tabNames: "Spielernamen", tabTexts: "Texte", tabProse: "Fließtexte",
      allTeams: "Alle Teams", allAreas: "Alle Texte", team: "Team", guessed: "(Name geraten)",
      gHelp: "Steuerungs-Hilfe", gTrain: "Training / Hinweise", gScenario: "Szenario",
      search: "Offset oder Text suchen…", onlyChanged: "Nur geänderte",
      noteNames: "Höchstens 8 Zeichen pro Name; kürzere Namen werden aufgefüllt. Erlaubt: Buchstaben (keine Umlaute), Ziffern und . ! ? ' - : sowie Leerzeichen. Die Teamnamen sind aus den Spielernamen geraten.",
      noteTexts: "Die Länge muss exakt gleich bleiben (Leerzeichen mitzählen). Benachbarte Texte liegen ohne Trennzeichen aneinander. Erlaubt: Buchstaben (keine Umlaute), Ziffern und . ! ? ' - : sowie Leerzeichen.",
      noteProse: "Hilfeseiten, Trainings- und Szenario-Beschreibungen in der kleinen Schrift. Eine Zeile pro Eintrag (das Spiel zeigt 4-6 Zeilen auf einmal); die Länge jeder Zeile muss exakt gleich bleiben. Sätze können in der nächsten Zeile weitergehen. Erlaubt: Buchstaben (keine Umlaute), Ziffern und . , - ' / sowie Leerzeichen.",
      dlRom: "ROM herunterladen", dlBps: "Patch (.bps)", dlIps: "Patch (.ips)",
      exportBtn: "Änderungen sichern…", importBtn: "Änderungen laden…", resetBtn: "Alles zurücksetzen",
      resetConfirm: "Alle {n} Änderungen verwerfen?",
      changes: "{n} geändert", errorsN: "{n} Probleme",
      colOff: "Offset", colOrig: "Original", colNew: "Neuer Text", colLen: "Länge",
      empty: "Nichts anzuzeigen.", prev: "‹ Zurück", next: "Weiter ›", rows: "{a}–{b} von {c}",
      romOk: "erwartete ROM", romBad: "andere ROM",
      bannerWrong: "Das ist nicht die erwartete ROM (Europe, CRC32 CBA724BA). Die Offsets stimmen vermutlich nicht. Änderungen auf eigene Gefahr und das Ergebnis genau prüfen.",
      bannerHeader: "Es wurde ein 512-Byte-Copier-Header gefunden. Er bleibt in der gespeicherten ROM erhalten; Patches beziehen sich auf die ROM ohne Header.",
      loadFailed: "Diese Datei sieht nicht nach International Superstar Soccer Deluxe (Europe) aus.",
      tooBig: "Die Datei ist für eine SNES-ROM dieses Spiels zu groß.",
      hMax: "max. {max}", hExact: "genau {max}",
      btnReset: "Zurück", reset: "Änderung an dieser Zeile rückgängig machen",
      eBadChar: "„{c}“ ist nicht im Zeichensatz des Spiels. Erlaubt: Buchstaben (keine Umlaute), Ziffern und {allowed} sowie Leerzeichen. Rohbytes als \\xNN.",
      eBadEsc: "Ungültige Escape-Folge bei „{c}“. \\xNN (zwei Hex-Ziffern) verwenden.",
      eNames: "{len} Zeichen, max. {max}.",
      eExact: "{len} Zeichen, es müssen genau {max} sein (Leerzeichen mitzählen).",
      eUnknown: "Unbekannter Eintrag.",
      errorsTitle: "Die ROM wurde nicht gebaut:",
      jump: "anzeigen",
      toastBuilt: "Fertig: {n} Stellen geändert, Prüfsumme korrigiert.",
      toastPatch: "Patch erstellt ({size} Byte).",
      toastNoChange: "Noch keine Änderungen. Bearbeite zuerst ein paar Texte.",
      toastRestored: "{n} Änderungen aus der letzten Sitzung wiederhergestellt.",
      toastImported: "{n} Änderungen geladen.",
      toastImportBad: "Die Datei gehört nicht zu dieser ROM oder ist keine Änderungsdatei.",
      footLegal: "Fan-Tool ohne Verbindung zu den Rechteinhabern des Spiels. Es sind keine ROM und keine Spieldaten enthalten, bring deine eigene Kopie mit. Nichts, was du lädst, verlässt diese Seite.",
    },
  };
  let ui = (navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  try { ui = localStorage.getItem("issd.ui") || ui; } catch (e) { /* storage blocked */ }
  const t = (k, v) => String(I18N[ui][k]).replace(/\{(\w+)\}/g, (_, n) => (v && n in v ? v[n] : ""));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // --- state -----------------------------------------------------------------
  const S = {
    name: "", header: null, rom: null, parsed: null, crc: 0, sha1: "",
    items: { names: [], texts: [], prose: [] }, byId: new Map(),
    tab: "names", filter: { names: "0", prose: "all" }, search: "", onlyChanged: false, page: 0,
  };

  // --- static texts ------------------------------------------------------------
  function applyTexts() {
    document.documentElement.lang = ui;
    $("langBtn").textContent = ui === "de" ? "EN" : "DE";
    $("privacyChip").textContent = t("privacy");
    $("heroTitle").textContent = t("heroTitle");
    $("heroLead").textContent = t("heroLead");
    $("dropTitle").textContent = t("dropTitle");
    $("dropOr").textContent = t("dropOr");
    $("dropHint").textContent = t("dropHint");
    $("search").placeholder = t("search");
    $("onlyChangedLabel").textContent = t("onlyChanged");
    $("dlRom").textContent = t("dlRom");
    $("dlBps").textContent = t("dlBps");
    $("dlIps").textContent = t("dlIps");
    $("exportBtn").textContent = t("exportBtn");
    $("importBtn").textContent = t("importBtn");
    $("resetBtn").textContent = t("resetBtn");
    $("footLegal").textContent = t("footLegal");
    if (S.rom) { renderTabs(); renderTeams(); renderInfo(); render(); }
  }

  // --- item helpers ------------------------------------------------------------
  const changed = (it) => it.text !== it.ui;
  const allItems = () => [...S.items.names, ...S.items.texts, ...S.items.prose];
  const teamLabel = (i) => `${String(i + 1).padStart(2, "0")} ${K.TEAM_GUESS[i]}`;

  function check(it) {
    if (!changed(it)) return { bytes: it.orig };
    let bytes;
    try { bytes = K.uiToBytes(it.text, it.kind === "prose"); }
    catch (e) {
      const [code, c] = String(e.message).split(/:(.*)/s);
      return { err: t(code === "bad-escape" ? "eBadEsc" : "eBadChar", { c, allowed: it.kind === "prose" ? ". , - ' /" : ". ! ? ' - :" }) };
    }
    const len = bytes.length;
    if ((it.kind === "texts" || it.kind === "prose") && len !== it.max) return { bytes, err: t("eExact", { len, max: it.max }) };
    if (it.kind === "names" && len > it.max) return { bytes, err: t("eNames", { len, max: it.max }) };
    return { bytes };
  }

  const hint = (it) => t(it.kind === "names" ? "hMax" : "hExact", { max: it.max });

  // --- rendering ---------------------------------------------------------------
  function renderTabs() {
    const tabs = [["names", "tabNames"], ["texts", "tabTexts"], ["prose", "tabProse"]];
    $("tabs").innerHTML = tabs.map(([id, k]) =>
      `<button class="tab" role="tab" type="button" data-tab="${id}" aria-selected="${S.tab === id}">${esc(t(k))} <small>${S.items[id].length}</small></button>`).join("");
  }

  const GROUP_KEY = { help: "gHelp", train: "gTrain", scenario: "gScenario" };

  function renderTeams() {
    const sel = $("team");
    sel.hidden = S.tab === "texts";
    if (S.tab === "names") {
      sel.innerHTML = `<option value="all">${esc(t("allTeams"))}</option>` +
        K.TEAM_GUESS.map((_, i) => `<option value="${i}">${esc(t("team"))} ${esc(teamLabel(i))}?</option>`).join("");
    } else if (S.tab === "prose") {
      const seen = new Map();
      for (const it of S.items.prose) if (!seen.has(it.start)) seen.set(it.start, it);
      sel.innerHTML = `<option value="all">${esc(t("allAreas"))}</option>` +
        [...seen.values()].map((it) => `<option value="${it.start}">${esc(t(GROUP_KEY[it.group]))} ${String(it.num).padStart(2, "0")}</option>`).join("");
    }
    if (S.tab !== "texts") sel.value = S.filter[S.tab];
    $("note").textContent = t(S.tab === "names" ? "noteNames" : S.tab === "prose" ? "noteProse" : "noteTexts");
  }

  function renderInfo() {
    const ok = K.isExpected(S.rom);
    const crc = S.crc.toString(16).toUpperCase().padStart(8, "0");
    const shaOk = S.sha1 && S.sha1 === K.C.EXPECTED_SHA1;
    $("romInfo").innerHTML =
      `<span>${esc(S.name)}</span><span>${(S.rom.length + S.header.length).toLocaleString(ui)} bytes</span>` +
      `<span class="${ok ? "ok" : "bad"}">CRC32 ${crc} · ${esc(t(ok ? "romOk" : "romBad"))}</span>` +
      (S.sha1 ? `<span class="${shaOk ? "ok" : "bad"}">SHA-1 ${S.sha1.slice(0, 10)}…</span>` : "");
    const b = $("romBanner");
    const msgs = [];
    if (!ok) msgs.push(t("bannerWrong"));
    if (S.header.length) msgs.push(t("bannerHeader"));
    b.hidden = !msgs.length;
    b.innerHTML = msgs.map(esc).join("<br>");
  }

  function filtered() {
    const q = S.search.trim().toLowerCase();
    let list = S.items[S.tab];
    if (S.tab === "names" && S.filter.names !== "all") list = list.filter((it) => it.team === Number(S.filter.names));
    if (S.tab === "prose" && S.filter.prose !== "all") list = list.filter((it) => it.start === Number(S.filter.prose));
    if (S.onlyChanged) list = list.filter(changed);
    if (q) list = list.filter((it) => it.ui.toLowerCase().includes(q) || it.text.toLowerCase().includes(q) || K.hex(it.off).includes(q));
    return list;
  }

  function rowHtml(it) {
    return `<div class="row" data-id="${it.id}">` +
      `<span class="off">${K.hex(it.off)}</span>` +
      `<span class="orig" title="${esc(it.ui)}">${esc(it.ui) || "&nbsp;"}</span>` +
      `<input class="txt" data-id="${it.id}" value="${esc(it.text)}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="${esc(t("colNew"))} ${K.hex(it.off)}">` +
      `<span class="cnt"></span>` +
      `<span class="rbtns"><button type="button" data-act="reset" title="${esc(t("reset"))}" hidden>${esc(t("btnReset"))}</button></span></div>`;
  }

  function updateRow(row, it) {
    const c = check(it);
    const len = c.bytes ? c.bytes.length : it.text.length;
    row.classList.toggle("changed", changed(it));
    row.classList.toggle("err", !!c.err);
    row.querySelector(".cnt").textContent = `${len}/${it.max}`;
    row.querySelector(".cnt").title = hint(it);
    row.querySelector('[data-act="reset"]').hidden = !changed(it);
    let msg = row.querySelector(".rowmsg");
    if (c.err) {
      if (!msg) { msg = document.createElement("div"); msg.className = "rowmsg"; row.appendChild(msg); }
      msg.textContent = c.err;
    } else if (msg) msg.remove();
  }

  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    S.page = Math.min(S.page, pages - 1);
    const slice = list.slice(S.page * PAGE, (S.page + 1) * PAGE);
    const head = `<div class="row head"><span>${esc(t("colOff"))}</span><span>${esc(t("colOrig"))}</span><span>${esc(t("colNew"))}</span><span style="text-align:right">${esc(t("colLen"))}</span><span></span></div>`;
    $("rows").innerHTML = slice.length ? head + slice.map(rowHtml).join("") : `<div class="empty">${esc(t("empty"))}</div>`;
    $("rows").querySelectorAll(".row[data-id]").forEach((row) => updateRow(row, S.byId.get(row.dataset.id)));
    $("pager").innerHTML = list.length > PAGE
      ? `<button class="btn" type="button" data-page="-1" ${S.page === 0 ? "disabled" : ""}>${esc(t("prev"))}</button>` +
        `<span>${esc(t("rows", { a: S.page * PAGE + 1, b: S.page * PAGE + slice.length, c: list.length }))}</span>` +
        `<button class="btn" type="button" data-page="1" ${S.page >= pages - 1 ? "disabled" : ""}>${esc(t("next"))}</button>`
      : "";
    renderSummary();
  }

  function renderSummary() {
    let n = 0, e = 0;
    for (const it of allItems()) if (changed(it)) { n++; if (check(it).err) e++; }
    $("summary").innerHTML = `<b>${esc(t("changes", { n }))}</b>` + (e ? ` · <span class="e">${esc(t("errorsN", { n: e }))}</span>` : "");
  }

  // --- autosave / import / export ----------------------------------------------
  const storeKey = () => "issd.edits." + S.crc.toString(16);
  const crcHex = () => S.crc.toString(16).toUpperCase().padStart(8, "0");
  const editsObject = () => {
    const edits = [];
    for (const it of allItems()) if (changed(it)) edits.push({ k: it.kind, o: it.off, t: it.text });
    return { app: "issd-text-studio", version: 1, rom_crc32: crcHex(), edits };
  };
  let saveTimer = 0;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const o = editsObject();
        if (o.edits.length) localStorage.setItem(storeKey(), JSON.stringify(o));
        else localStorage.removeItem(storeKey());
      } catch (e) { /* storage blocked: fine */ }
    }, 400);
  }
  function applyEdits(obj) {
    let n = 0;
    for (const e of obj.edits || []) {
      const it = S.byId.get(`${e.k}:${e.o}`);
      if (it && typeof e.t === "string") { it.text = e.t; n++; }
    }
    return n;
  }

  // --- building ----------------------------------------------------------------
  function showErrors(list) {
    const box = $("errors");
    if (!list.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = `<b>${esc(t("errorsTitle"))}</b><ul>` + list.slice(0, 12).map((x) =>
      `<li>${x.id ? `<code>${K.hex(S.byId.get(x.id).off)}</code> ` : ""}${esc(x.msg)}` +
      (x.id ? ` <button type="button" class="link" data-jump="${esc(x.id)}">${esc(t("jump"))}</button>` : "") + `</li>`).join("") +
      (list.length > 12 ? `<li>… +${list.length - 12}</li>` : "") + "</ul>";
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function coreMessage(e) {
    const it = e.off !== undefined ? S.byId.get(`${e.kind}:${e.off}`) : null;
    const id = it ? it.id : null;
    switch (e.code) {
      case "too-long": return { id, msg: t("eNames", e) };
      case "exact": return { id, msg: t("eExact", e) };
      default: return { id, msg: t("eUnknown") };
    }
  }

  function build() {
    const edits = { texts: new Map(), names: new Map(), prose: new Map() };
    const problems = [];
    for (const it of allItems()) {
      if (!changed(it)) continue;
      const c = check(it);
      if (c.err) problems.push({ id: it.id, msg: c.err });
      else edits[it.kind].set(it.off, c.bytes);
    }
    if (problems.length) { showErrors(problems); return null; }
    const r = K.buildChanges(S.rom, S.parsed, edits);
    if (r.errors.length) { showErrors(r.errors.map(coreMessage)); return null; }
    showErrors([]);
    return { out: K.applyChanges(S.rom, r.changes), count: r.changes.length };
  }

  function download(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type: type || "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const baseName = () => S.name.replace(/\.[^.]+$/, "");

  let toastTimer = 0;
  function toast(msg, isErr) {
    const el = $("toast");
    el.textContent = msg; el.className = "toast" + (isErr ? " err" : ""); el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isErr ? 7000 : 4500);
  }

  // --- loading a ROM -------------------------------------------------------------
  async function sha1Hex(bytes) {
    try {
      if (!(window.crypto && crypto.subtle)) return "";
      const d = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
      return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { return ""; }
  }

  function showLoadError(msg) { const b = $("loadError"); b.hidden = !msg; b.textContent = msg || ""; }

  async function loadFile(file) {
    showLoadError("");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return showLoadError(t("tooBig"));
    let parts, parsed;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      parts = K.splitHeader(bytes);
      if (!K.looksLikeIssd(parts.rom)) throw new Error("no tables");
      parsed = K.parseRom(parts.rom);
    } catch (e) { return showLoadError(t("loadFailed")); }

    S.name = file.name; S.header = parts.header; S.rom = parts.rom; S.parsed = parsed;
    S.crc = K.crc32(parts.rom);
    S.sha1 = await sha1Hex(parts.rom);
    S.byId = new Map();
    for (const kind of ["names", "texts", "prose"]) {
      S.items[kind] = parsed[kind].map((p) => {
        const it = { ...p, id: `${kind}:${p.off}`, ui: K.bytesToUi(p.orig, kind === "prose") };
        it.text = it.ui;
        S.byId.set(it.id, it);
        return it;
      });
    }
    S.tab = "names"; S.filter = { names: "0", prose: "all" }; S.page = 0; S.search = ""; $("search").value = "";
    let restored = 0;
    try {
      const saved = localStorage.getItem(storeKey());
      if (saved) restored = applyEdits(JSON.parse(saved));
    } catch (e) { /* ignore broken or blocked storage */ }

    $("intro").hidden = true; $("studio").hidden = false;
    showErrors([]);
    renderTabs(); renderTeams(); renderInfo(); render();
    window.scrollTo({ top: 0 });
    if (restored) toast(t("toastRestored", { n: restored }));
  }

  // --- events --------------------------------------------------------------------
  const drop = $("drop");
  $("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));
  // dropping a file anywhere else must not make the browser open it
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => { if (!drop.contains(e.target)) e.preventDefault(); });

  $("langBtn").addEventListener("click", () => {
    ui = ui === "de" ? "en" : "de";
    try { localStorage.setItem("issd.ui", ui); } catch (e) { /* ignore */ }
    applyTexts();
  });

  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    S.tab = b.dataset.tab; S.page = 0;
    renderTabs(); renderTeams(); render();
  });
  $("team").addEventListener("change", (e) => { S.filter[S.tab] = e.target.value; S.page = 0; render(); });
  $("search").addEventListener("input", (e) => { S.search = e.target.value; S.page = 0; render(); });
  $("onlyChanged").addEventListener("change", (e) => { S.onlyChanged = e.target.checked; S.page = 0; render(); });
  $("pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b) return;
    S.page += Number(b.dataset.page);
    render();
    $("rows").scrollIntoView({ block: "start" });
  });

  $("rows").addEventListener("input", (e) => {
    const input = e.target.closest(".txt");
    if (!input) return;
    const it = S.byId.get(input.dataset.id);
    it.text = input.value;
    updateRow(input.closest(".row"), it);
    renderSummary();
    autosave();
  });
  $("rows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const row = b.closest(".row");
    const it = S.byId.get(row.dataset.id);
    it.text = it.ui;
    row.querySelector(".txt").value = it.text;
    updateRow(row, it); renderSummary(); autosave();
    if (S.onlyChanged) render();
  });

  $("errors").addEventListener("click", (e) => {
    const b = e.target.closest("[data-jump]");
    if (!b) return;
    const it = S.byId.get(b.dataset.jump);
    S.tab = it.kind;
    if (it.kind === "names") S.filter.names = String(it.team);
    else if (it.kind === "prose") S.filter.prose = String(it.start);
    S.search = ""; $("search").value = ""; S.onlyChanged = false; $("onlyChanged").checked = false;
    S.page = Math.max(0, Math.floor(filtered().indexOf(it) / PAGE));
    renderTabs(); renderTeams(); render();
    const row = $("rows").querySelector(`.row[data-id="${CSS.escape(it.id)}"]`);
    if (row) { row.scrollIntoView({ block: "center" }); row.classList.add("flash"); row.querySelector(".txt").focus(); }
  });

  $("dlRom").addEventListener("click", () => {
    const r = build();
    if (!r) return;
    if (!r.count) return toast(t("toastNoChange"), true);
    const full = new Uint8Array(S.header.length + r.out.length);
    full.set(S.header); full.set(r.out, S.header.length);
    download(full, `${baseName()} - fixed.sfc`);
    toast(t("toastBuilt", { n: r.count }));
  });
  const patchBtn = (id, ext, make) => $(id).addEventListener("click", () => {
    const r = build();
    if (!r) return;
    if (!r.count) return toast(t("toastNoChange"), true);
    const data = make(S.rom, r.out);
    download(data, `${baseName()}.${ext}`);
    toast(t("toastPatch", { size: data.length }));
  });
  patchBtn("dlBps", "bps", K.makeBps);
  patchBtn("dlIps", "ips", K.makeIps);

  $("exportBtn").addEventListener("click", () => {
    const o = editsObject();
    if (!o.edits.length) return toast(t("toastNoChange"), true);
    download(JSON.stringify(o, null, 1), "issd-edits.json", "application/json");
  });
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      if (o.app !== "issd-text-studio" || o.rom_crc32 !== crcHex()) throw new Error("mismatch");
      const n = applyEdits(o);
      render(); autosave();
      toast(t("toastImported", { n }));
    } catch (err) { toast(t("toastImportBad"), true); }
  });
  $("resetBtn").addEventListener("click", () => {
    const n = allItems().filter(changed).length;
    if (!n || !window.confirm(t("resetConfirm", { n }))) return;
    for (const it of allItems()) it.text = it.ui;
    showErrors([]); render(); autosave();
  });

  applyTexts();
})();
