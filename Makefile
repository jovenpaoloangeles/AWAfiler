.PHONY: help build rebuild up down restart logs shell

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the Docker image
	docker compose build

rebuild: ## Rebuild the Docker image without cache
	docker compose build --no-cache

up: ## Start the containers
	docker compose up -d

down: ## Stop and remove containers
	docker compose down

restart: down up ## Restart the containers

logs: ## View container logs
	docker compose logs -f

shell: ## Open a shell in the container
	docker compose exec awafiler /bin/bash

prod: rebuild up ## Full rebuild and start (production deployment)
