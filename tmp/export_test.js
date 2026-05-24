import fs from "fs";

const base = "http://127.0.0.1:3000";
const email = "pdf-test@example.com";
const password = "password123";

async function register() {
  const res = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "PDF Test", email, password }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function callExport(token) {
  const res = await fetch(`${base}/export/user-summary`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("status", res.status, res.headers.get("content-type"));
  if (res.headers.get("content-type")?.includes("application/pdf")) {
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync("user-summary.pdf", Buffer.from(arrayBuffer));
    console.log("Wrote user-summary.pdf");
    return;
  }
  const json = await res.json();
  if (json?.base64) {
    fs.writeFileSync("user-summary.pdf", Buffer.from(json.base64, "base64"));
    console.log("Wrote user-summary.pdf from base64");
    return;
  }
  console.error("Response:", json);
}

(async () => {
  try {
    let r = await register();
    if (r?.error) {
      console.log("Register returned error:", r.error);
    } else {
      console.log("Register ok");
    }
    let l = await login();
    if (l?.error) {
      console.error("Login failed:", l.error);
      process.exit(1);
    }
    console.log("Token received");
    await callExport(l.token);
  } catch (err) {
    console.error("Script error", err);
  }
})();
