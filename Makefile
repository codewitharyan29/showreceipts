# DELTA — ShowReceipts
# One-command operations for development, testing, and deployment.

.PHONY: help install test benchmark adversarial demo deploy clean

help:
	@echo "DELTA — ShowReceipts"
	@echo ""
	@echo "Commands:"
	@echo "  make install       Install all dependencies"
	@echo "  make test          Run unit tests (no model required)"
	@echo "  make benchmark     Run fast benchmark on labeled dataset"
	@echo "  make adversarial   Run 50-attack adversarial test suite"
	@echo "  make dataset       Generate labeled PR dataset"
	@echo "  make demo          Start local demo (requires .env)"
	@echo "  make deploy        Deploy backend to Railway"
	@echo "  make lint          Run linting"
	@echo "  make clean         Remove build artifacts"
	@echo ""
	@echo "Environment variables:"
	@echo "  DELTA_API_URL      Backend URL (default: http://localhost:8000)"
	@echo "  GITHUB_TOKEN       GitHub token (increases rate limit to 5000/hr)"

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing CLI..."
	cd cli && npm install
	@echo "Installing frontend..."
	cd frontend && npm install
	@echo "✅ Installation complete"

test:
	@echo "Running unit tests..."
	cd backend && python -m pytest tests/test_signals.py -v --tb=short
	@echo "✅ Tests complete"

benchmark:
	@echo "Running benchmark (fast mode, no model required)..."
	cd backend && python ../dataset/_benchmark_runner.py
	@echo "✅ Results saved to dataset/benchmark_results.json"

benchmark-full:
	@echo "Running full benchmark (requires sentence-transformer model ~90MB)..."
	cd backend && python ../dataset/evaluate.py --full
	@echo "✅ Full benchmark complete"

adversarial:
	@echo "Running adversarial test suite (50 attack scenarios)..."
	cd backend && python ../dataset/adversarial_test.py
	@echo "✅ Adversarial test complete"

dataset:
	@echo "Generating labeled dataset..."
	python3 dataset/generate_dataset.py
	@echo "✅ Dataset generated"

demo:
	@echo "Starting DELTA demo..."
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	docker-compose up

demo-backend:
	cd backend && uvicorn main:app --reload --port 8000

demo-frontend:
	cd frontend && npm run dev

install-hook:
	@echo "Installing DELTA pre-commit hook..."
	cp hooks/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "✅ Hook installed. Set DELTA_API_URL and DELTA_THRESHOLD in your environment."

lint:
	cd backend && python -m flake8 detection/ core/ --max-line-length=120 --ignore=E501 || true

deploy:
	@echo "Deploying backend to Railway..."
	cd backend && railway up
	@echo "Deploying frontend to Vercel..."
	cd frontend && vercel --prod

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned"

ci:
	make test
	make benchmark
	make adversarial
	@echo "✅ All CI checks passed"

cross-validate:
	@echo "Running cross-validation and ablation study..."
	cd backend && python ../dataset/cross_validate.py
	@echo "✅ Results saved to dataset/cross_validation_results.json"

poster:
	@echo "Generating taxonomy poster..."
	python3 -c "
import sys; sys.path.insert(0,'dataset')
exec(open('dataset/generate_dataset.py').read().split('QUALITY_PRS_EXTRA')[0])
" 2>/dev/null || python3 /tmp/build_poster.py
	@echo "✅ Taxonomy poster: dataset/taxonomy_poster.svg"

full-ci: test benchmark adversarial cross-validate
	@echo "✅ Full CI complete"
