# --- Build Stage (İmajın Boyutunu Küçültmek İçin) ---

FROM golang:1.23-alpine AS builder

# Çalışma dizinini ayarla
WORKDIR /app

# Bağımlılıkları indir
COPY go.mod go.sum ./
RUN go mod download

# Kodu kopyala ve derle
COPY . .
# Statik bir binary oluştur
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# --- Final Stage (Çalıştırma İmajı) ---
FROM alpine:latest
# Güvenlik için yeni bir kullanıcı oluştur
RUN adduser -D appuser
USER appuser

WORKDIR /app

# Sadece derlenmiş programı kopyala
COPY --from=builder /app/server .

# API'miz 8080 portunda çalışır
EXPOSE 8080

# Konteyner başladığında çalışacak komut
CMD ["/app/server"]