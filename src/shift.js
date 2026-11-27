const warsaw = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "medium",
});

export function elapsed(start, end) {
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}

function place(lat, lng, accuracy) {
  const link = document.createElement("a");
  const url = new URL("https://www.google.com/maps/search/");
  url.search = new URLSearchParams({ api: "1", query: [lat, lng].join(",") });
  link.href = url.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Otwórz w Google Maps";
  return [link, document.createTextNode(" · dokładność " + Math.ceil(accuracy) + " m")];
}

export function mountShift(section, client, user) {
  const panel = document.querySelector("#shift-panel").content.cloneNode(true);
  section.querySelector("#sign-out").before(panel);
  const find = selector => section.querySelector(selector);
  const status = find("#shift-status"), clock = find("#elapsed"), action = find("#shift-action");
  let last, clearEditor, timer, version = 0, mounted = true;

  function tick() {
    clock.textContent = last ? elapsed(Date.parse(last.started_at), last.ended_at ? Date.parse(last.ended_at) : Date.now()) : "00:00:00";
  }
  async function refresh() {
    const current = ++version;
    action.disabled = true;
    const { data, error } = await client.from("shifts")
      .select("id,started_at,ended_at,evidence(kind,latitude,longitude,accuracy_m)")
      .eq("employee_id", user).order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (!mounted || current !== version) return;
    if (error) {
      status.textContent = "Nie udało się pobrać zmiany. Sprawdź połączenie.";
      action.textContent = "Odśwież status"; action.onclick = refresh; action.disabled = false;
      return;
    }
    last = data;
    const active = last && !last.ended_at;
    status.textContent = active ? "W pracy" : "Poza pracą";
    status.className = active ? "active-state" : "";
    action.textContent = active ? "Zakończ zmianę" : "Rozpocznij zmianę";
    find("#shift-time").textContent = last ? (active
      ? "Początek · " + warsaw.format(new Date(last.started_at))
      : "Ostatnia zmiana · " + warsaw.format(new Date(last.started_at)) + " – " + warsaw.format(new Date(last.ended_at))) + " (czas polski)" : "";
    tick();
    const log = find("#recent-proof");
    log.replaceChildren();
    for (const item of (last?.evidence ?? []).slice().sort((a,b) => a.kind.localeCompare(b.kind))) {
      const line = document.createElement("p");
      line.append(item.kind === "start" ? "Początek · " : "Koniec · ", ...place(item.latitude, item.longitude, item.accuracy_m));
      log.append(line);
    }
    action.disabled = false;
    action.onclick = () => {
      if (clearEditor) return;
      action.hidden = true;
      clearEditor = openProof(section, client, user, active ? last.id : null, () => {
        clearEditor = undefined; action.hidden = false; refresh();
      });
    };
  }
  const onFocus = () => { if (!document.hidden && !clearEditor && mounted) refresh(); };
  timer = setInterval(tick, 1000);
  document.addEventListener("visibilitychange", onFocus);
  refresh();
  return () => {
    mounted = false; clearInterval(timer); clearEditor?.();
    document.removeEventListener("visibilitychange", onFocus);
  };
}

function openProof(section, client, user, shiftId, onClose) {
  const editor = document.querySelector("#proof-editor").content.firstElementChild.cloneNode(true);
  section.querySelector("#shift-action").after(editor);
  const get = selector => editor.querySelector(selector);
  const title = get("h3"), video = get("video"), preview = get(".preview");
  const photoButton = get("#photo"), geoButton = get("#geo"), save = get("#save-proof"), cancel = get("#cancel");
  const cameraStatus = get("#camera-status"), geoStatus = get("#geo-status"), saveStatus = get("#save-status");
  const signOut = section.querySelector("#sign-out");
  title.textContent = shiftId ? "Potwierdź koniec zmiany" : "Potwierdź początek zmiany";
  title.focus();
  let stream, photo, coords, imageUrl, disposed = false, submitted = false, uploaded = false;
  const request = crypto.randomUUID();
  const stopCamera = () => { stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null; video.hidden = true; };
  function dispose() {
    disposed = true; stopCamera(); if (imageUrl) URL.revokeObjectURL(imageUrl); editor.remove();
    window.removeEventListener("pagehide", stopCamera);
  }
  function close() { dispose(); onClose(); }
  window.addEventListener("pagehide", stopCamera);
  cancel.onclick = close;
  function ready() { save.disabled = !(photo && coords); }
  photoButton.onclick = async () => {
    photoButton.disabled = true; save.disabled = true;
    try {
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera_unavailable");
        const next = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}, audio:false});
        if (disposed) { next.getTracks().forEach(track => track.stop()); return; }
        stream = next; video.srcObject = stream; video.hidden = false; await video.play();
        preview.hidden = true; photo = null; ready();
        photoButton.textContent = "Zrób zdjęcie"; cameraStatus.textContent = "";
      } else {
        if (!video.videoWidth || !video.videoHeight) throw new Error("frame_unavailable");
        const ratio = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1,Math.round(video.videoWidth * ratio));
        canvas.height = Math.max(1,Math.round(video.videoHeight * ratio));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
        if (disposed) return;
        if (!blob || blob.size > 3145728) throw new Error("image_size");
        photo = blob; if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = URL.createObjectURL(blob); preview.src = imageUrl; preview.hidden = false;
        stopCamera(); photoButton.textContent = "Powtórz zdjęcie"; cameraStatus.textContent = "Zdjęcie gotowe."; ready();
      }
    } catch (e) {
      stopCamera(); photoButton.textContent = "Włącz kamerę";
      cameraStatus.textContent = e.name === "NotAllowedError" ? "Zezwól na dostęp do kamery w przeglądarce i włącz ją ponownie."
        : "Brak obrazu. Sprawdź, czy kamera jest podłączona i dostępna dla przeglądarki.";
    } finally { photoButton.disabled = submitted; if (!submitted) ready(); }
  };
  geoButton.onclick = () => {
    if (!navigator.geolocation) { geoStatus.textContent = "Ta przeglądarka nie udostępnia lokalizacji."; return; }
    geoButton.disabled = true; coords = null; ready(); geoStatus.textContent = "Pobieranie lokalizacji…";
    navigator.geolocation.getCurrentPosition(position => {
      if (disposed) return;
      coords = position.coords; geoStatus.replaceChildren(...place(coords.latitude, coords.longitude, coords.accuracy));
      geoButton.disabled = false; ready();
    }, error => {
      if (disposed) return;
      geoStatus.textContent = error.code === 1 ? "Zezwól na lokalizację w przeglądarce i ustawieniach systemu."
        : "Nie udało się ustalić miejsca. Spróbuj ponownie.";
      geoButton.disabled = false; ready();
    }, {enableHighAccuracy:true, timeout:15000, maximumAge:0});
  };
  save.onclick = async () => {
    if (!photo || !coords || save.disabled) return;
    submitted = true; save.disabled = true; photoButton.disabled = true; geoButton.disabled = true;
    cancel.disabled = true; signOut.disabled = true; saveStatus.textContent = "Zapisywanie…";
    try {
      if (!uploaded) {
        const result = await client.storage.from("takt-evidence").upload(user + "/" + request + ".jpg", photo, {contentType:"image/jpeg", upsert:false});
        if (result.error && !["409", "Duplicate", "ResourceAlreadyExists"].includes(String(result.error.statusCode))
          && !["Duplicate", "ResourceAlreadyExists"].includes(result.error.code)) throw result.error;
        uploaded = true;
      }
      const {error} = await client.rpc("record_shift_event", {event_kind:shiftId ? "stop":"start", event_id:request,
        expected_shift:shiftId, lat:coords.latitude, lng:coords.longitude, accuracy:coords.accuracy});
      if (error) throw error;
      if (!disposed) close();
    } catch (e) {
      if (disposed) return;
      if (e.message === "shift_changed") {
        saveStatus.textContent = "Status zmiany już się zmienił. Zamknij formularz i sprawdź pulpit.";
      } else {
        saveStatus.textContent = "Nie potwierdzono zapisu. Sprawdź internet i ponów próbę.";
        save.textContent = "Ponów zapis"; save.disabled = false;
      }
    } finally { cancel.disabled = false; signOut.disabled = false; }
  };
  return dispose;
}
