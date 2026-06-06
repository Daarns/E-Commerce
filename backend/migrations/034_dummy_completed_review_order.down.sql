BEGIN;

DELETE FROM order_status_workflows
WHERE order_id IN (
  SELECT id FROM orders WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET'
);

DELETE FROM product_reviews
WHERE order_id IN (
  SELECT id FROM orders WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET'
);

DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET'
);

DELETE FROM orders
WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET';

COMMIT;
