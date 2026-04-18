# Test Plan: AI-Powered Photo Management System

## 📋 Test Coverage Strategy

### Component Breakdown

| Component | Type | Test Level | Priority |
|-----------|------|------------|----------|
| ML Engine (Python) | API Service | Unit + Integration | High |
| NestJS Photo Controller | REST API | Unit | High |
| NestJS Photo Service | Business Logic | Unit + Mock | High |
| NestJS Database Service | Data Access | Unit + Integration | Medium |
| NestJS Photo Processor | Background Worker | Unit + Integration | High |
| Docker Compose Stack | End-to-End | Integration | High |

---

## 🧪 Test Scenarios

### 1. ML Engine Tests (Python)

#### 1.1 Face Recognition API
- [ ] Test successful face detection on valid image
- [ ] Test empty image handling
- [ ] Test non-existent file path error
- [ ] Test invalid image format error
- [ ] Test embedding dimension validation (512-dim)

#### 1.2 Scene Recognition API
- [ ] Test successful scene embedding generation
- [ ] Test CLIP model unavailability handling
- [ ] Test embedding dimension validation (384-dim)

#### 1.3 Model Loading Tests
- [ ] Test InsightFace model initialization
- [ ] Test CPU execution provider fallback
- [ ] Test GPU execution provider (if available)

---

### 2. NestJS Unit Tests

#### 2.1 Photo Controller Tests
- [ ] Test photo upload endpoint with valid request
- [ ] Test photo upload endpoint with invalid file path
- [ ] Test face search endpoint
- [ ] Test scene search endpoint
- [ ] Test photos list endpoint
- [ ] Test CORS headers presence

#### 2.2 Photo Service Tests
- [ ] Test queuePhotoForAnalysis with valid data
- [ ] Test extractFaceData successful response
- [ ] Test extractFaceData error handling
- [ ] Test extractSceneData successful response
- [ ] Test extractSceneData error handling
- [ ] Test processFaceResults with empty faces array
- [ ] Test processFaceResults with valid face data
- [ ] Test processSceneResults with valid scene data

#### 2.3 Database Service Tests
- [ ] Test saveFaceEmbedding successful insert
- [ ] Test saveSceneEmbedding successful insert
- [ ] Test searchSimilarFaces with embeddings
- [ ] Test searchSimilarScenes with embeddings
- [ ] Test getPhotos list retrieval
- [ ] Test edge cases (empty results, null values)

#### 2.4 Photo Processor Tests
- [ ] Test job data extraction
- [ ] Test ML engine call success
- [ ] Test ML engine call failure/retry
- [ ] Test result validation

---

### 3. Integration Tests

#### 3.1 End-to-End Upload Flow
- [ ] Upload photo → Queue job → Process → Save embeddings → Return success

#### 3.2 Face Search Flow
- [ ] Upload multiple photos with faces
- [ ] Extract face embedding from one photo
- [ ] Search for similar faces in other photos
- [ ] Verify similarity threshold filtering

#### 3.3 Scene Search Flow
- [ ] Upload photos with different scenes (beach, office, park)
- [ ] Generate scene embedding from one photo
- [ ] Search for similar scene photos
- [ ] Verify semantic search accuracy

---

### 4. Docker/Infrastructure Tests

#### 4.1 Container Health Checks
- [ ] All containers start successfully
- [ ] PostgreSQL database is accessible
- [ ] Redis connection works
- [ ] ML Engine responds to health check
- [ ] NestJS API returns 200 OK

#### 4.2 Volume Mount Tests
- [ ] Photos directory is writable
- [ ] ML models volume is readable
- [ ] Database persists data correctly

---

## 📊 Test Execution Order

1. **Unit Tests** (Fastest, isolated)
   - Python ML Engine tests
   - NestJS controller/service mocks

2. **Integration Tests** (Medium speed, requires services)
   - Mocked database/queue tests
   - Component interaction tests

3. **End-to-End Tests** (Slowest, full stack)
   - Docker compose up
   - Full API workflow tests
   - Cleanup after tests

---

## 🔧 Test Tools & Setup

### Python Test Dependencies
```txt
pytest==7.4.0
pytest-cov==4.1.0
httpx==0.25.0
pytest-asyncio==0.21.1
mock==5.1.0
numpy==1.26.3
```

### NestJS Test Dependencies
```json
{
  "dependencies": {},
  "devDependencies": {
    "@nestjs/testing": "^10.2.0",
    "@types/supertest": "^6.3.0",
    "supertest": "^6.3.0",
    "@types/axios": "^1.5.0"
  }
}
```

---

## 📈 Success Criteria

- **Unit Tests**: 90%+ coverage on core logic
- **Integration Tests**: All critical workflows passing
- **End-to-End Tests**: Complete API lifecycle working
- **Performance**: Face detection < 2s per image (CPU), < 0.5s (GPU)

---

## 🛠️ Fix Strategy

When tests fail:
1. Check error logs in console output
2. Verify Docker container health
3. Inspect mock data structures
4. Validate API response formats
5. Review database schema compatibility
6. Check environment variable values
