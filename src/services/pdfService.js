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
  const doc = new PDFDocument({ size: "A4", margin: 40 });
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

  // Header
  doc.fontSize(18).text("Resumo do Usuário", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`${user?.name ?? "Usuário"} — ${user?.email ?? ""}`);
  doc.text(`Ano: ${year}`);
  doc.moveDown();

  // Summary numbers
  doc.fontSize(12).text("Visão geral:");
  doc.moveDown(0.2);
  doc.fontSize(10);
  doc.text(`Total de apiários: ${summary.total_apiaries ?? 0}`);
  doc.text(`Total de visitas (ano): ${summary.total_visits ?? 0}`);
  doc.text(`Novas melgueiras (ano): ${summary.total_new_swarm ?? 0}`);
  doc.text(`Melgueiras removidas (ano): ${summary.total_removed_swarm ?? 0}`);
  doc.moveDown();

  // Financial summary
  doc.fontSize(12).text("Financeiro:");
  doc.moveDown(0.2);
  doc.fontSize(10);
  const totalExpenses = Number(salesSummary?.total_expenses ?? 0) || 0;
  const totalAmountSales = Number(salesSummary?.total_amount_sales ?? 0) || 0;
  const totalValueSales = Number(salesSummary?.total_value_sales ?? 0) || 0;

  doc.text(`Total despesas (ano): R$ ${totalExpenses.toFixed(2)}`);
  doc.text(`Total vendas (quantidade): ${totalAmountSales.toFixed(0)}`);
  doc.text(`Total vendas (valor): R$ ${totalValueSales.toFixed(2)}`);
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
    data: { labels: monthlyLabels, datasets: [{ label: "Visitas", data: monthlyValues }] },
  };
  const monthlyChartUrl = `${quickChartBase}?c=${encodeURIComponent(
    JSON.stringify(monthlyChartConfig),
  )}&format=png&width=600&height=300`;

  // Try to embed charts
  const [expensesImg, monthlyImg] = await Promise.all([
    fetchImageBuffer(expensesChartUrl),
    fetchImageBuffer(monthlyChartUrl),
  ]);

  if (expensesImg) {
    doc.addPage();
    doc.fontSize(12).text("Despesas por categoria", { align: "center" });
    doc.moveDown();
    try {
      doc.image(expensesImg, { fit: [500, 300], align: "center" });
    } catch (e) {
      // ignore
    }
  }

  if (monthlyImg) {
    doc.addPage();
    doc.fontSize(12).text("Visitas mensais", { align: "center" });
    doc.moveDown();
    try {
      doc.image(monthlyImg, { fit: [500, 300], align: "center" });
    } catch (e) {
      // ignore
    }
  }

  // Footer
  doc.addPage();
  doc.fontSize(10).text("Relatório gerado por ColmeiaOS", { align: "center" });

  doc.end();

  await new Promise((res) => doc.on("end", res));

  return Buffer.concat(buffers);
}

export default { generateUserSummaryPdf };
