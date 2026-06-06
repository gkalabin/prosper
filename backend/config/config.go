package config

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
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

// envPrefix namespaces every environment variable the application owns, so
// validateEnv can tell app configuration apart from the platform and runtime
// variables (PATH, PORT, etc) that share the environment.
const envPrefix = "PROSPER_"

// recognizedEnvKeys lists every PROSPER_-prefixed variable the application
// reads. The environment is shared by the Go backend and the Next.js frontend,
// so the set spans both: PROSPER_MAX_USERS_ALLOWED_TO_REGISTER, for instance,
// is consumed only by the frontend.
var recognizedEnvKeys = map[string]bool{
	"PROSPER_PUBLIC_APP_URL":                true,
	"PROSPER_DB_HOST":                       true,
	"PROSPER_DB_PORT":                       true,
	"PROSPER_DB_USER":                       true,
	"PROSPER_DB_NAME":                       true,
	"PROSPER_DB_PASSWORD":                   true,
	"PROSPER_DB_SOCKET_PATH":                true,
	"PROSPER_GRPC_SOCKET_PATH":              true,
	"PROSPER_RATE_REFRESH_INTERVAL":         true,
	"PROSPER_OPEN_BANKING_REFRESH_INTERVAL": true,
	"PROSPER_MAX_USERS_ALLOWED_TO_REGISTER": true,
	"PROSPER_TRUE_LAYER_CLIENT_ID":          true,
	"PROSPER_TRUE_LAYER_CLIENT_SECRET":      true,
	"PROSPER_GOCARDLESS_SECRET_ID":          true,
	"PROSPER_GOCARDLESS_SECRET_KEY":         true,
}

// MustLoad parses configuration from environment variables.
// Panics on missing required values.
func MustLoad() *Config {
	validateEnv()
	return &Config{
		DBDSN:                      mustDBDSN(),
		DBMaxOpenConns:             defaultDBMaxOpenConns,
		DBMaxIdleConns:             defaultDBMaxIdleConns,
		GRPCSocketPath:             mustEnv("PROSPER_GRPC_SOCKET_PATH"),
		RateRefreshInterval:        getDuration("PROSPER_RATE_REFRESH_INTERVAL", defaultRateRefreshInterval),
		OpenBankingRefreshInterval: getDuration("PROSPER_OPEN_BANKING_REFRESH_INTERVAL", defaultOpenBankingRefreshInterval),
		TrueLayerClientID:          os.Getenv("PROSPER_TRUE_LAYER_CLIENT_ID"),
		TrueLayerClientSecret:      os.Getenv("PROSPER_TRUE_LAYER_CLIENT_SECRET"),
		GoCardlessSecretID:         os.Getenv("PROSPER_GOCARDLESS_SECRET_ID"),
		GoCardlessSecretKey:        os.Getenv("PROSPER_GOCARDLESS_SECRET_KEY"),
		PublicAppURL:               os.Getenv("PROSPER_PUBLIC_APP_URL"),
	}
}

// validateEnv fails loudly when a PROSPER_-prefixed environment variable is not recognized.
func validateEnv() {
	if unknown := unrecognizedEnvKeys(os.Environ()); len(unknown) > 0 {
		log.Fatalf("unrecognized %s environment variables: %s", envPrefix, strings.Join(unknown, ", "))
	}
}

// unrecognizedEnvKeys returns the PROSPER_-prefixed keys in environ (KEY=VALUE
// entries as produced by os.Environ) that the application does not recognize,
// sorted for a stable error message.
func unrecognizedEnvKeys(environ []string) []string {
	var unknown []string
	for _, entry := range environ {
		key, _, _ := strings.Cut(entry, "=")
		if strings.HasPrefix(key, envPrefix) && !recognizedEnvKeys[key] {
			unknown = append(unknown, key)
		}
	}
	sort.Strings(unknown)
	return unknown
}

// loc=UTC makes the driver decode DATETIME/TIMESTAMP values into
// time.Time at UTC, and time_zone='+00:00' pins NOW() and friends to
// UTC on the server side.
const dbParams = "parseTime=true&loc=UTC&time_zone=%27%2B00%3A00%27"

// mustDBDSN builds the MySQL DSN. Uses a unix socket when
// PROSPER_DB_SOCKET_PATH is set, otherwise tcp host:port.
func mustDBDSN() string {
	user := mustEnv("PROSPER_DB_USER")
	password := mustEnv("PROSPER_DB_PASSWORD")
	name := mustEnv("PROSPER_DB_NAME")
	if socket := os.Getenv("PROSPER_DB_SOCKET_PATH"); socket != "" {
		return fmt.Sprintf("%s:%s@unix(%s)/%s?%s", user, password, socket, name, dbParams)
	}
	host := mustEnv("PROSPER_DB_HOST")
	port, err := strconv.Atoi(mustEnv("PROSPER_DB_PORT"))
	if err != nil {
		log.Fatalf("invalid PROSPER_DB_PORT: %v", err)
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
