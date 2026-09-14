import { describe, expect, it } from 'vitest';

import { createCatalogService } from '../src/application/catalog-service.js';
import { products } from '../src/domain/products.js';

describe('catalog service', () => {
  const catalogService = createCatalogService(products);

  it('returns the same ordered product data for repeated searches', () => {
    const firstResult = catalogService.searchProducts('desk');
    const secondResult = catalogService.searchProducts('  DESK  ');

    expect(firstResult).toEqual(secondResult);
    expect(firstResult.map((product) => product.id)).toEqual([
      'aurora-desk-lamp',
      'cedar-monitor-stand',
    ]);
  });

  it('returns the deterministic product detail by ID', () => {
    expect(catalogService.findProductById('harbor-travel-mug')).toEqual({
      id: 'harbor-travel-mug',
      name: 'Harbor Travel Mug',
      description: 'Double-wall stainless steel mug with a locking lid.',
      category: 'Kitchen',
      tags: ['coffee', 'travel', 'steel'],
      price: { amount: 28, currency: 'USD' },
    });
  });
});
