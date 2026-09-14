export interface ProductPrice {
  readonly amount: number;
  readonly currency: 'USD';
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly price: ProductPrice;
}
