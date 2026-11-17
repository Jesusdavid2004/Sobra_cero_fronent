import { describe, expect, it } from "vitest";

import { DEMO_PRODUCTS, demoCatalogJsonLd, serializeJsonLd } from "./demo-catalog";

type Product = {
  "@type": string;
  name: string;
  url: string;
  offers: {
    price: string;
    priceCurrency: string;
    priceSpecification?: { priceType: string; price: string }[];
  };
};

const graph = (): Product[] =>
  (demoCatalogJsonLd("https://app.example") as { "@graph": Product[] })["@graph"];

describe("demo catalog", () => {
  it("marks every product as a demonstration so it cannot pass for a real price", () => {
    expect(DEMO_PRODUCTS.every((product) => product.name.startsWith("Demo:"))).toBe(true);
  });

  it("publishes every product as a schema.org Product priced in Colombian pesos", () => {
    const products = graph();

    expect(products).toHaveLength(DEMO_PRODUCTS.length);
    expect(products.every((product) => product["@type"] === "Product")).toBe(true);
    expect(products.every((product) => product.offers.priceCurrency === "COP")).toBe(true);
    expect(products.map((product) => product.offers.price)).toContain("5990");
  });

  it("declares a list price only for the products that have a promotion", () => {
    const withList = graph().filter((product) => product.offers.priceSpecification);

    expect(withList.map((product) => product.name)).toEqual([
      "Demo: Pan tajado integral",
      "Demo: Yogur natural 1 kg",
      "Demo: Manzana roja por kg",
    ]);
    expect(withList[0].offers.priceSpecification?.[0]).toMatchObject({
      priceType: "https://schema.org/ListPrice",
      price: "7990",
    });
  });

  it("gives every product a distinct address on the origin it is published from", () => {
    const urls = graph().map((product) => product.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith("https://app.example/demo-catalog#"))).toBe(true);
  });
});

describe("serializeJsonLd", () => {
  it("never lets the data close the script tag", () => {
    const text = serializeJsonLd({ name: "</script><b>x</b>" });

    expect(text).not.toContain("<");
    expect(JSON.parse(text).name).toBe("</script><b>x</b>");
  });
});
