import * as cheerio from "cheerio";

export class NewsScrapper {
  static NEWS_CARD_CLASS_NAMES = ["bastian-feed-item", "bstn-hl-wrapper"];

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

  getCardCandidates($) {
    const tagCandidates = ["article"];
    const classCandidates = NewsScrapper.NEWS_CARD_CLASS_NAMES.flatMap(
      (className) => [
        `article.${className}`,
        `div.${className}`,
        `section.${className}`,
        `li.${className}`,
        `span.${className}`,
      ],
    );

    return [...tagCandidates, ...classCandidates];
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

    const cardCandidates = this.getCardCandidates($);
    const processedElements = new Set();

    cardCandidates.forEach((selector) => {
      $(selector).each((_, article) => {
        if (processedElements.has(article)) return;
        processedElements.add(article);

        const $article = $(article);

        let title = this.clean($article.find("h3").first().text());
        if (!title) title = this.clean($article.find("h2").first().text());
        if (!title) title = this.clean($article.find("h1").first().text());

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
