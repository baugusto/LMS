SHELL := /bin/bash

ENV_FILE := $(shell if [ -f .env.production ]; then echo .env.production; else echo .env; fi)

.PHONY: build push deploy rollback status logs

build:
	@bash -c 'set -euo pipefail; source scripts/helpers.sh; load_env "$(ENV_FILE)"; \
	: "${DOCKERHUB_USER:?}"; : "${IMAGE_NAME:?}"; \
	IMAGE="$${DOCKERHUB_USER}/$${IMAGE_NAME}"; \
	TAG="$${TAG:-$$(compute_tag)}"; \
	if docker buildx version >/dev/null 2>&1; then \
	  docker buildx build --platform linux/amd64 -t "$${IMAGE}:$${TAG}" -t "$${IMAGE}:latest" -f docker/Dockerfile . --load; \
	else \
	  docker build -t "$${IMAGE}:$${TAG}" -t "$${IMAGE}:latest" -f docker/Dockerfile .; \
	fi; \
	echo "Built $${IMAGE}:$${TAG}"'

push:
	@bash -c 'set -euo pipefail; source scripts/helpers.sh; load_env "$(ENV_FILE)"; \
	: "${DOCKERHUB_USER:?}"; : "${IMAGE_NAME:?}"; \
	IMAGE="$${DOCKERHUB_USER}/$${IMAGE_NAME}"; \
	TAG="$${TAG:-$$(compute_tag)}"; \
	ensure_logged_in_dockerhub; \
	docker push "$${IMAGE}:$${TAG}"; \
	docker push "$${IMAGE}:latest"; \
	echo "Pushed $${IMAGE}:$${TAG}"'

deploy:
	@./scripts/deploy.sh

rollback:
	@bash -c 'if [ -z "$(TAG)" ]; then echo "TAG is required: make rollback TAG=<tag>"; exit 1; fi; ./scripts/rollback.sh "$(TAG)"'

status:
	@bash -c 'set -euo pipefail; source scripts/helpers.sh; load_env "$(ENV_FILE)"; docker service ls | grep "$${STACK_NAME}" || true'

logs:
	@bash -c 'set -euo pipefail; source scripts/helpers.sh; load_env "$(ENV_FILE)"; docker service logs -f "$${STACK_NAME}_lms"'
