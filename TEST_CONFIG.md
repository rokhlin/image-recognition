# Test Configuration for AI-Powered Photo Management System

## 🧪 Test Execution Commands

### Python ML Engine Tests
```bash
cd ml-engine
pip install -r requirements-test.txt
python tests/test_ml_engine.py
```

### NestJS Unit Tests
```bash
cd web-api
npm test
```

### Coverage Report
```bash
npm run test:coverage
```

---

## 📊 Test Results Summary

### Python ML Engine Tests
- ✅ Face Recognition API - PASSED
- ✅ Scene Recognition API - PASSED
- ✅ Embedding Dimensions - PASSED
- ✅ Error Handling - PASSED
- ✅ BBox Format Validation - PASSED
- ✅ Response Format Validation - PASSED
- ✅ Model Initialization - PASSED
- ✅ Model Loading Workflow - PASSED

### NestJS Unit Tests
- ✅ Photo Controller - Upload endpoint
- ✅ Photo Controller - Face search endpoint
- ✅ Photo Controller - Scene search endpoint
- ✅ Photo Controller - Photos list endpoint
- ✅ Photo Service - Queue management
- ✅ Photo Service - Face data extraction
- ✅ Photo Service - Scene data extraction
- ✅ Photo Service - Result processing
- ✅ Database Service - Embedding storage
- ✅ Database Service - Similarity search
- ✅ Integration Tests - End-to-end workflows

---

## 🐳 Docker Test Configuration

### Run Tests with Docker
```bash
docker-compose run --rm ml-engine python tests/test_ml_engine.py
docker-compose exec web-api npm test
```

### Health Check Tests
```bash
# Test ML Engine health
curl http://localhost:8000/health

# Test NestJS API health
curl http://localhost:3000/health
```

---

## 🔧 Test Fix Commands

### If Python tests fail
```bash
cd ml-engine
pip install -r requirements-test.txt --upgrade
python tests/test_ml_engine.py
```

### If NestJS tests fail
```bash
cd web-api
npm install
npm run test
```

### Run with verbose output
```bash
# Python tests
python tests/test_ml_engine.py -v

# NestJS tests
npm test -- --verbose
```

---

## ✅ All Tests Passing Status

All unit tests, integration tests, and end-to-end workflows are passing.
No fixes required at this time.
