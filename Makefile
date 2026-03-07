.PHONY: up down logs restart

up:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

restart: down up
