const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found");
}

const root: HTMLElement = rootElement;

function renderStartupState(message: string, isError = false) {
  const shell = document.createElement("main");
  shell.setAttribute("role", isError ? "alert" : "status");
  shell.setAttribute("aria-live", "polite");
  shell.style.cssText = [
    "min-height:100vh",
    "display:grid",
    "place-items:center",
    "padding:24px",
    "direction:rtl",
    "font-family:Vazirmatn,Tahoma,sans-serif",
    "background:#f7f5fb",
    "color:#241632",
    "text-align:center",
  ].join(";");

  const panel = document.createElement("section");
  panel.style.cssText = [
    "width:min(460px,100%)",
    "padding:28px",
    "border:1px solid rgba(83,45,111,.16)",
    "border-radius:18px",
    "background:#fff",
    "box-shadow:0 18px 55px rgba(63,35,82,.10)",
  ].join(";");

  const title = document.createElement("h1");
  title.textContent = isError ? "بارگذاری سامانه با خطا روبه‌رو شد" : "در حال بارگذاری سامانه";
  title.style.cssText = "margin:0 0 10px;font-size:20px;font-weight:800";

  const description = document.createElement("p");
  description.textContent = message;
  description.style.cssText = "margin:0;color:#6b5b76;font-size:14px;line-height:1.9";

  panel.append(title, description);

  if (isError) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "تلاش دوباره";
    retry.style.cssText = [
      "margin-top:18px",
      "border:0",
      "border-radius:10px",
      "padding:10px 18px",
      "background:#7900dd",
      "color:#fff",
      "font:inherit",
      "font-weight:700",
      "cursor:pointer",
    ].join(";");
    retry.addEventListener("click", () => window.location.reload());
    panel.append(retry);
  }

  shell.append(panel);
  root.replaceChildren(shell);
}

renderStartupState("لطفاً چند لحظه منتظر بمانید…");

void import("./bootstrap")
  .then(({ mountApplication }) => mountApplication(root))
  .catch((error: unknown) => {
    console.error("[startup] Application bootstrap failed", error);
    renderStartupState("اتصال برقرار است، اما رابط کاربری اجرا نشد. صفحه را دوباره بارگذاری کنید.", true);
  });
