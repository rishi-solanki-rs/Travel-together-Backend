import {
  calculateCouponDiscount,
  computeCartTotals,
  preventDuplicateCheckout,
  applyConcurrentStockDecrements,
} from '../../src/modules/shops/shops.commerce.service.js';

describe('Phase 6 shop order pipeline primitives', () => {
  test('9) percentage coupon discount respects cap and minimum', () => {
    const discount = calculateCouponDiscount({
      subtotal: 2000,
      coupon: { type: 'percent', value: 20, maxDiscount: 250, minimumOrderValue: 500 },
    });
    expect(discount).toBe(250);
  });

  test('10) cart totals apply discount and floor at zero', () => {
    const totals = computeCartTotals({
      items: [{ totalPrice: 500 }, { totalPrice: 700 }],
      coupon: { type: 'flat', value: 200, minimumOrderValue: 1000 },
    });

    expect(totals).toEqual({ subtotal: 1200, discount: 200, total: 1000 });
  });

  test('11) duplicate checkout prevention keeps first token only', () => {
    const tokenSet = new Set();
    expect(preventDuplicateCheckout(tokenSet, 'tok-1')).toBe(true);
    expect(preventDuplicateCheckout(tokenSet, 'tok-1')).toBe(false);
  });

  test('12) stock decrements process requests in order', () => {
    const result = applyConcurrentStockDecrements({ stock: 5, requests: [2, 2, 2] });
    expect(result).toEqual({ remaining: 1, success: 2 });
  });
});
