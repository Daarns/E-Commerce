--
-- PostgreSQL database dump
--

\restrict OL4du3XkuhvIH1x3cDyA3qlfUfeRMsy2xqHtdekE5WcObOJycnP1N0gB7fTMQja

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_email_queues_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_email_queues_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_email_queues_timestamp() OWNER TO postgres;

--
-- Name: update_order_status_workflows_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_order_status_workflows_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_order_status_workflows_timestamp() OWNER TO postgres;

--
-- Name: update_product_search_vector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_product_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.sku, ''));
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_product_search_vector() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    address_line1 character varying(255) NOT NULL,
    address_line2 character varying(255),
    city character varying(100) NOT NULL,
    province character varying(100) NOT NULL,
    postal_code character varying(10) NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    parent_id uuid,
    image_url text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    meta_title character varying(255),
    meta_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    chat_session_id uuid NOT NULL,
    sender_id uuid,
    sender_type character varying(20) NOT NULL,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    message text NOT NULL,
    attachment_url text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    assigned_admin_id uuid,
    rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    closed_at timestamp without time zone,
    CONSTRAINT chat_sessions_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.chat_sessions OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    user_id uuid NOT NULL,
    shipping_name character varying(255) NOT NULL,
    shipping_phone character varying(20) NOT NULL,
    shipping_address_line1 character varying(255) NOT NULL,
    shipping_address_line2 character varying(255),
    shipping_city character varying(100) NOT NULL,
    shipping_province character varying(100) NOT NULL,
    shipping_postal_code character varying(10) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    shipping_cost numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    promo_code_id uuid,
    order_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(50) DEFAULT 'unpaid'::character varying NOT NULL,
    payment_method character varying(50),
    payment_provider character varying(50),
    payment_transaction_id character varying(255),
    paid_at timestamp without time zone,
    shipping_method character varying(50),
    tracking_number character varying(255),
    shipped_at timestamp without time zone,
    delivered_at timestamp without time zone,
    customer_notes text,
    admin_notes text,
    cancelled_at timestamp without time zone,
    cancellation_reason text,
    idempotency_key character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    sku character varying(100) NOT NULL,
    description text,
    short_description character varying(500),
    regular_price numeric(12,2) NOT NULL,
    sale_price numeric(12,2),
    sale_start_date timestamp without time zone,
    sale_end_date timestamp without time zone,
    stock_quantity integer DEFAULT 0,
    stock_alert_threshold integer DEFAULT 10,
    allow_backorders boolean DEFAULT false,
    weight numeric(8,2),
    length numeric(8,2),
    width numeric(8,2),
    height numeric(8,2),
    brand character varying(100),
    category_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    view_count integer DEFAULT 0,
    sold_count integer DEFAULT 0,
    version integer DEFAULT 1,
    meta_title character varying(255),
    meta_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    search_vector tsvector
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    title character varying(255),
    comment text,
    is_verified_purchase boolean DEFAULT false,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    helpful_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    avatar_url text,
    role character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    email_verification_token character varying(255),
    email_verification_expires_at timestamp without time zone,
    password_reset_token character varying(255),
    password_reset_expires_at timestamp without time zone,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    email_verification_attempts integer DEFAULT 0,
    last_code_sent_at timestamp without time zone,
    email_verification_code character varying(6)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: dashboard_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.dashboard_stats AS
 SELECT ( SELECT count(*) AS count
           FROM public.orders
          WHERE (orders.created_at >= CURRENT_DATE)) AS today_orders,
    ( SELECT COALESCE(sum(orders.total), (0)::numeric) AS "coalesce"
           FROM public.orders
          WHERE ((orders.created_at >= CURRENT_DATE) AND ((orders.payment_status)::text = 'paid'::text))) AS today_revenue,
    ( SELECT count(*) AS count
           FROM public.orders
          WHERE ((orders.order_status)::text = 'pending'::text)) AS pending_orders,
    ( SELECT count(*) AS count
           FROM public.products
          WHERE ((products.stock_quantity < products.stock_alert_threshold) AND (products.stock_quantity > 0))) AS low_stock_count,
    ( SELECT count(*) AS count
           FROM public.products
          WHERE ((products.stock_quantity = 0) AND ((products.status)::text = 'active'::text))) AS out_of_stock_count,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE (users.created_at >= CURRENT_DATE)) AS today_new_customers,
    ( SELECT count(*) AS count
           FROM public.reviews
          WHERE ((reviews.status)::text = 'pending'::text)) AS pending_reviews
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.dashboard_stats OWNER TO postgres;

--
-- Name: email_queues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_queues (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_name character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    body text NOT NULL,
    html_body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    last_error text,
    next_retry timestamp without time zone,
    order_id uuid,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamp without time zone,
    failed_at timestamp without time zone,
    CONSTRAINT email_queues_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.email_queues OWNER TO postgres;

--
-- Name: newsletter_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.newsletter_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending_confirmation'::character varying NOT NULL,
    confirmation_token character varying(255),
    confirmation_token_expires_at timestamp without time zone,
    unsubscribe_token character varying(255),
    subscribed_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    unsubscribed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    category_preferences jsonb DEFAULT '[]'::jsonb,
    notification_frequency character varying(20) DEFAULT 'weekly'::character varying,
    preferences_updated_at timestamp without time zone
);


ALTER TABLE public.newsletter_subscriptions OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    link_url text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100) NOT NULL,
    variant_type character varying(50),
    variant_value character varying(100),
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    notes text,
    changed_by uuid,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_status_history OWNER TO postgres;

--
-- Name: order_status_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    email_triggered boolean DEFAULT false,
    email_type character varying(50),
    triggered_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_status_workflows OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    alt_text character varying(255),
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_images OWNER TO postgres;

--
-- Name: product_specifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_specifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    spec_key character varying(100) NOT NULL,
    spec_value text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_specifications OWNER TO postgres;

--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    variant_type character varying(50) NOT NULL,
    variant_value character varying(100) NOT NULL,
    price_adjustment numeric(12,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    sku_suffix character varying(50),
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- Name: promo_code_usages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_code_usages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    promo_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    discount_amount numeric(12,2) NOT NULL,
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.promo_code_usages OWNER TO postgres;

--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(12,2) NOT NULL,
    min_order_amount numeric(12,2) DEFAULT 0,
    max_discount_amount numeric(12,2),
    usage_limit integer,
    usage_count integer DEFAULT 0,
    usage_limit_per_user integer DEFAULT 1,
    valid_from timestamp without time zone NOT NULL,
    valid_to timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    applicable_products uuid[],
    applicable_categories uuid[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.promo_codes OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: review_helpful; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_helpful (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.review_helpful OWNER TO postgres;

--
-- Name: review_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    image_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.review_images OWNER TO postgres;

--
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    query text NOT NULL,
    result_count integer DEFAULT 0,
    clicked_product_id uuid,
    search_duration_ms integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.search_analytics OWNER TO postgres;

--
-- Name: search_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.search_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text NOT NULL,
    search_count integer DEFAULT 1 NOT NULL,
    category_id uuid,
    last_searched_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.search_suggestions OWNER TO postgres;

--
-- Name: stock_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    email character varying(255) NOT NULL,
    is_notified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notified_at timestamp without time zone
);


ALTER TABLE public.stock_alerts OWNER TO postgres;

--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wishlists OWNER TO postgres;

--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_session_id_key UNIQUE (session_id);


--
-- Name: email_queues email_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscriptions newsletter_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.newsletter_subscriptions
    ADD CONSTRAINT newsletter_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: order_status_workflows order_status_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_workflows
    ADD CONSTRAINT order_status_workflows_pkey PRIMARY KEY (id);


--
-- Name: orders orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_specifications product_specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_specifications
    ADD CONSTRAINT product_specifications_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: promo_code_usages promo_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: review_helpful review_helpful_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_helpful
    ADD CONSTRAINT review_helpful_pkey PRIMARY KEY (id);


--
-- Name: review_helpful review_helpful_review_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_helpful
    ADD CONSTRAINT review_helpful_review_id_user_id_key UNIQUE (review_id, user_id);


--
-- Name: review_images review_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: search_suggestions search_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_pkey PRIMARY KEY (id);


--
-- Name: search_suggestions search_suggestions_query_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_query_category_id_key UNIQUE (query, category_id);


--
-- Name: stock_alerts stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: idx_activity_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_action ON public.activity_logs USING btree (action_type);


--
-- Name: idx_activity_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_activity_user_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_user_action ON public.activity_logs USING btree (user_id, action_type);


--
-- Name: idx_activity_user_action_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_user_action_date ON public.activity_logs USING btree (user_id, action_type, created_at DESC);


--
-- Name: idx_activity_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_user_date ON public.activity_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_addresses_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_default ON public.addresses USING btree (is_default);


--
-- Name: idx_addresses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_user ON public.addresses USING btree (user_id);


--
-- Name: idx_cart_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_product ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_session ON public.cart_items USING btree (session_id);


--
-- Name: idx_cart_items_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_user ON public.cart_items USING btree (user_id);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (chat_session_id);


--
-- Name: idx_chat_sessions_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_session ON public.chat_sessions USING btree (session_id);


--
-- Name: idx_chat_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_status ON public.chat_sessions USING btree (status);


--
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_dashboard_stats; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_dashboard_stats ON public.dashboard_stats USING btree ((1));


--
-- Name: idx_email_queues_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_created_at ON public.email_queues USING btree (created_at);


--
-- Name: idx_email_queues_email_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_email_type ON public.email_queues USING btree (email_type);


--
-- Name: idx_email_queues_next_retry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_next_retry ON public.email_queues USING btree (next_retry) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_email_queues_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_order_id ON public.email_queues USING btree (order_id);


--
-- Name: idx_email_queues_recipient_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_recipient_email ON public.email_queues USING btree (recipient_email);


--
-- Name: idx_email_queues_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_status ON public.email_queues USING btree (status) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_email_queues_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queues_user_id ON public.email_queues USING btree (user_id);


--
-- Name: idx_newsletter_confirmation_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_newsletter_confirmation_token ON public.newsletter_subscriptions USING btree (confirmation_token) WHERE (confirmation_token IS NOT NULL);


--
-- Name: idx_newsletter_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_created_at ON public.newsletter_subscriptions USING btree (created_at);


--
-- Name: idx_newsletter_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_deleted_at ON public.newsletter_subscriptions USING btree (deleted_at);


--
-- Name: idx_newsletter_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_newsletter_email ON public.newsletter_subscriptions USING btree (email);


--
-- Name: idx_newsletter_frequency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_frequency ON public.newsletter_subscriptions USING btree (notification_frequency);


--
-- Name: idx_newsletter_preferences; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_preferences ON public.newsletter_subscriptions USING gin (category_preferences);


--
-- Name: idx_newsletter_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_status ON public.newsletter_subscriptions USING btree (status);


--
-- Name: idx_newsletter_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_status_created_at ON public.newsletter_subscriptions USING btree (status, created_at);


--
-- Name: idx_newsletter_subscribed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_newsletter_subscribed ON public.newsletter_subscriptions USING btree (status) WHERE ((status)::text = 'subscribed'::text);


--
-- Name: idx_newsletter_unsubscribe_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_newsletter_unsubscribe_token ON public.newsletter_subscriptions USING btree (unsubscribe_token) WHERE (unsubscribe_token IS NOT NULL);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_order_history_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_history_order ON public.order_status_history USING btree (order_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id);


--
-- Name: idx_order_status_workflows_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_workflows_created_at ON public.order_status_workflows USING btree (created_at);


--
-- Name: idx_order_status_workflows_email_triggered; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_workflows_email_triggered ON public.order_status_workflows USING btree (email_triggered);


--
-- Name: idx_order_status_workflows_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_workflows_order_id ON public.order_status_workflows USING btree (order_id);


--
-- Name: idx_order_status_workflows_to_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_status_workflows_to_status ON public.order_status_workflows USING btree (to_status);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- Name: idx_orders_idempotency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_idempotency ON public.orders USING btree (idempotency_key);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (order_status);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_product_images_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_images_product ON public.product_images USING btree (product_id);


--
-- Name: idx_product_specs_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_specs_product ON public.product_specifications USING btree (product_id);


--
-- Name: idx_product_variants_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_product ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variants_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_type ON public.product_variants USING btree (variant_type);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_deleted_at ON public.products USING btree (deleted_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_price ON public.products USING btree (regular_price);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || (COALESCE(brand, ''::character varying))::text)));


--
-- Name: idx_products_search_vector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_search_vector ON public.products USING gin (search_vector);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_promo_codes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_codes_active ON public.promo_codes USING btree (is_active);


--
-- Name: idx_promo_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);


--
-- Name: idx_promo_usages_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_usages_code ON public.promo_code_usages USING btree (promo_code_id);


--
-- Name: idx_promo_usages_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promo_usages_user ON public.promo_code_usages USING btree (user_id);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_review_helpful_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_helpful_review ON public.review_helpful USING btree (review_id);


--
-- Name: idx_review_images_review; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_review_images_review ON public.review_images USING btree (review_id);


--
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_reviews_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_status ON public.reviews USING btree (status);


--
-- Name: idx_reviews_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);


--
-- Name: idx_search_analytics_clicked_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_analytics_clicked_product ON public.search_analytics USING btree (clicked_product_id);


--
-- Name: idx_search_analytics_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_analytics_created ON public.search_analytics USING btree (created_at DESC);


--
-- Name: idx_search_analytics_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_analytics_query ON public.search_analytics USING btree (query);


--
-- Name: idx_search_analytics_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_analytics_user ON public.search_analytics USING btree (user_id);


--
-- Name: idx_search_suggestions_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_suggestions_category ON public.search_suggestions USING btree (category_id);


--
-- Name: idx_search_suggestions_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_suggestions_count ON public.search_suggestions USING btree (search_count DESC);


--
-- Name: idx_search_suggestions_last_searched; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_suggestions_last_searched ON public.search_suggestions USING btree (last_searched_at DESC);


--
-- Name: idx_search_suggestions_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_search_suggestions_query ON public.search_suggestions USING btree (query);


--
-- Name: idx_stock_alerts_notified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_alerts_notified ON public.stock_alerts USING btree (is_notified);


--
-- Name: idx_stock_alerts_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_alerts_product ON public.stock_alerts USING btree (product_id);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_verification_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email_verification_code ON public.users USING btree (email_verification_code);


--
-- Name: idx_users_last_code_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_last_code_sent_at ON public.users USING btree (last_code_sent_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_wishlists_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wishlists_product ON public.wishlists USING btree (product_id);


--
-- Name: idx_wishlists_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wishlists_user ON public.wishlists USING btree (user_id);


--
-- Name: email_queues trigger_email_queues_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_email_queues_timestamp BEFORE UPDATE ON public.email_queues FOR EACH ROW EXECUTE FUNCTION public.update_email_queues_timestamp();


--
-- Name: products trigger_update_product_search_vector; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_product_search_vector BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_status_workflows update_order_status_workflows_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_order_status_workflows_timestamp BEFORE UPDATE ON public.order_status_workflows FOR EACH ROW EXECUTE FUNCTION public.update_order_status_workflows_timestamp();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promo_codes update_promo_codes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_chat_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_chat_session_id_fkey FOREIGN KEY (chat_session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_assigned_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_assigned_admin_id_fkey FOREIGN KEY (assigned_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_queues email_queues_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: email_queues email_queues_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_workflows order_status_workflows_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_workflows
    ADD CONSTRAINT order_status_workflows_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_specifications product_specifications_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_specifications
    ADD CONSTRAINT product_specifications_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: promo_code_usages promo_code_usages_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: promo_code_usages promo_code_usages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_helpful review_helpful_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_helpful
    ADD CONSTRAINT review_helpful_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: review_helpful review_helpful_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_helpful
    ADD CONSTRAINT review_helpful_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_images review_images_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_analytics search_analytics_clicked_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_clicked_product_id_fkey FOREIGN KEY (clicked_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: search_analytics search_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_suggestions search_suggestions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: stock_alerts stock_alerts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_alerts stock_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock_alerts stock_alerts_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict OL4du3XkuhvIH1x3cDyA3qlfUfeRMsy2xqHtdekE5WcObOJycnP1N0gB7fTMQja

