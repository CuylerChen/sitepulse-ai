export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  description: string;
  published: string;
  blocks: ArticleBlock[];
};

export const articles: Article[] = [
  {
    slug: "how-to-make-your-website-visible-in-chatgpt",
    title: "How to make your website visible in ChatGPT",
    description: "What a store owner can actually change so answer engines can fetch and quote a page. Access and clarity, not a ranking guarantee.",
    published: "2026-10-02",
    blocks: [
      { type: "p", text: "ChatGPT does not publish a rank report you can optimize the way you optimize Google. When a store owner asks how to show up in an answer, the honest starting point is narrower: can a crawler fetch the page, and does the HTML say what you sell? SitePulse calls that AI search readiness. It is not a promise that any model will cite you, and it is not a ranking in ChatGPT, Google, or Perplexity." },
      { type: "h2", text: "Separate the crawlers before you edit robots.txt" },
      { type: "p", text: "Open robots.txt and look for GPTBot and OAI-SearchBot as different user agents. GPTBot is associated with training. OAI-SearchBot is associated with search. A plugin that says “block AI” often writes one of those names and leaves the other alone, or it writes a wildcard that blocks more than you meant. If you want the store to be eligible for search features, OAI-SearchBot usually needs permission to fetch the pages you care about. Allowing it still does not create a citation. Blocking it on purpose is a valid choice. The mistake is blocking it by accident and then wondering why answers never mention the shop." },
      { type: "p", text: "If robots.txt returns an error, treat the result as unknown. Do not assume the site is open. Fix the file so it is plain text, then check the homepage path again. A 500 on robots.txt is a technical problem, not a content problem." },
      { type: "h2", text: "Put the offer in the HTML" },
      { type: "p", text: "A homepage that is a full-screen image with a slogan in a picture will not give a crawler much to quote. Put the business name, what you sell, and who it is for in text. Use one H1. Write a title of roughly 50 to 60 characters and a meta description that matches the page. If the important sentence only appears after a click, or only inside a review widget that loads later, a simple fetch may miss it." },
      { type: "p", text: "Add structured data only when it matches visible facts. A shop can use Organization or LocalBusiness on the homepage. A product page can use Product with the name, image, and offer a shopper can already see. Do not mark up reviews you do not have. Invalid JSON-LD is worse than none, because it signals that the page cannot be trusted as data." },
      { type: "h2", text: "Keep one address" },
      { type: "p", text: "If the homepage redirects from http to https, or from a bare domain to www, the canonical should point at the final URL. Answer engines that store an address will otherwise keep a link that bounces. After you change titles or robots.txt, run the homepage again and read the crawler lines. Confirm they say allowed or blocked on purpose. Readiness is a technical check. Traffic and citations still depend on the product, the question, and the engine." },
      { type: "p", text: "A practical next step is the AI readiness check, which reports access without pretending to track mentions. Pair it with a human read of the first screen of the homepage. If a new customer cannot tell what you sell in ten seconds, a model will not invent a clearer description than the one you failed to write." },
    ],
  },
  {
    slug: "how-to-check-if-ai-bots-can-crawl-your-website",
    title: "How to check if AI bots can crawl your website",
    description: "A practical way to read robots.txt for GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, and PerplexityBot.",
    published: "2026-10-09",
    blocks: [
      { type: "p", text: "You do not need a log file to answer the first question store owners ask: are the major AI crawlers allowed to fetch the homepage? The file that answers it is robots.txt, and the answer is per user agent. A single yes or no for “AI bots” hides the decision you actually made." },
      { type: "h2", text: "Fetch the file yourself" },
      { type: "p", text: "Open https://yourdomain.com/robots.txt in a browser. You want a 200 response and plain text. A redirect to an HTML page, a login wall, or a 404 means there is no clear rule set. Some hosts serve a default file that allows everything. Some Shopify themes and apps append groups you did not write. Read the file that is live, not the draft in a notes app." },
      { type: "p", text: "Find each User-agent line. The token has to match the crawler you care about. GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, and PerplexityBot are five different tokens. A group for Googlebot does not describe them. A group for * is the fallback when a more specific group does not match. If you disallow / under the wildcard and never add an allow for the search bots, you may have blocked more than the training crawlers." },
      { type: "h2", text: "Read the path, not the slogan" },
      { type: "p", text: "Disallow: / blocks the whole host for that agent. Disallow: /admin blocks a path. Allow rules can override a broader disallow when they are more specific. The homepage is /, so a rule that only blocks /cart does not block the front door. Check the path you care about. A product URL and the homepage can have different results if your rules are path-based." },
      { type: "p", text: "Write down one of three states for each bot. Allowed means the matching rule permits that path. Blocked means a disallow covers it and is not overridden. Unknown means the file could not be fetched or the group is too messy to call. Unknown is not a pass. It means you do not know, and a crawler may skip the site rather than guess." },
      { type: "h2", text: "What a check cannot see" },
      { type: "p", text: "robots.txt is a request. It does not prove a bot visited, and it does not stop a person from opening the page. Some crawlers honor it. A firewall rule or a country block will not appear in the file at all. Server logs are the only way to see real fetches. The robots check is still the right first step, because it is the control the vendors document." },
      { type: "p", text: "SitePulse’s crawler checker evaluates the homepage path for those five agents and labels each one allowed, blocked, or unknown. Use it after you edit the file, not instead of reading the file. If you blocked a search bot on purpose, leave the block and stop chasing citations from that engine. If you blocked it by accident, fix the group, publish, and check again." },
    ],
  },
  {
    slug: "website-seo-audit-15-things-to-check",
    title: "Website SEO audit: 15 things to check",
    description: "Fifteen homepage checks that matter before you buy a tool or hire a freelancer. No rank estimates.",
    published: "2026-10-16",
    blocks: [
      { type: "p", text: "A useful SEO audit starts with the page you can change this week. These fifteen checks are the ones we expect a homepage scan to answer. They will not tell you which keywords to buy. They will tell you whether the page is eligible to be understood." },
      { type: "ol", items: [
        "The URL returns a successful HTML response, not a 404, a 500, or an endless redirect.",
        "HTTP redirects to HTTPS, and the final host is the one you want customers to remember.",
        "The title tag exists, names the business or the offer, and is not the theme default.",
        "The title is long enough to be specific and short enough that the important words are not cut off.",
        "A meta description exists and matches the page, instead of repeating the title or staying blank.",
        "There is one clear H1, and it agrees with the title rather than introducing a second topic.",
        "The canonical tag points at the final URL, not at a staging host or a parameter URL.",
        "Meta robots does not say noindex or nofollow unless you meant to hide the page.",
        "robots.txt can be fetched, and it does not accidentally disallow the homepage for Googlebot.",
        "A sitemap is referenced, even if you do not submit every collection URL by hand.",
        "The first screen of text says what you sell. A slogan alone is not a description.",
        "Important images in the HTML have alt text that names the thing in the picture.",
        "JSON-LD, if present, parses and uses types that match visible content.",
        "The page is not a chain of app embeds that leave the fetched HTML empty.",
        "Internal links to key products or collections exist as real anchors, not only as buttons that require a script.",
      ] },
      { type: "h2", text: "How to use the list" },
      { type: "p", text: "Do not try to perfect all fifteen in an afternoon. Start with anything that blocks indexing: a bad status code, a noindex tag, or a robots disallow on the homepage. Then fix the title and H1, because those are what a person sees in search and what a crawler uses to name the page. Structured data and alt text are next. They help, and they are not a substitute for a page that failed to load." },
      { type: "p", text: "Skip vanity scores from tools that invent a domain authority number. If a metric was not measured, say it is not available. A homepage audit that shows a zero for a missing performance score is lying to you. SitePulse leaves that field blank on purpose." },
      { type: "p", text: "When the fifteen items are clean, measure traffic in Search Console and in your store analytics. The audit got the page ready. It did not earn the click. Re-run the list after a theme update, because apps love to put noindex back on a page you already fixed." },
    ],
  },
  {
    slug: "what-is-ai-search-readiness",
    title: "What is AI search readiness?",
    description: "A plain definition of AI search readiness, what the score includes, and what it refuses to promise.",
    published: "2026-10-23",
    blocks: [
      { type: "p", text: "AI search readiness is a technical score for a page you submit. It asks whether automated clients can fetch the page and whether the HTML gives them enough clear facts to describe the business without guessing. It is not a rank in ChatGPT. It is not a share of voice. It is not a forecast of traffic from Perplexity or Google." },
      { type: "h2", text: "Why the name is careful" },
      { type: "p", text: "“AI visibility” sounds like a dashboard of mentions. That dashboard, if it exists, is a different product, and the numbers are easy to fake. Readiness is the part you can verify on your own site. You can open robots.txt. You can view source. You can see a title. A readiness check should be able to point at those facts. If a vendor cannot show the evidence, the score is a mood." },
      { type: "p", text: "SitePulse splits the idea into crawler access and page clarity. Access covers whether known agents are allowed, blocked, or unknown on the path you submitted. Clarity covers titles, headings, copy, and structured data that matches what a shopper can see. Performance is a separate score, and it stays blank when the scan does not return it. A blank score is not a zero." },
      { type: "h2", text: "What a good score does not buy" },
      { type: "p", text: "A high readiness score means the page is not getting in its own way. It does not mean an answer engine will choose you over a bigger retailer. Models cite pages for reasons that include the question, the other pages they already know, and the product itself. A ceramic shop with a clear homepage can still lose a generic query to a marketplace. That is not a bug in the score." },
      { type: "p", text: "A low score is more actionable. If GPTBot is blocked and you wanted it allowed, change robots.txt. If the H1 is “Welcome,” rewrite it. If JSON-LD fails to parse, fix the script or remove it. Those are jobs with a done state. Chasing a citation you cannot measure is not." },
      { type: "h2", text: "How to talk about it with a partner" },
      { type: "p", text: "Say: we checked whether crawlers can open the homepage and whether the page explains the shop. Say the number is a readiness score, not a ranking. If someone asks for a guarantee, the honest answer is that no audit can promise placement in an answer box. Use the score to prioritize fixes, then look at your own orders and analytics to see whether anything changed. That is the whole point of the metric, and the limit of it." },
    ],
  },
  {
    slug: "how-to-improve-shopify-product-page-seo",
    title: "How to improve Shopify product page SEO",
    description: "Product-page fixes you can make in Shopify admin without installing another app.",
    published: "2026-10-30",
    blocks: [
      { type: "p", text: "Shopify product pages fail in boring ways. The title is the theme default. The description is the supplier’s paragraph. A coming-soon app left noindex on a live product. None of that requires a new app to diagnose, and none of it is fixed by installing one that promises “AI SEO.” Start with the public product URL." },
      { type: "h2", text: "Title and description that a shopper would recognize" },
      { type: "p", text: "In the product’s search listing fields, write a title that leads with the product name and adds one useful qualifier: material, fit, or who it is for. Do not paste the store name three times. The meta description should say what is different about buying it from you: shipping window, sizing help, or a return policy. If you leave the field blank, search engines will excerpt the description, which is fine only if that excerpt is actually good." },
      { type: "p", text: "Rewrite supplier copy. The same sentence on twenty stores does not help someone choose. Two short paragraphs in your own words beat a keyword list. Mention the variant facts that cause support tickets, such as “this mug is 12 ounces and the glaze varies.” That sentence is useful to a person and to any system summarizing the page." },
      { type: "h2", text: "Variants, images, and markup" },
      { type: "p", text: "Color and size parameters create extra URLs. Check the canonical on a variant URL. It should point at the product address you want kept, and the price on the page should match the offer in the Product structured data Shopify emits. If a custom theme or an app removed the JSON-LD, put back only the fields you can see: name, image, price, currency, availability. Do not add review stars you cannot point to on the page." },
      { type: "p", text: "Set alt text on the first product image. Name the product. Skip the keyword pile. Then view the live page source, or run a storefront check, and confirm the title you typed is the title in the HTML. The admin preview is not the fetch a crawler gets." },
      { type: "h2", text: "The noindex leftover" },
      { type: "p", text: "Password pages, markets, and launch apps sometimes leave a noindex directive after you go live. That single tag will undo the title work. Search the theme and the app embeds for noindex before you blame the product description. SitePulse can see that tag from the public URL without an install and without admin access. After you remove it, request indexing in Search Console if you use it. The checker will not do that step for you, and it should not pretend to." },
    ],
  },
  {
    slug: "gptbot-vs-oai-searchbot",
    title: "GPTBot vs OAI-SearchBot",
    description: "Why OpenAI’s training crawler and search crawler are different user agents, and how to set each one on purpose.",
    published: "2026-11-06",
    blocks: [
      { type: "p", text: "GPTBot and OAI-SearchBot are not two names for the same robot. Treating them as one switch is how stores block search while thinking they only blocked training, or the other way around. If you edit robots.txt this month, edit them as separate groups." },
      { type: "h2", text: "What each token is for" },
      { type: "p", text: "GPTBot is the user agent OpenAI documents for collecting content that may be used to train models. Site owners block it when they do not want pages used that way. OAI-SearchBot is the user agent associated with search. It is the one that matters if your goal is to be eligible for search features that fetch the live page. A Disallow under GPTBot does not automatically disallow OAI-SearchBot. An Allow under OAI-SearchBot does not automatically allow GPTBot." },
      { type: "p", text: "There is a third token people mix in: ChatGPT-User. That agent is associated with a person asking ChatGPT to look at a URL during a chat. It is not the training crawler and it is not the search crawler. A robots rule for ChatGPT-User is a third decision. This article is about the first two, because those are the ones plugins collapse most often." },
      { type: "h2", text: "A deliberate file" },
      { type: "p", text: "If you want search access and no training crawl, allow OAI-SearchBot on the paths you want fetched and disallow GPTBot. If you want neither, disallow both, and do not rely on a comment in the file to explain the choice. Crawlers do not read your comments as policy. If you want both, you can leave them to the wildcard group, but only if that wildcard allows the site. Read the * group before you assume the default is open." },
      { type: "p", text: "Order and specificity still matter. A broad Disallow: / in the wildcard group can apply when a bot has no group of its own. Adding a specific group is how you opt that bot out of the wildcard. After you publish, fetch robots.txt from outside your office network. Cached copies and theme editors lie." },
      { type: "h2", text: "What not to expect" },
      { type: "p", text: "Allowing OAI-SearchBot does not place you in ChatGPT. It removes one technical reason you would be skipped. Blocking GPTBot does not hide the page from a customer with a browser, and it does not delete copies that were fetched before the rule existed. Re-check both tokens after any SEO app update. Apps rewrite this file. The five-minute review is the AI crawler check, which should label GPTBot and OAI-SearchBot separately as allowed, blocked, or unknown." },
    ],
  },
  {
    slug: "how-to-fix-missing-structured-data",
    title: "How to fix missing structured data",
    description: "How to add JSON-LD that matches the page, validate it, and avoid the markup mistakes that fail an audit.",
    published: "2026-11-13",
    blocks: [
      { type: "p", text: "Missing structured data means a crawler found no parseable JSON-LD, or found a script that does not describe the thing on the page. The fix is not “add schema” as a slogan. The fix is a small script whose facts you can point at with your finger." },
      { type: "h2", text: "Confirm it is actually missing" },
      { type: "p", text: "View the page source and search for application/ld+json. Do not trust a tag manager preview. A fetch that does not run your tag manager will not see a tag that only exists after a click. If the script is there but the audit says it failed, the JSON is invalid: a trailing comma, a smart quote, or a value that is not quoted. Invalid JSON-LD counts as missing for practical purposes. Remove it until it parses." },
      { type: "p", text: "Also check that you are looking at the right template. A homepage may correctly have Organization markup and no Product markup. A product page with neither is the gap. Collection pages are a third template. Do not copy a Product script onto a collection and hope the type is close enough." },
      { type: "h2", text: "Write only what is visible" },
      { type: "p", text: "For a product, include the name, an image URL that loads, and an offer with price, currency, and availability. Those values must match the page. If the shirt is $48 on the screen and $40 in the script, fix the script. Do not add aggregateRating unless the reviews are on the page and you can explain where the count came from. Fake stars are a good way to get the markup ignored." },
      { type: "p", text: "For a local shop homepage, Organization or LocalBusiness with the name, URL, and a real address is enough. Skip every optional field you would have to invent. One correct type beats a graph of empty objects." },
      { type: "h2", text: "Put it in the HTML and check again" },
      { type: "p", text: "Paste the script into the theme or the SEO field that renders on the server, then load the URL with JavaScript disabled or inspect the raw response. If the script is gone, the theme is injecting it too late. Validate the JSON in a formatter before you publish. Run the audit again and read the evidence: a count of JSON-LD blocks and the types found. Zero blocks means the fix did not ship. A type of Product on a product URL means it did. Structured data will not rank the page by itself. It will stop a crawler from having to guess the price." },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function wordCount(article: Article): number {
  return article.blocks.reduce((count, block) => {
    const text = block.type === "ul" || block.type === "ol" ? block.items.join(" ") : block.text;
    return count + text.split(/\s+/).filter(Boolean).length;
  }, 0);
}

export function readingMinutes(article: Article): number {
  return Math.max(1, Math.round(wordCount(article) / 220));
}
