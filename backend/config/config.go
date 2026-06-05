package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

const (
	defaultRateRefreshInterval        = 6 * time.Hour
	defaultOpenBankingRefreshInterval = 12 * time.Hour
	defaultDBMaxOpenConns             = 5
	defaultDBMaxIdleConns             = 2
)

type Config struct {
	DBDSN          string
	DBMaxOpenConns int
	DBMaxIdleConns int

	GRPCSocketPath string

	RateRefreshInterval        time.Duration
	OpenBankingRefreshInterval time.Duration

	TrueLayerClientID     string
	TrueLayerClientSecret string
	GoCardlessSecretID    string
	GoCardlessSecretKey   string

	PublicAppURL string
}

// MustLoad parses configuration from environment variables.
// Panics on missing required values.
func MustLoad() *Config {
	return &Config{
		DBDSN:                      mustDBDSN(),
		DBMaxOpenConns:             defaultDBMaxOpenConns,
		DBMaxIdleConns:             defaultDBMaxIdleConns,
		GRPCSocketPath:             mustEnv("GRPC_SOCKET_PATH"),
		RateRefreshInterval:        getDuration("RATE_REFRESH_INTERVAL", defaultRateRefreshInterval),
		OpenBankingRefreshInterval: getDuration("OPEN_BANKING_REFRESH_INTERVAL", defaultOpenBankingRefreshInterval),
		TrueLayerClientID:          os.Getenv("TRUE_LAYER_CLIENT_ID"),
		TrueLayerClientSecret:      os.Getenv("TRUE_LAYER_CLIENT_SECRET"),
		GoCardlessSecretID:         os.Getenv("GOCARDLESS_SECRET_ID"),
		GoCardlessSecretKey:        os.Getenv("GOCARDLESS_SECRET_KEY"),
		PublicAppURL:               os.Getenv("PUBLIC_APP_URL"),
	}
}

// loc=UTC makes the driver decode DATETIME/TIMESTAMP values into
// time.Time at UTC, and time_zone='+00:00' pins NOW() and friends to
// UTC on the server side.
const dbParams = "parseTime=true&loc=UTC&time_zone=%27%2B00%3A00%27"

// mustDBDSN builds the MySQL DSN. Uses a unix socket when
// DB_SOCKET_PATH is set, otherwise tcp host:port.
func mustDBDSN() string {
	user := mustEnv("DB_USER")
	password := mustEnv("DB_PASSWORD")
	name := mustEnv("DB_NAME")
	if socket := os.Getenv("DB_SOCKET_PATH"); socket != "" {
		return fmt.Sprintf("%s:%s@unix(%s)/%s?%s", user, password, socket, name, dbParams)
	}
	host := mustEnv("DB_HOST")
	port, err := strconv.Atoi(mustEnv("DB_PORT"))
	if err != nil {
		log.Fatalf("invalid DB_PORT: %v", err)
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?%s", user, password, host, port, name, dbParams)
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env var: %s", key)
	}
	return v
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getDuration(key string, def time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		log.Fatalf("invalid duration for %s: %v", key, err)
	}
	return d
}
