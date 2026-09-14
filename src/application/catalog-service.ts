import type { Product } from '../domain/product.js';

export interface CatalogService {
  findProductById(id: string): Product | undefined;
  searchProducts(term: string): readonly Product[];
}

export function createCatalogService(catalog: readonly Product[]): CatalogService {
  const productsById = new Map(catalog.map((product) => [product.id, product]));

  return {
    findProductById(id) {
      return productsById.get(id);
    },
    searchProducts(term) {
      const normalizedTerm = normalizeSearchTerm(term);

      return catalog
        .map((product, catalogIndex) => ({
          catalogIndex,
          product,
          score: scoreProduct(product, normalizedTerm),
        }))
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score || left.catalogIndex - right.catalogIndex)
        .map(({ product }) => product);
    },
  };
}

export function normalizeSearchTerm(term: string): string {
  return term.trim().toLocaleLowerCase('en-US');
}

function scoreProduct(product: Product, term: string): number {
  const name = product.name.toLocaleLowerCase('en-US');
  const category = product.category.toLocaleLowerCase('en-US');
  const description = product.description.toLocaleLowerCase('en-US');
  const tags = product.tags.map((tag) => tag.toLocaleLowerCase('en-US'));

  if (name.startsWith(term)) {
    return 100;
  }

  if (name.includes(term)) {
    return 80;
  }

  if (category.includes(term) || tags.some((tag) => tag.includes(term))) {
    return 50;
  }

  if (description.includes(term)) {
    return 20;
  }

  return 0;
}
