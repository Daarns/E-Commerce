CREATE TABLE IF NOT EXISTS order_refund_images (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_refund_images_order_id
    ON order_refund_images(order_id, position, created_at);

CREATE INDEX IF NOT EXISTS idx_order_refund_images_user_id
    ON order_refund_images(user_id);
