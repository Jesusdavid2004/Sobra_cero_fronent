/**
 * A small catalog of invented products, published as schema.org JSON-LD on our own site.
 * It exists so the Scanner can be demonstrated end to end without reading anybody else's website.
 * Every name starts with "Demo:" so nothing here can be mistaken for a real price or promotion.
 */
export type DemoProduct = {
  slug: string;
  name: string;
  category: string;
  priceCop: number;
  listPriceCop?: number;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: "pan-tajado",
    name: "Demo: Pan tajado integral",
    category: "Panadería",
    priceCop: 5990,
    listPriceCop: 7990,
  },
  { slug: "leche-entera", name: "Demo: Leche entera 1 L", category: "Lácteos", priceCop: 4500 },
  {
    slug: "yogur-natural",
    name: "Demo: Yogur natural 1 kg",
    category: "Lácteos",
    priceCop: 8900,
    listPriceCop: 10900,
  },
  { slug: "arroz-5kg", name: "Demo: Arroz blanco 5 kg", category: "Despensa", priceCop: 21900 },
  {
    slug: "manzana-roja",
    name: "Demo: Manzana roja por kg",
    category: "Frutas y verduras",
    priceCop: 6900,
    listPriceCop: 8500,
  },
  { slug: "croissant", name: "Demo: Croissant x4", category: "Panadería", priceCop: 7200 },
];

const SCHEMA_ORG = "https://schema.org";

export function productUrl(origin: string, slug: string): string {
  return `${origin}/demo-catalog#${slug}`;
}

/** The JSON-LD the page publishes. A list price is declared only for products that have a promotion. */
export function demoCatalogJsonLd(origin: string): object {
  return {
    "@context": SCHEMA_ORG,
    "@graph": DEMO_PRODUCTS.map((product) => ({
      "@type": "Product",
      name: product.name,
      category: product.category,
      url: productUrl(origin, product.slug),
      offers: {
        "@type": "Offer",
        price: String(product.priceCop),
        priceCurrency: "COP",
        availability: `${SCHEMA_ORG}/InStock`,
        ...(product.listPriceCop === undefined
          ? {}
          : {
              priceSpecification: [
                {
                  "@type": "PriceSpecification",
                  priceType: `${SCHEMA_ORG}/ListPrice`,
                  price: String(product.listPriceCop),
                },
              ],
            }),
      },
    })),
  };
}

/** JSON for a script tag: `<` is escaped so the data can never close the tag early. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
