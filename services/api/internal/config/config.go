package config

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	DatabaseURL        string
	Port               string
	AppBaseURL         string
	AppEnv             string
	LLMAPIKey          string
	LLMBaseURL         string
	LLMModel           string
	PageSpeedAPIKey    string
	CreemAPIKey        string
	CreemAPIBase       string
	CreemWebhookSecret string
	CreemProductID     string
	AIMonthlyTokenCap  int
}

func Load() Config {
	loadEnvFiles(".env", "services/api/.env", "../.env", "../../.env")
	cfg := Config{
		DatabaseURL:        env("DATABASE_URL", "postgres://localhost:5432/sitepulse?sslmode=disable"),
		Port:               env("PORT", "8080"),
		AppBaseURL:         strings.TrimRight(env("APP_BASE_URL", "http://localhost:3000"), "/"),
		AppEnv:             env("APP_ENV", "development"),
		LLMAPIKey:          os.Getenv("LLM_API_KEY"),
		LLMBaseURL:         env("LLM_BASE_URL", "https://api.openai.com/v1"),
		LLMModel:           env("LLM_MODEL", "gpt-4o-mini"),
		PageSpeedAPIKey:    os.Getenv("PAGESPEED_API_KEY"),
		CreemAPIKey:        os.Getenv("CREEM_API_KEY"),
		CreemAPIBase:       env("CREEM_API_BASE", "https://test-api.creem.io"),
		CreemWebhookSecret: os.Getenv("CREEM_WEBHOOK_SECRET"),
		CreemProductID:     os.Getenv("CREEM_PRO_PRODUCT_ID"),
		AIMonthlyTokenCap:  200000,
	}
	if v := os.Getenv("AI_MONTHLY_TOKEN_CAP"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.AIMonthlyTokenCap = n
		}
	}
	return cfg
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func loadEnvFiles(paths ...string) {
	for _, path := range paths {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			line := strings.TrimSpace(sc.Text())
			if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
				continue
			}
			key, value, _ := strings.Cut(line, "=")
			key = strings.TrimSpace(key)
			value = strings.Trim(strings.TrimSpace(value), `"'`)
			if key != "" && os.Getenv(key) == "" {
				_ = os.Setenv(key, value)
			}
		}
		f.Close()
	}
}
