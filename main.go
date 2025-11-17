package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	// github.com/joho/godotenv'e burada gerek yok, çünkü Docker Compose değişkenleri direkt sağlar.
)

// --- Yeni Yapı: ApiHandler ---
// Bu struct, Master ve Replica bağlantılarını tutar.
type ApiHandler struct {
	dbWrite *pgxpool.Pool // YAZMA (Master) Veritabanı bağlantısı
	dbRead  *pgxpool.Pool // OKUMA (Replica) Veritabanı bağlantısı
}

// User ve CreateUserRequest yapıları
type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type CreateUserRequest struct {
	Name string `json:"name" binding:"required"`
}

func main() {
	log.Println("API sunucusu başlıyor...")

	// --- 1. Master ve Replica URL'lerini Ortamdan Oku ---
	writeURL := os.Getenv("PG_URL_WRITE")
	readURL := os.Getenv("PG_URL_READ")

	if writeURL == "" || readURL == "" {
		log.Fatal("HATA: PG_URL_WRITE ve PG_URL_READ ortam değişkenleri set edilmeli.")
	}

	// --- 2. Master (Yazma) Bağlantısını Kur ---
	dbWrite, err := connectToDB(writeURL, "Master (Yazma)")
	if err != nil {
		log.Fatalf("Master veritabanına bağlanılamadı: %v", err)
	}
	defer dbWrite.Close()

	// --- 3. Replica (Okuma) Bağlantısını Kur ---
	dbRead, err := connectToDB(readURL, "Replica (Okuma)")
	if err != nil {
		log.Fatalf("Replica veritabanına bağlanılamadı: %v", err)
	}
	defer dbRead.Close()
    
    // --- 4. Veritabanı Şemasını Ayarla (SADECE Master'da) ---
	initSchema(dbWrite)


	// --- 5. Handler'ı iki bağlantıyla birlikte oluştur ---
	handler := &ApiHandler{
		dbWrite: dbWrite,
		dbRead:  dbRead,
	}

	// --- 6. HTTP Router'ı Ayarla ---
	router := gin.Default()

	router.POST("/users", handler.addUser)    // YAZMA -> Master'a gider
	router.GET("/users", handler.listUsers)   // OKUMA -> Replica'ya gider
	router.GET("/health", handler.healthCheck) // Health check

	log.Println("Sunucu :8080 portunda dinlemede...")
	router.Run(":8080")
}

// connectToDB: Bağlantı kurmayı basitleştiren yardımcı fonksiyon
func connectToDB(url, name string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}
	log.Printf("PostgreSQL bağlantısı başarılı: %s", name)
	return pool, nil
}

// initSchema: Tabloyu oluşturur (SADECE dbWrite/Master kullanır)
func initSchema(db *pgxpool.Pool) {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL
	);
	`
	_, err := db.Exec(context.Background(), schema)
	if err != nil {
		log.Fatalf("Tablo oluşturulamadı: %v", err)
	}
	log.Println("'users' tablosu hazır.")
}

// --- Handler Metotları ---

func (h *ApiHandler) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "API calisiyor"})
}

// POST /users (YAZMA İşlemi - Master DB)
func (h *ApiHandler) addUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek. 'name' alanı gerekiyor."})
		return
	}
	var newUser User
	err := h.dbWrite.QueryRow(context.Background(), // <-- h.dbWrite kullanıldı
		"INSERT INTO users (name) VALUES ($1) RETURNING id, name",
		req.Name).Scan(&newUser.ID, &newUser.Name)

	if err != nil {
		log.Printf("Veritabanına eklenemedi: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı oluşturulamadı"})
		return
	}

	c.JSON(http.StatusCreated, newUser)
}

// GET /users (OKUMA İşlemi - Replica DB)
func (h *ApiHandler) listUsers(c *gin.Context) {
	var users []User
	rows, err := h.dbRead.Query(context.Background(), "SELECT id, name FROM users ORDER BY id ASC") // <-- h.dbRead kullanıldı
	if err != nil {
		log.Printf("Veritabanı sorgu hatası: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcılar listelenemedi"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name); err != nil {
			log.Printf("Veri okuma hatası: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Veri okunurken hata oluştu"})
			return
		}
		users = append(users, u)
	}
	if users == nil {
		users = make([]User, 0)
	}
	c.JSON(http.StatusOK, users)
}