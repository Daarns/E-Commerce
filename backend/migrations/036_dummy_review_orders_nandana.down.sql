BEGIN;

DELETE FROM order_status_workflows
WHERE order_id IN (
  SELECT id
  FROM orders
  WHERE order_number LIKE 'ORD-DUMMY-REVIEW-NANDANA-%'
);

DELETE FROM product_reviews
WHERE order_id IN (
  SELECT id
  FROM orders
  WHERE order_number LIKE 'ORD-DUMMY-REVIEW-NANDANA-%'
);

DELETE FROM order_items
WHERE order_id IN (
  SELECT id
  FROM orders
  WHERE order_number LIKE 'ORD-DUMMY-REVIEW-NANDANA-%'
);

DELETE FROM orders
WHERE order_number LIKE 'ORD-DUMMY-REVIEW-NANDANA-%';

COMMIT;
