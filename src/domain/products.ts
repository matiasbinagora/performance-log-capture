import type { Product } from './product.js';

export const products = [
  {
    id: 'aurora-desk-lamp',
    name: 'Aurora Desk Lamp',
    description: 'Adjustable warm LED desk lamp with a compact metal base.',
    category: 'Lighting',
    tags: ['desk', 'office', 'led'],
    price: { amount: 79.99, currency: 'USD' },
  },
  {
    id: 'cedar-monitor-stand',
    name: 'Cedar Monitor Stand',
    description: 'Solid cedar riser with storage space for a keyboard.',
    category: 'Office',
    tags: ['desk', 'monitor', 'wood'],
    price: { amount: 54.5, currency: 'USD' },
  },
  {
    id: 'harbor-travel-mug',
    name: 'Harbor Travel Mug',
    description: 'Double-wall stainless steel mug with a locking lid.',
    category: 'Kitchen',
    tags: ['coffee', 'travel', 'steel'],
    price: { amount: 28, currency: 'USD' },
  },
  {
    id: 'meadow-wool-throw',
    name: 'Meadow Wool Throw',
    description: 'Soft woven throw made from a durable wool blend.',
    category: 'Home',
    tags: ['blanket', 'living-room', 'wool'],
    price: { amount: 119, currency: 'USD' },
  },
  {
    id: 'northstar-notebook',
    name: 'Northstar Notebook',
    description: 'Lay-flat dotted notebook with recycled paper pages.',
    category: 'Stationery',
    tags: ['paper', 'notes', 'office'],
    price: { amount: 16.75, currency: 'USD' },
  },
  {
    id: 'summit-daypack',
    name: 'Summit Daypack',
    description: 'Lightweight daypack with a padded laptop sleeve.',
    category: 'Travel',
    tags: ['bag', 'laptop', 'outdoor'],
    price: { amount: 94, currency: 'USD' },
  },
] as const satisfies readonly Product[];
