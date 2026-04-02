import * as cheerio from "cheerio";

const BASE = "https://revistacultivar.com.br";
const URL = `${BASE}/noticias?categoria=apicultura`;

function clean(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function absoluteUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : new URL(url, BASE).toString();
}

async function scrapeApicultura() {
  const res = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao acessar ${URL}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const cards = [];

  $("article").each((_, article) => {
    const $article = $(article);

    let title = clean($article.find("h3").first().text());
    if (!title) title = clean($article.find("h2").first().text());
    const articleLink = absoluteUrl(
      $article
        .find("a")
        .toArray()
        .map((anchor) => $(anchor).attr("href"))
        .find((href) => href?.includes("/noticias/")),
    );
    const description = clean($article.find("p").first().text());
    const image = absoluteUrl($article.find("picture img").first().attr("src"));

    if (!title) return;

    cards.push({
      titulo: title,
      descricao: description || null,
      imagem: image || null,
      numeration: cards.length + 1,
      link: articleLink || null,
    });
  });

  return cards;
}

export async function getNews() {
  try {
    const res = await scrapeApicultura();
    console.log(JSON.stringify(res, null, 2));
    return res;
  } catch (err) {
    console.error(err);
    return [];
  }
}
