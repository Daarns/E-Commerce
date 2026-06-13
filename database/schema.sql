--
-- PostgreSQL database dump
--

\restrict cohlaaG5Zwt6feiyzEgDbjUnySCWjzocUYpUynwv2vyGbHetuTXI2jGUkIzBTw6

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
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_email_queues_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_email_queues_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_order_status_workflows_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_status_workflows_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_product_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.sku, ''));
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    session_id character varying(255),
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    combination_id uuid
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sender_id uuid,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    conversation_id uuid,
    read_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: conversation_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    message_count integer DEFAULT 0,
    user_message_count integer DEFAULT 0,
    agent_message_count integer DEFAULT 0,
    avg_response_time_seconds integer,
    satisfaction_score integer,
    feedback_text text,
    resolved_by_agent boolean,
    resolution_category text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    CONSTRAINT conversation_metadata_satisfaction_score_check CHECK (((satisfaction_score >= 1) AND (satisfaction_score <= 5)))
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid,
    subject text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    assigned_at timestamp without time zone,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    last_message text,
    last_message_at timestamp without time zone,
    unread_customer_count integer DEFAULT 0 NOT NULL,
    unread_agent_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    CONSTRAINT conversations_category_check CHECK (((category)::text = ANY ((ARRAY['general'::character varying, 'billing'::character varying, 'support'::character varying, 'product'::character varying, 'complaint'::character varying])::text[]))),
    CONSTRAINT conversations_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT conversations_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: email_queues; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    link_url text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100) NOT NULL,
    variant_type character varying(50),
    variant_value character varying(100),
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    combination_id uuid
);


--
-- Name: order_refund_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_refund_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    image_url text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    refund_attempt integer DEFAULT 1 NOT NULL
);


--
-- Name: order_status_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    from_status character varying(50),
    to_status character varying(50) NOT NULL,
    email_triggered boolean DEFAULT false,
    email_type character varying(50),
    triggered_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
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
    paid_at timestamp with time zone,
    shipping_method character varying(50),
    tracking_number character varying(255),
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    customer_notes text,
    admin_notes text,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    idempotency_key character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    snap_token character varying(512),
    customer_email character varying(255),
    snap_token_created_at timestamp with time zone,
    payment_expires_at timestamp with time zone
);


--
-- Name: product_combination_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_combination_options (
    combination_id uuid NOT NULL,
    option_id uuid NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    alt_text character varying(255),
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    option_id uuid,
    width integer,
    height integer,
    aspect_ratio numeric(10,6)
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL,
    title character varying(100),
    review_text text,
    helpful_count integer DEFAULT 0,
    unhelpful_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_verified_purchase boolean DEFAULT false,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: product_variant_combinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_combinations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    price_adjustment numeric(12,2) DEFAULT 0 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    sku character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_variant_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_options (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    variant_type_id uuid NOT NULL,
    value character varying(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_variant_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    is_visual boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
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
    meta_title character varying(60),
    meta_description character varying(160),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    search_vector tsvector,
    canonical_url character varying(500),
    og_image character varying(500),
    avg_rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0
);


--
-- Name: promo_code_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_code_usages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    promo_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    discount_amount numeric(12,2) NOT NULL,
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_helpful_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_helpful_votes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_helpful boolean NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    review_id uuid NOT NULL,
    image_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    version character varying(255) NOT NULL,
    description text,
    installed_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    execution_time integer
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: search_suggestions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shipping_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_methods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    price numeric(12,2) NOT NULL,
    estimated_days_min integer DEFAULT 1 NOT NULL,
    estimated_days_max integer DEFAULT 7 NOT NULL,
    icon character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: temp_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    uploaded_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '02:00:00'::interval) NOT NULL,
    claimed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    width integer,
    height integer,
    aspect_ratio numeric(10,6)
);


--
-- Name: typing_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_indicators (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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
    email_verification_code character varying(6),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'banned'::character varying])::text[])))
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    external_id text NOT NULL,
    provider text DEFAULT 'midtrans'::text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: conversation_metadata conversation_metadata_conversation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_metadata
    ADD CONSTRAINT conversation_metadata_conversation_id_key UNIQUE (conversation_id);


--
-- Name: conversation_metadata conversation_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_metadata
    ADD CONSTRAINT conversation_metadata_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: email_queues email_queues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_pkey PRIMARY KEY (id);


--
-- Name: typing_indicators idx_typing_conversation_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT idx_typing_conversation_user UNIQUE (conversation_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_refund_images order_refund_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_refund_images
    ADD CONSTRAINT order_refund_images_pkey PRIMARY KEY (id);


--
-- Name: order_status_workflows order_status_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_workflows
    ADD CONSTRAINT order_status_workflows_pkey PRIMARY KEY (id);


--
-- Name: orders orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: product_combination_options product_combination_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_combination_options
    ADD CONSTRAINT product_combination_options_pkey PRIMARY KEY (combination_id, option_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_variant_combinations product_variant_combinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_combinations
    ADD CONSTRAINT product_variant_combinations_pkey PRIMARY KEY (id);


--
-- Name: product_variant_combinations product_variant_combinations_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_combinations
    ADD CONSTRAINT product_variant_combinations_sku_key UNIQUE (sku);


--
-- Name: product_variant_options product_variant_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_pkey PRIMARY KEY (id);


--
-- Name: product_variant_options product_variant_options_variant_type_id_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_variant_type_id_value_key UNIQUE (variant_type_id, value);


--
-- Name: product_variant_types product_variant_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_types
    ADD CONSTRAINT product_variant_types_pkey PRIMARY KEY (id);


--
-- Name: product_variant_types product_variant_types_product_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_types
    ADD CONSTRAINT product_variant_types_product_id_name_key UNIQUE (product_id, name);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: promo_code_usages promo_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: review_helpful_votes review_helpful_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id);


--
-- Name: review_images review_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_version_key UNIQUE (version);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: search_suggestions search_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_pkey PRIMARY KEY (id);


--
-- Name: search_suggestions search_suggestions_query_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_query_category_id_key UNIQUE (query, category_id);


--
-- Name: shipping_methods shipping_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_code_key UNIQUE (code);


--
-- Name: shipping_methods shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: temp_uploads temp_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temp_uploads
    ADD CONSTRAINT temp_uploads_pkey PRIMARY KEY (id);


--
-- Name: typing_indicators typing_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_pkey PRIMARY KEY (id);


--
-- Name: review_helpful_votes unique_review_user_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT unique_review_user_vote UNIQUE (review_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (external_id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: idx_activity_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_action ON public.activity_logs USING btree (action_type);


--
-- Name: idx_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_activity_user_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user_action ON public.activity_logs USING btree (user_id, action_type);


--
-- Name: idx_activity_user_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user_action_date ON public.activity_logs USING btree (user_id, action_type, created_at DESC);


--
-- Name: idx_activity_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user_date ON public.activity_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_addresses_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_default ON public.addresses USING btree (is_default);


--
-- Name: idx_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_user ON public.addresses USING btree (user_id);


--
-- Name: idx_cart_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_product ON public.cart_items USING btree (product_id);


--
-- Name: idx_cart_items_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_session ON public.cart_items USING btree (session_id);


--
-- Name: idx_cart_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user ON public.cart_items USING btree (user_id);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_messages_conversation_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation_created ON public.chat_messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);


--
-- Name: idx_chat_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_unread ON public.chat_messages USING btree (is_read);


--
-- Name: idx_chat_messages_unread_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_unread_conversation ON public.chat_messages USING btree (conversation_id, is_read);


--
-- Name: idx_combination_options_comb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combination_options_comb ON public.product_combination_options USING btree (combination_id);


--
-- Name: idx_combination_options_opt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combination_options_opt ON public.product_combination_options USING btree (option_id);


--
-- Name: idx_combinations_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combinations_product ON public.product_variant_combinations USING btree (product_id);


--
-- Name: idx_conversation_metadata_satisfaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_metadata_satisfaction ON public.conversation_metadata USING btree (satisfaction_score);


--
-- Name: idx_conversations_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_agent ON public.conversations USING btree (agent_id);


--
-- Name: idx_conversations_agent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_agent_status ON public.conversations USING btree (agent_id, status);


--
-- Name: idx_conversations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_created ON public.conversations USING btree (created_at DESC);


--
-- Name: idx_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message ON public.conversations USING btree (last_message_at DESC);


--
-- Name: idx_conversations_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_priority ON public.conversations USING btree (priority);


--
-- Name: idx_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status);


--
-- Name: idx_conversations_status_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_status_last_message ON public.conversations USING btree (status, last_message_at DESC);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.conversations USING btree (user_id);


--
-- Name: idx_conversations_user_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user_last_message ON public.conversations USING btree (user_id, last_message_at DESC);


--
-- Name: idx_conversations_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user_status ON public.conversations USING btree (user_id, status);


--
-- Name: idx_email_queues_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_created_at ON public.email_queues USING btree (created_at);


--
-- Name: idx_email_queues_email_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_email_type ON public.email_queues USING btree (email_type);


--
-- Name: idx_email_queues_next_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_next_retry ON public.email_queues USING btree (next_retry) WHERE ((status)::text = 'failed'::text);


--
-- Name: idx_email_queues_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_order_id ON public.email_queues USING btree (order_id);


--
-- Name: idx_email_queues_recipient_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_recipient_email ON public.email_queues USING btree (recipient_email);


--
-- Name: idx_email_queues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_status ON public.email_queues USING btree (status) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_email_queues_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queues_user_id ON public.email_queues USING btree (user_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product ON public.order_items USING btree (product_id);


--
-- Name: idx_order_refund_images_order_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_refund_images_order_attempt ON public.order_refund_images USING btree (order_id, refund_attempt, "position", created_at);


--
-- Name: idx_order_refund_images_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_refund_images_order_id ON public.order_refund_images USING btree (order_id, "position", created_at);


--
-- Name: idx_order_refund_images_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_refund_images_user_id ON public.order_refund_images USING btree (user_id);


--
-- Name: idx_order_status_workflows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_workflows_created_at ON public.order_status_workflows USING btree (created_at);


--
-- Name: idx_order_status_workflows_email_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_workflows_email_triggered ON public.order_status_workflows USING btree (email_triggered);


--
-- Name: idx_order_status_workflows_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_workflows_order_id ON public.order_status_workflows USING btree (order_id);


--
-- Name: idx_order_status_workflows_to_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_workflows_to_status ON public.order_status_workflows USING btree (to_status);


--
-- Name: idx_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created ON public.orders USING btree (created_at);


--
-- Name: idx_orders_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_idempotency ON public.orders USING btree (idempotency_key);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_payment_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_expiry ON public.orders USING btree (payment_status, order_status, payment_expires_at) WHERE (payment_expires_at IS NOT NULL);


--
-- Name: idx_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status ON public.orders USING btree (payment_status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (order_status);


--
-- Name: idx_orders_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_created ON public.orders USING btree (order_status, created_at DESC);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_product_images_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_option ON public.product_images USING btree (option_id);


--
-- Name: idx_product_images_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product ON public.product_images USING btree (product_id);


--
-- Name: idx_product_reviews_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_created ON public.product_reviews USING btree (product_id, created_at DESC);


--
-- Name: idx_product_reviews_helpful; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_helpful ON public.product_reviews USING btree (product_id, helpful_count DESC);


--
-- Name: idx_product_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_product ON public.product_reviews USING btree (product_id);


--
-- Name: idx_product_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_rating ON public.product_reviews USING btree (product_id, rating);


--
-- Name: idx_product_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_user ON public.product_reviews USING btree (user_id);


--
-- Name: idx_product_reviews_user_product_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_user_product_order ON public.product_reviews USING btree (user_id, product_id, order_id);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_products_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_deleted_at ON public.products USING btree (deleted_at);


--
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_price ON public.products USING btree (regular_price);


--
-- Name: idx_products_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_rating ON public.products USING btree (avg_rating DESC);


--
-- Name: idx_products_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search ON public.products USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || (COALESCE(brand, ''::character varying))::text)));


--
-- Name: idx_products_search_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_search_vector ON public.products USING gin (search_vector);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_promo_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_codes_active ON public.promo_codes USING btree (is_active);


--
-- Name: idx_promo_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);


--
-- Name: idx_promo_usages_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_usages_code ON public.promo_code_usages USING btree (promo_code_id);


--
-- Name: idx_promo_usages_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_usages_user ON public.promo_code_usages USING btree (user_id);


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_review_images_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_images_review ON public.review_images USING btree (review_id);


--
-- Name: idx_review_votes_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_votes_review ON public.review_helpful_votes USING btree (review_id);


--
-- Name: idx_review_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_votes_user ON public.review_helpful_votes USING btree (user_id);


--
-- Name: idx_search_analytics_clicked_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_clicked_product ON public.search_analytics USING btree (clicked_product_id);


--
-- Name: idx_search_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_created ON public.search_analytics USING btree (created_at DESC);


--
-- Name: idx_search_analytics_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_query ON public.search_analytics USING btree (query);


--
-- Name: idx_search_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_user ON public.search_analytics USING btree (user_id);


--
-- Name: idx_search_suggestions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_category ON public.search_suggestions USING btree (category_id);


--
-- Name: idx_search_suggestions_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_count ON public.search_suggestions USING btree (search_count DESC);


--
-- Name: idx_search_suggestions_last_searched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_last_searched ON public.search_suggestions USING btree (last_searched_at DESC);


--
-- Name: idx_search_suggestions_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_suggestions_query ON public.search_suggestions USING btree (query);


--
-- Name: idx_shipping_methods_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_methods_active ON public.shipping_methods USING btree (is_active);


--
-- Name: idx_shipping_methods_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_methods_code ON public.shipping_methods USING btree (code);


--
-- Name: idx_shipping_methods_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_methods_order ON public.shipping_methods USING btree (display_order);


--
-- Name: idx_temp_uploads_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_temp_uploads_cleanup ON public.temp_uploads USING btree (expires_at) WHERE (claimed = false);


--
-- Name: idx_temp_uploads_image_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_temp_uploads_image_url ON public.temp_uploads USING btree (image_url) WHERE (claimed = false);


--
-- Name: idx_temp_uploads_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_temp_uploads_uploaded_by ON public.temp_uploads USING btree (uploaded_by, created_at DESC);


--
-- Name: idx_typing_indicators_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_conversation ON public.typing_indicators USING btree (conversation_id);


--
-- Name: idx_typing_indicators_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_expires ON public.typing_indicators USING btree (expires_at);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_verification_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_verification_code ON public.users USING btree (email_verification_code);


--
-- Name: idx_users_last_code_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_code_sent_at ON public.users USING btree (last_code_sent_at);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_variant_options_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variant_options_type ON public.product_variant_options USING btree (variant_type_id);


--
-- Name: idx_variant_types_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variant_types_product ON public.product_variant_types USING btree (product_id);


--
-- Name: idx_webhook_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_created_at ON public.webhook_events USING btree (created_at);


--
-- Name: idx_webhook_events_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_processed ON public.webhook_events USING btree (processed_at) WHERE (processed_at IS NULL);


--
-- Name: idx_wishlists_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_product ON public.wishlists USING btree (product_id);


--
-- Name: idx_wishlists_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_user ON public.wishlists USING btree (user_id);


--
-- Name: idx_wishlists_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_user_created ON public.wishlists USING btree (user_id, created_at DESC);


--
-- Name: unique_product_user_order_review; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_product_user_order_review ON public.product_reviews USING btree (product_id, user_id, order_id) WHERE (order_id IS NOT NULL);


--
-- Name: email_queues trigger_email_queues_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_email_queues_timestamp BEFORE UPDATE ON public.email_queues FOR EACH ROW EXECUTE FUNCTION public.update_email_queues_timestamp();


--
-- Name: products trigger_update_product_search_vector; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_product_search_vector BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_status_workflows update_order_status_workflows_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_status_workflows_timestamp BEFORE UPDATE ON public.order_status_workflows FOR EACH ROW EXECUTE FUNCTION public.update_order_status_workflows_timestamp();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variant_combinations update_product_variant_combinations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variant_combinations_updated_at BEFORE UPDATE ON public.product_variant_combinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variant_options update_product_variant_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variant_options_updated_at BEFORE UPDATE ON public.product_variant_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variant_types update_product_variant_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variant_types_updated_at BEFORE UPDATE ON public.product_variant_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promo_codes update_promo_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_methods update_shipping_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipping_methods_updated_at BEFORE UPDATE ON public.shipping_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_combination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_combination_id_fkey FOREIGN KEY (combination_id) REFERENCES public.product_variant_combinations(id) ON DELETE SET NULL;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversation_metadata conversation_metadata_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_metadata
    ADD CONSTRAINT conversation_metadata_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: email_queues email_queues_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: email_queues email_queues_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queues
    ADD CONSTRAINT email_queues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_combination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_combination_id_fkey FOREIGN KEY (combination_id) REFERENCES public.product_variant_combinations(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: order_refund_images order_refund_images_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_refund_images
    ADD CONSTRAINT order_refund_images_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_refund_images order_refund_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_refund_images
    ADD CONSTRAINT order_refund_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_status_workflows order_status_workflows_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_workflows
    ADD CONSTRAINT order_status_workflows_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: product_combination_options product_combination_options_combination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_combination_options
    ADD CONSTRAINT product_combination_options_combination_id_fkey FOREIGN KEY (combination_id) REFERENCES public.product_variant_combinations(id) ON DELETE CASCADE;


--
-- Name: product_combination_options product_combination_options_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_combination_options
    ADD CONSTRAINT product_combination_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_variant_options(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.product_variant_options(id) ON DELETE SET NULL;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_variant_combinations product_variant_combinations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_combinations
    ADD CONSTRAINT product_variant_combinations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variant_options product_variant_options_variant_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_variant_type_id_fkey FOREIGN KEY (variant_type_id) REFERENCES public.product_variant_types(id) ON DELETE CASCADE;


--
-- Name: product_variant_types product_variant_types_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_types
    ADD CONSTRAINT product_variant_types_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: promo_code_usages promo_code_usages_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: promo_code_usages promo_code_usages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_code_usages
    ADD CONSTRAINT promo_code_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_helpful_votes review_helpful_votes_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.product_reviews(id) ON DELETE CASCADE;


--
-- Name: review_helpful_votes review_helpful_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_images review_images_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_images
    ADD CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.product_reviews(id) ON DELETE CASCADE;


--
-- Name: search_analytics search_analytics_clicked_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_clicked_product_id_fkey FOREIGN KEY (clicked_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: search_analytics search_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_suggestions search_suggestions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_suggestions
    ADD CONSTRAINT search_suggestions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: temp_uploads temp_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temp_uploads
    ADD CONSTRAINT temp_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: typing_indicators typing_indicators_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cohlaaG5Zwt6feiyzEgDbjUnySCWjzocUYpUynwv2vyGbHetuTXI2jGUkIzBTw6
