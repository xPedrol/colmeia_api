import PDFDocument from "pdfkit";
import fetch from "node-fetch";

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return null;
  }
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

  // Fetch aggregated data
  const [user, summary, expensesByCategory, monthlyVisits, salesSummary] =
    await Promise.all([
      userRepo.getUserById(userId),
      dashboardRepo.getSummary(userId, year),
      dashboardRepo.getExpensesByCategory(userId, year),
      dashboardRepo.getMonthlyVisits(userId, year),
      dashboardRepo.getSalesSummary(userId, year),
    ]);

  // Document metadata
  doc.info.Title = `Resumo do Usuário — ${user?.name ?? "Usuário"}`;
  doc.info.Author = "ColmeiaOS";

  // Helper formatters
  const currency = (v) =>
    Number(v ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const integer = (v) => Number(v ?? 0).toLocaleString("pt-BR");

  const totalExpenses = Number(salesSummary?.total_expenses ?? 0) || 0;
  const totalAmountSales = Number(salesSummary?.total_amount_sales ?? 0) || 0;
  const totalValueSales = Number(salesSummary?.total_value_sales ?? 0) || 0;
  const netProfit = totalValueSales - totalExpenses;

  // Banner / Title
  doc.save();
  doc.rect(0, 0, doc.page.width, 80).fill("#F2C94C");
  doc.fillColor("#ffffff").fontSize(22).text("Resumo do Usuário", 0, 26, {
    align: "center",
  });
  doc.restore();

  doc.moveDown(3);
  doc
    .fillColor("#1C1C17")
    .fontSize(12)
    .text(`${user?.name ?? "Usuário"} — ${user?.email ?? ""}`);
  doc.text(`Ano: ${year}`);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown();

  // Small helper to draw a two-column row (label / value)
  const leftMargin = 48;
  const labelWidth = 300;
  const valueWidth = doc.page.width - leftMargin - leftMargin - labelWidth;
  function drawRow(label, value) {
    const y = doc.y;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(label, leftMargin, y, { width: labelWidth });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(value, leftMargin + labelWidth, y, {
        width: valueWidth,
        align: "right",
      });
    doc.moveDown(0.6);
  }

  // Summary numbers
  doc.fontSize(12).fillColor("#7C5800").text("Visão geral:");
  doc.moveDown(0.2);
  doc.fillColor("#1C1C17");
  drawRow("Total de apiários:", integer(summary.total_apiaries ?? 0));
  drawRow("Total de visitas (ano):", integer(summary.total_visits ?? 0));
  drawRow("Novas melgueiras (ano):", integer(summary.total_new_swarm ?? 0));
  drawRow(
    "Melgueiras removidas (ano):",
    integer(summary.total_removed_swarm ?? 0),
  );
  doc.moveDown();

  // Financial summary
  doc.fontSize(12).fillColor("#7C5800").text("Financeiro:");
  doc.moveDown(0.2);
  doc.fillColor("#1C1C17");
  drawRow("Total despesas (ano):", currency(totalExpenses));
  drawRow("Total vendas (quantidade):", integer(totalAmountSales));
  drawRow("Total vendas (valor):", currency(totalValueSales));
  const profitLabel = netProfit >= 0 ? "Lucro líquido:" : "Prejuízo líquido:";
  doc.fillColor(netProfit >= 0 ? "#0a7a3f" : "#a12a2a");
  drawRow(profitLabel, currency(netProfit));
  doc.fillColor("#1C1C17");
  doc.moveDown();

  // Charts: build QuickChart URLs
  const quickChartBase = "https://quickchart.io/chart";

  const expensesLabels = expensesByCategory.map((c) => c.category_name);
  const expensesValues = expensesByCategory.map((c) => Number(c.total_value));
  const expensesChartConfig = {
    type: "pie",
    data: { labels: expensesLabels, datasets: [{ data: expensesValues }] },
  };
  const expensesChartUrl = `${quickChartBase}?c=${encodeURIComponent(
    JSON.stringify(expensesChartConfig),
  )}&format=png&width=600&height=300`;

  const monthlyLabels = monthlyVisits.map((m) => m.month);
  const monthlyValues = monthlyVisits.map((m) => Number(m.total_visits));
  const monthlyChartConfig = {
    type: "bar",
    data: {
      labels: monthlyLabels,
      datasets: [{ label: "Visitas", data: monthlyValues }],
    },
  };
  const monthlyChartUrl = `${quickChartBase}?c=${encodeURIComponent(
    JSON.stringify(monthlyChartConfig),
  )}&format=png&width=600&height=300`;

  // Try to embed charts and add detailed sections
  const [expensesImg, monthlyImg] = await Promise.all([
    fetchImageBuffer(expensesChartUrl),
    fetchImageBuffer(monthlyChartUrl),
  ]);

  // Despesas por categoria — tabela (top 10)
  const topCategories = (expensesByCategory || []).slice(0, 10);
  const hasExpensesContent = topCategories.length > 0 || expensesImg;
  if (hasExpensesContent) {
    doc.addPage();
    doc.fontSize(14).fillColor("#1C1C17").text("Despesas por categoria", {
      align: "center",
    });
    doc.moveDown();

    if (topCategories.length === 0) {
      doc.fontSize(10).text("Nenhuma despesa registrada.", { align: "left" });
    } else {
      // table header
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Categoria", leftMargin, doc.y, { width: labelWidth });
      doc.text("Valor (R$)", leftMargin + labelWidth, doc.y, {
        width: valueWidth,
        align: "right",
      });
      doc.moveDown(0.6);
      doc.font("Helvetica");
      topCategories.forEach((c) => {
        drawRow(c.category_name, currency(Number(c.total_value ?? 0)));
      });
    }

    // Embed expenses chart if available
    if (expensesImg) {
      try {
        doc.moveDown(0.5);
        doc.image(expensesImg, { fit: [500, 300], align: "center" });
      } catch (e) {
        // ignore image errors
      }
    }
  }

  // Visitas mensais
  const hasMonthlyContent = (monthlyVisits && monthlyVisits.length > 0) || monthlyImg;
  if (hasMonthlyContent) {
    doc.addPage();
    doc
      .fontSize(14)
      .fillColor("#1C1C17")
      .text("Visitas mensais", { align: "center" });
    doc.moveDown();
    if (!monthlyVisits || monthlyVisits.length === 0) {
      doc.fontSize(10).text("Nenhuma visita registrada.", { align: "left" });
    } else {
      // simple two-column list
      monthlyVisits.forEach((m) => {
        drawRow(m.month, integer(m.total_visits ?? 0));
      });
    }

    if (monthlyImg) {
      try {
        doc.moveDown(0.5);
        doc.image(monthlyImg, { fit: [500, 300], align: "center" });
      } catch (e) {
        // ignore
      }
    }
  }

  // small footer with page numbers for the pages we generated
  try {
    const range = doc.bufferedPageRange();
    // add 'Relatório gerado...' on the last page above the footer
    const lastPageIndex = range.start + range.count - 1;
    try {
      doc.switchToPage(lastPageIndex);
      doc.fontSize(10).fillColor("#666").text("Relatório gerado por ColmeiaOS", leftMargin, doc.page.height - 70, {
        width: doc.page.width - leftMargin * 2,
        align: "center",
      });
    } catch (e) {
      // ignore
    }

    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(10)
        .fillColor("#888")
        .text(`ColmeiaOS • Página ${i + 1}`, leftMargin, doc.page.height - 50, {
          width: doc.page.width - leftMargin * 2,
          align: "center",
        });
    }
  } catch (e) {
    // if buffering not available, skip page numbers
  }

  doc.end();

  await new Promise((res) => doc.on("end", res));

  return Buffer.concat(buffers);
}

export default { generateUserSummaryPdf };
