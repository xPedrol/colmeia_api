import PDFDocument from "pdfkit";
import fetch from "node-fetch";

const YELLOW = "#F2C94C";
const DARK = "#1C1C17";
const BROWN = "#7C5800";
const GREEN = "#0a7a3f";
const RED = "#a12a2a";
const GRAY = "#888888";

const LEFT = 48;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - LEFT * 2;
const FOOTER_Y = PAGE_H - 42;
const LABEL_COL = 290;
const VALUE_COL = CONTENT_W - LABEL_COL;
const ROW_H = 18;
const CHART_W = 460;
const CHART_H = 230;

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

const currency = (v) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const integer = (v) => Number(v ?? 0).toLocaleString("pt-BR");

function chartUrl(config) {
  return `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(config),
  )}&format=png&width=500&height=250`;
}

export async function generateUserSummaryPdf({
  userRepo,
  dashboardRepo,
  apiaryRepo,
  colmeiaRepo,
  expenseRepo,
  saleRepo,
  userId,
  year = new Date().getFullYear(),
}) {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const buffers = [];
  doc.on("data", (b) => buffers.push(b));

  const [user, summary, expensesByCategory, monthlyVisits, salesSummary] =
    await Promise.all([
      userRepo.getUserById(userId),
      dashboardRepo.getSummary(userId, year),
      dashboardRepo.getExpensesByCategory(userId, year),
      dashboardRepo.getMonthlyVisits(userId, year),
      dashboardRepo.getSalesSummary(userId, year),
    ]);

  doc.info.Title = `Resumo do Usuário — ${user?.name ?? "Usuário"}`;
  doc.info.Author = "ColmeiaOS";

  const totalExpenses = Number(salesSummary?.total_expenses ?? 0);
  const totalAmountSales = Number(salesSummary?.total_amount_sales ?? 0);
  const totalValueSales = Number(salesSummary?.total_value_sales ?? 0);
  const netProfit = totalValueSales - totalExpenses;

  // Two-column row — explicit y prevents cursor drift when text wraps
  function drawRow(label, value, color = DARK) {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(color)
      .text(label, LEFT, y, { width: LABEL_COL, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(color)
      .text(value, LEFT + LABEL_COL, y, { width: VALUE_COL, align: "right", lineBreak: false });
    doc.y = y + ROW_H;
  }

  function tableHeader(labelCol, valueCol) {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BROWN)
      .text(labelCol, LEFT, y, { width: LABEL_COL, lineBreak: false });
    doc.text(valueCol, LEFT + LABEL_COL, y, { width: VALUE_COL, align: "right", lineBreak: false });
    doc.y = y + ROW_H;
    doc.moveTo(LEFT, doc.y).lineTo(PAGE_W - LEFT, doc.y).strokeColor(BROWN).lineWidth(0.5).stroke();
    doc.y += 6;
    doc.font("Helvetica").fillColor(DARK);
  }

  function sectionTitle(title) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(BROWN).text(title);
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor(DARK);
  }

  function ensureSpace(needed) {
    if (doc.y + needed > FOOTER_Y) doc.addPage();
  }

  function embedChart(imgBuffer) {
    if (!imgBuffer) return;
    ensureSpace(CHART_H + 20);
    doc.moveDown(0.5);
    const x = LEFT + (CONTENT_W - CHART_W) / 2;
    doc.image(imgBuffer, x, doc.y, { width: CHART_W, height: CHART_H });
    doc.y += CHART_H + 10;
  }

  // ── Page 1: Summary ───────────────────────────────────────────────────
  doc.save();
  doc.rect(0, 0, PAGE_W, 80).fill(YELLOW);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22)
    .text("Resumo do Usuário", 0, 28, { align: "center", width: PAGE_W });
  doc.restore();

  doc.y = 100;
  doc.font("Helvetica").fontSize(11).fillColor(DARK)
    .text(`${user?.name ?? "Usuário"} — ${user?.email ?? ""}`)
    .text(`Ano: ${year}`)
    .text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);

  sectionTitle("Visão geral");
  drawRow("Total de apiários:", integer(summary?.total_apiaries ?? 0));
  drawRow("Total de visitas (ano):", integer(summary?.total_visits ?? 0));
  drawRow("Novas melgueiras (ano):", integer(summary?.total_new_swarm ?? 0));
  drawRow("Melgueiras removidas (ano):", integer(summary?.total_removed_swarm ?? 0));

  sectionTitle("Financeiro");
  drawRow("Total despesas (ano):", currency(totalExpenses));
  drawRow("Total vendas (quantidade):", integer(totalAmountSales));
  drawRow("Total vendas (valor):", currency(totalValueSales));
  drawRow(
    netProfit >= 0 ? "Lucro líquido:" : "Prejuízo líquido:",
    currency(netProfit),
    netProfit >= 0 ? GREEN : RED,
  );

  // Pre-fetch charts in parallel only when data exists
  const topCategories = (expensesByCategory ?? []).slice(0, 10);

  const [expensesImg, monthlyImg] = await Promise.all([
    topCategories.length > 0
      ? fetchImageBuffer(
          chartUrl({
            type: "pie",
            data: {
              labels: topCategories.map((c) => c.category_name),
              datasets: [{ data: topCategories.map((c) => Number(c.total_value)) }],
            },
          }),
        )
      : Promise.resolve(null),
    (monthlyVisits?.length ?? 0) > 0
      ? fetchImageBuffer(
          chartUrl({
            type: "bar",
            data: {
              labels: monthlyVisits.map((m) => m.month),
              datasets: [{ label: "Visitas", data: monthlyVisits.map((m) => Number(m.total_visits)) }],
            },
          }),
        )
      : Promise.resolve(null),
  ]);

  // ── Page 2: Expenses by category ──────────────────────────────────────
  if (topCategories.length > 0 || expensesImg) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).fillColor(DARK)
      .text("Despesas por categoria", { align: "center" });
    doc.moveDown();

    if (topCategories.length > 0) {
      tableHeader("Categoria", "Valor (R$)");
      for (const c of topCategories) {
        ensureSpace(ROW_H);
        drawRow(c.category_name, currency(Number(c.total_value ?? 0)));
      }
    }

    embedChart(expensesImg);
  }

  // ── Page 3: Monthly visits ────────────────────────────────────────────
  if ((monthlyVisits?.length ?? 0) > 0 || monthlyImg) {
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(14).fillColor(DARK)
      .text("Visitas mensais", { align: "center" });
    doc.moveDown();

    if ((monthlyVisits?.length ?? 0) > 0) {
      tableHeader("Mês", "Visitas");
      for (const m of monthlyVisits) {
        ensureSpace(ROW_H);
        drawRow(m.month, integer(m.total_visits ?? 0));
      }
    }

    embedChart(monthlyImg);
  }

  // ── Page footers ──────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = range.start; i < range.start + total; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(9).fillColor(GRAY)
      .text(`ColmeiaOS • Página ${i + 1} de ${total}`, LEFT, FOOTER_Y, {
        width: CONTENT_W,
        align: "center",
      });
  }

  doc.end();
  await new Promise((res) => doc.on("end", res));
  return Buffer.concat(buffers);
}

export default { generateUserSummaryPdf };
