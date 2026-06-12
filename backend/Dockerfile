# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache build-base ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -buildvcs=false -o /out/ecommerce-api ./cmd/api

FROM alpine:3.22 AS runtime

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata \
  && addgroup -S app \
  && adduser -S app -G app

COPY --from=builder /out/ecommerce-api ./ecommerce-api

ENV APP_ENV=production
ENV PORT=8080
ENV APP_TIMEZONE=Asia/Jakarta

EXPOSE 8080

USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/ping || exit 1

CMD ["./ecommerce-api"]
