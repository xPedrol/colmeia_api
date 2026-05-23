import PDFDocument from "pdfkit";
import fetch from "node-fetch";

const C = {
  yellow:     "#F2C94C",
  dark:       "#1C1C17",
  brown:      "#7C5800",
  mutedBrown: "#9A6B10",
  green:      "#0a7a3f",
  greenBg:    "#E8F5EE",
  red:        "#a12a2a",
  redBg:      "#FAEAEA",
  gray:       "#888888",
  light:      "#F7F5F0",
  border:     "#DDD5BB",
  white:      "#FFFFFF",
};

const MARGIN = 48;
const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const CONTENT_W    = PAGE_W - MARGIN * 2;
const FOOTER_Y     = PAGE_H - 38;
const CONTENT_BOTTOM = FOOTER_Y - 16;
const LABEL_COL = 295;
const VALUE_COL = CONTENT_W - LABEL_COL;
const ROW_H   = 20;
const CHART_W = CONTENT_W;
const CHART_H = 220;

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
  )}&format=png&width=500&height=220`;
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
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
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

  doc.info.Title = `Relatório Anual ${year} — ${user?.name ?? "Usuário"}`;
  doc.info.Author = "ColmeiaOS";

  const totalExpenses    = Number(salesSummary?.total_expenses ?? 0);
  const totalAmountSales = Number(salesSummary?.total_amount_sales ?? 0);
  const totalValueSales  = Number(salesSummary?.total_value_sales ?? 0);
  const netProfit        = totalValueSales - totalExpenses;

  // ── Drawing helpers ───────────────────────────────────────────────────

  let rowIndex = 0;
  function resetRows() { rowIndex = 0; }

  // Two-column row; zebra stripe on even rows; value is always bold
  function drawRow(label, value, opts = {}) {
    const { color = C.dark, bg = null } = opts;
    const y = doc.y;
    const stripe = bg ?? (rowIndex % 2 === 0 ? C.light : null);
    if (stripe) doc.rect(MARGIN - 4, y - 1, CONTENT_W + 8, ROW_H).fill(stripe);
    rowIndex++;
    doc.font("Helvetica").fontSize(10).fillColor(C.dark)
      .text(label, MARGIN, y + 3, { width: LABEL_COL, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(color)
      .text(value, MARGIN + LABEL_COL, y + 3, { width: VALUE_COL, align: "right", lineBreak: false });
    doc.y = y + ROW_H;
  }

  // Solid header row for tables
  function tableHeader(left, right) {
    const y = doc.y;
    doc.rect(MARGIN - 4, y, CONTENT_W + 8, ROW_H + 4).fill(C.border);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.brown)
      .text(left, MARGIN, y + 5, { width: LABEL_COL, lineBreak: false });
    doc.text(right, MARGIN + LABEL_COL, y + 5, { width: VALUE_COL, align: "right", lineBreak: false });
    doc.y = y + ROW_H + 8;
    doc.font("Helvetica").fillColor(C.dark);
  }

  // Section heading with yellow left-accent bar
  function sectionTitle(title) {
    doc.moveDown(0.8);
    const y = doc.y;
    doc.rect(MARGIN, y, 3, 16).fill(C.yellow);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.dark)
      .text(title, MARGIN + 10, y + 2, { width: CONTENT_W - 10, lineBreak: false });
    doc.y = y + 24;
  }

  // Horizontal rule
  function divider(gap = 0.5) {
    doc.moveDown(gap);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
      .strokeColor(C.border).lineWidth(0.5).stroke();
    doc.moveDown(gap);
  }

  // 2-column KPI grid with accent-bordered cards
  function kpiGrid(items) {
    const gap  = 10;
    const cols = 2;
    const boxW = (CONTENT_W - gap * (cols - 1)) / cols;
    const boxH = 66;
    const startY = doc.y;

    items.forEach((item, i) => {
      const x = MARGIN + (i % cols) * (boxW + gap);
      const y = startY + Math.floor(i / cols) * (boxH + gap);
      doc.rect(x, y, boxW, boxH).fill(C.light);
      doc.rect(x, y, 4, boxH).fill(C.yellow);
      doc.fillColor(C.mutedBrown).font("Helvetica").fontSize(8)
        .text(item.label.toUpperCase(), x + 12, y + 12, { width: boxW - 20, lineBreak: false });
      doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(20)
        .text(item.value, x + 12, y + 30, { width: boxW - 20, lineBreak: false });
    });

    const rows = Math.ceil(items.length / cols);
    doc.y = startY + rows * (boxH + gap) - gap + 12;
  }

  // Add new page only if needed; otherwise stay on current page
  function ensureSpace(needed) {
    if (doc.y + needed > CONTENT_BOTTOM) doc.addPage();
  }

  // Embed chart image; returns if no image
  function embedChart(imgBuffer) {
    if (!imgBuffer) return;
    ensureSpace(CHART_H + 20);
    doc.moveDown(0.6);
    doc.image(imgBuffer, MARGIN, doc.y, { width: CHART_W, height: CHART_H });
    doc.y += CHART_H + 8;
  }

  // Dark header strip for section pages
  function sectionPageHeader(title) {
    doc.save();
    doc.rect(0, 0, PAGE_W, 56).fill(C.dark);
    doc.rect(0, 0, 6, 56).fill(C.yellow);
    doc.fillColor(C.yellow).font("Helvetica-Bold").fontSize(15)
      .text(title, MARGIN, 19, { width: CONTENT_W });
    doc.restore();
    doc.y = 76;
  }

  // ── Page 1: Cover + Summary ───────────────────────────────────────────

  // Banner
  doc.save();
  doc.rect(0, 0, PAGE_W, 112).fill(C.dark);
  doc.rect(PAGE_W - 6, 0, 6, 112).fill(C.yellow);
  doc.fillColor(C.yellow).font("Helvetica-Bold").fontSize(26)
    .text("ColmeiaOS", MARGIN, 24, { width: CONTENT_W - 10 });
  doc.fillColor(C.white).font("Helvetica").fontSize(11)
    .text(`Relatório Anual · ${year}`, MARGIN, 58, { width: CONTENT_W - 10 });
  doc.fillColor(C.yellow).font("Helvetica-Bold").fontSize(13)
    .text(user?.name ?? "Usuário", MARGIN, 80, { width: CONTENT_W - 10 });
  doc.restore();

  doc.y = 128;
  doc.font("Helvetica").fontSize(9).fillColor(C.gray)
    .text(
      `${user?.email ?? ""}   ·   Gerado em ${new Date().toLocaleString("pt-BR")}`,
      MARGIN, doc.y, { width: CONTENT_W },
    );

  divider();

  // KPI overview
  sectionTitle("Visão Geral");
  kpiGrid([
    { label: "Total de apiários",            value: integer(summary?.total_apiaries ?? 0) },
    { label: "Total de visitas no ano",       value: integer(summary?.total_visits ?? 0) },
    { label: "Novas melgueiras no ano",       value: integer(summary?.total_new_swarm ?? 0) },
    { label: "Melgueiras removidas no ano",   value: integer(summary?.total_removed_swarm ?? 0) },
  ]);

  divider();

  // Financial summary
  sectionTitle("Financeiro");
  resetRows();
  drawRow("Total de despesas (ano)",       currency(totalExpenses));
  drawRow("Total de vendas — quantidade",  integer(totalAmountSales));
  drawRow("Total de vendas — valor",       currency(totalValueSales));

  // Net profit — coloured highlight row
  const profitColor = netProfit >= 0 ? C.green : C.red;
  const profitBg    = netProfit >= 0 ? C.greenBg : C.redBg;
  const profitLabel = netProfit >= 0 ? "Lucro líquido (ano)" : "Prejuízo líquido (ano)";
  drawRow(profitLabel, currency(netProfit), { color: profitColor, bg: profitBg });

  // ── Pre-fetch charts (parallel, only when data exists) ────────────────
  const topCategories = (expensesByCategory ?? []).slice(0, 10);

  const [expensesImg, monthlyImg] = await Promise.all([
    topCategories.length > 0
      ? fetchImageBuffer(chartUrl({
          type: "pie",
          data: {
            labels: topCategories.map((c) => c.category_name),
            datasets: [{ data: topCategories.map((c) => Number(c.total_value)) }],
          },
        }))
      : Promise.resolve(null),
    (monthlyVisits?.length ?? 0) > 0
      ? fetchImageBuffer(chartUrl({
          type: "bar",
          data: {
            labels: monthlyVisits.map((m) => m.month),
            datasets: [{ label: "Visitas", data: monthlyVisits.map((m) => Number(m.total_visits)) }],
          },
        }))
      : Promise.resolve(null),
  ]);

  // ── Page 2: Expenses by category ──────────────────────────────────────
  if (topCategories.length > 0 || expensesImg) {
    doc.addPage();
    sectionPageHeader("Despesas por categoria");

    if (topCategories.length > 0) {
      tableHeader("Categoria", "Valor");
      resetRows();
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
    sectionPageHeader("Visitas mensais");

    if ((monthlyVisits?.length ?? 0) > 0) {
      tableHeader("Mês", "Visitas");
      resetRows();
      for (const m of monthlyVisits) {
        ensureSpace(ROW_H);
        drawRow(m.month, integer(m.total_visits ?? 0));
      }
    }

    embedChart(monthlyImg);
  }

  // ── Footers (all pages) ───────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  const total = range.count;

  for (let i = range.start; i < range.start + total; i++) {
    doc.switchToPage(i);
    doc.moveTo(MARGIN, FOOTER_Y - 8).lineTo(PAGE_W - MARGIN, FOOTER_Y - 8)
      .strokeColor(C.border).lineWidth(0.5).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(C.gray)
      .text(`ColmeiaOS · Relatório Anual ${year}`, MARGIN, FOOTER_Y, {
        width: CONTENT_W / 2,
        lineBreak: false,
      });
    doc.text(`Página ${i + 1} de ${total}`, MARGIN + CONTENT_W / 2, FOOTER_Y, {
      width: CONTENT_W / 2,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  await new Promise((res) => doc.on("end", res));
  return Buffer.concat(buffers);
}

export default { generateUserSummaryPdf };
