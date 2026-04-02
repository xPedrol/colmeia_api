import * as cheerio from "cheerio";

export class NewsScrapper {
  constructor(...urls) {
    this.urls = urls;
  }

  clean(text = "") {
    return text.replace(/\s+/g, " ").trim();
  }

  absoluteUrl(url) {
    if (!url) return null;
    const origin = new URL(url).origin;
    return url.startsWith("http") ? url : new URL(url, origin).toString();
  }

  findImportantArticleLink($, $article, acceptedSubstrings = ["/noticias/"]) {
    const hrefs = $article
      .find("a")
      .toArray()
      .map((anchor) => $(anchor).attr("href"))
      .filter(Boolean);

    if (hrefs.length === 0) return null;

    const preferredHref = hrefs.find((href) =>
      acceptedSubstrings.some((substring) => href.includes(substring)),
    );

    return preferredHref || hrefs[0];
  }

  async scrapeApicultura(url) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao acessar ${url}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const cards = [];

    $("article").each((_, article) => {
      const $article = $(article);

      let title = this.clean($article.find("h3").first().text());
      if (!title) title = this.clean($article.find("h2").first().text());

      const articleLink = this.absoluteUrl(
        this.findImportantArticleLink($, $article, ["/noticias/"]),
      );
      const description = this.clean($article.find("p").first().text());
      const image = this.absoluteUrl(
        $article.find("picture img").first().attr("src") ||
          $article.find("img").first().attr("src"),
      );

      if (!title) return;

      cards.push({
        titulo: title,
        descricao: description || null,
        imagem: image || null,
        numeration: cards.length + 1,
        link: articleLink || null,
      });
    });
    const seenLinks = new Set();
    const uniqueCards = cards.filter((card) => {
      if (seenLinks.has(card.link)) return false;
      seenLinks.add(card.link);
      return true;
    });

    return uniqueCards;
  }

  async getNews() {
    try {
      const allNews = [];
      for (const url of this.urls) {
        const news = await this.scrapeApicultura(url);
        allNews.push(...news);
      }
      return allNews;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}
