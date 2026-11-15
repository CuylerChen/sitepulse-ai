.PHONY: api web test

api:
	cd services/api && go run ./cmd/server

web:
	cd apps/web && npm run dev

test:
	cd services/api && go test ./...
