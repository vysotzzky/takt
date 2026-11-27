import { createClient } from "@supabase/supabase-js";
import "./style.css";
import { mountShift } from "./shift.js";

const app = document.querySelector("#app");
let supabase;
let unmount = () => {};

function publicConfiguration() {
  const url = new URL(import.meta.env.VITE_SUPABASE_URL || "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!(url.protocol === "https:" || localHttp) || !key?.startsWith("sb_publishable_")) {
    throw new Error("Brakuje poprawnego adresu lub klucza publishable Supabase.");
  }
  return { url: url.origin, key };
}

function showTemplate(id) {
  unmount();
  unmount = () => {};
  app.replaceChildren(document.querySelector("#" + id).content.cloneNode(true));
  app.setAttribute("aria-busy", "false");
  return app.querySelector("section");
}

function showInfo(title, detail, retry) {
  const section = document.createElement("section");
  section.className = "panel";
  const heading = document.createElement("h1");
  heading.textContent = title;
  const message = document.createElement("p");
  message.textContent = detail;
  section.append(heading, message);
  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Spróbuj ponownie";
    button.onclick = retry;
    section.append(button);
  }
  app.replaceChildren(section);
  app.setAttribute("aria-busy", "false");
}

function displayError(section, message) {
  const line = section.querySelector(".message");
  line.textContent = message;
  line.hidden = !message;
}

function showLogin(message = "") {
  const section = showTemplate("login");
  const form = section.querySelector("form");
  const submit = form.querySelector("button");
  displayError(section, message);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    displayError(section, "");
    const fields = new FormData(form);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(fields.get("email")).trim(),
        password: String(fields.get("password")),
      });
      if (error) {
        displayError(section, error.status === 400
          ? "Nie udało się zalogować. Sprawdź e-mail i hasło."
          : "Nie udało się połączyć z usługą logowania. Spróbuj ponownie.");
        return;
      }
      form.querySelector("#password").value = "";
      await showAccount(data.session);
    } catch {
      displayError(section, "Nie udało się połączyć z usługą logowania. Spróbuj ponownie.");
    } finally {
      submit.disabled = false;
    }
  };
}

async function showAccount(session) {
  if (!session) {
    showLogin();
    return;
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    showInfo("Nie udało się wczytać konta", "Sprawdź połączenie i konfigurację bazy.", boot);
    return;
  }
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    showLogin("Konto nie ma aktywnego profilu w Takt. Skontaktuj się z administratorem.");
    return;
  }
  const section = showTemplate("profile");
  section.querySelector("h1").textContent = profile.display_name;
  section.querySelector("#account-role").textContent = profile.role === "admin" ? "Administrator" : "Pracownik";
  const signOut = section.querySelector("#sign-out");
  if (profile.role === "employee") unmount = mountShift(section, supabase, session.user.id);
  signOut.onclick = async () => {
    signOut.disabled = true;
    try {
      const { error: logoutError } = await supabase.auth.signOut({ scope: "local" });
      if (logoutError) throw logoutError;
      showLogin();
    } catch {
      displayError(section, "Nie udało się zakończyć sesji. Spróbuj ponownie.");
    } finally {
      signOut.disabled = false;
    }
  };
}

async function boot() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await showAccount(data.session);
  } catch {
    showInfo("Nie udało się wczytać Takt", "Sprawdź połączenie z Supabase.", boot);
  }
}

try {
  const { url, key } = publicConfiguration();
  supabase = createClient(url, key);
  boot();
} catch {
  showInfo("Skonfiguruj Supabase", "Uzupełnij plik .env.local według README i uruchom ponownie serwer deweloperski.");
}
