import fetch from "node-fetch";

const [version, apkUrl] = process.argv.slice(2);
const apiBaseUrl = (
  process.env.API_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

function usage() {
  console.log(`Uso:
  node scripts/set-app-version.js <versao> <apkUrl>

Variáveis de ambiente:
  API_BASE_URL  URL da API (padrão: http://localhost:3000)

Exemplo:
  API_BASE_URL=https://api.exemplo.com \\
    node scripts/set-app-version.js 1.0.1 https://exemplo.com/app.apk
`);
}

async function setAppVersion() {
  if (!version || !apkUrl) {
    usage();
    process.exit(1);
  }

  const response = await fetch(`${apiBaseUrl}/app-version`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, apkUrl }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  console.log("Versão cadastrada:", data);
}

setAppVersion().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
