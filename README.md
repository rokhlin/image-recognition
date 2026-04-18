# 📸 AI-Powered Photo Management System

A self-hosted, AI-powered photo management system that rivals commercial cloud solutions while keeping your data private.

## ✨ Key Features

- **Face Recognition** using InsightFace (512-D embedding vectors)
- **Scene/Tag Recognition** using OpenAI CLIP (semantic search)
- **Vector Database** with PostgreSQL + pgvector for lightning-fast similarity searches
- **Background Processing** with Redis + BullMQ queue system
- **Privacy-First** - All data stays local

## 🏗️ System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   NestJS    │────▶│  Python ML  │────▶│   PostgreSQL│◀───│   Redis      │
│  (Orchestrator) │  │   Engine    │     │   (Vectors) │     │  (Queue Broker)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │                 │
       ▼                    ▼                    ▼                 ▼
    Uploads            Face/Scene      Metadata &          Job Queue
   Processing          Embeddings      Similarity Search    Workers
```

## 🛠️ Tech Stack

| Component | Technology | Why? |
|-----------|------------|------|
| Language (ML) | Python (FastAPI) | Industry standard for AI/ML libraries |
| Language (App) | TypeScript (NestJS/Node.js) | Excellent for file system watching, API management |
| Face Recognition | InsightFace | SOTA accuracy; handles different angles/lighting |
| Scene/Tags | OpenAI CLIP | "Zero-shot" classification - search by natural language |
| Database | PostgreSQL + pgvector | Critical for storing embeddings and similarity searches |
| Task Queue | Redis + BullMQ | Keeps UI responsive while background jobs run |
| Deployment | Docker Compose | Orchestrates all services together |

## 📁 Project Structure

```bash
photo-analyzer/
├── docker-compose.yml
├── .env
├── ml-engine/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── web-api/
│   ├── Dockerfile
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── photo/
│   │   │   ├── photo.controller.ts
│   │   │   ├── photo.service.ts
│   │   │   ├── photo.processor.ts
│   │   │   └── database.service.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── postgres-init/
│   └── init.sql
└── storage/
    └── photos/
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd imageRecognition
npm install --prefix web-api
```

### 2. Download ML Models (Optional but Recommended)

```bash
chmod +x download-models.sh
./download-models.sh
```

### 3. Configure Environment

Edit `.env` file with your settings:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/photo_manager
POSTGRES_USER=user
POSTGRES_PASSWORD=password
ML_ENGINE_URL=http://ml-engine:8000
REDIS_HOST=redis
REDIS_PORT=6379
API_KEY=your-secret-api-key
MAX_BATCH_SIZE=100
```

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Verify Setup

Check if all services are running:

```bash
docker-compose ps
```

## 🔌 API Endpoints

### NestJS API Endpoints

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/photo/upload` | POST | multipart/form-data | Upload and trigger analysis |
| `/photo/search/faces` | POST | `embedding: number[]` | Find similar faces (vector search) |
| `/photo/search/scenes` | POST | `embedding: number[]` | Find matching images by scene |
| `/photo/list` | GET | - | List all analyzed photos |

### Example Upload API Request

```bash
curl -X POST http://localhost:3000/photo/upload \
  -F "file=@/path/to/photo.jpg"
```

## 📊 ML Engine Endpoints

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/analyze-face` | POST | `image_path: string` | Returns face embeddings (512-dim) |
| `/analyze-scene` | POST | `image_path: string` | Returns scene embeddings (384-dim) |

## ⚡ Optimization Tips

1. **Concurrency Control**: Set `concurrency: 1` in BullMQ worker config for CPU-only systems
2. **GPU Acceleration**: Use `onnxruntime-gpu` and set `providers=['CUDAExecutionProvider']` if you have NVIDIA GPUs
3. **Model Caching**: Pre-download InsightFace models (~300MB) manually before container startup
4. **Index Optimization**: Use pgvector's HNSW index for fast similarity searches
5. **Batch Processing**: Process photos in batches of 10-50 for better throughput
6. **Storage Separation**: Keep database (metadata/vectors) on SSD for fast searching, actual photos can remain on HDD

## 🛡️ Security Considerations

- [ ] **Database Credentials**: Store securely in `.env`, never commit to version control
- [ ] **File Paths**: Validate uploaded file paths before processing to prevent path traversal
- [ ] **ML Engine Access**: Use container network, not host networking for security
- [ ] **API Rate Limiting**: Implement request throttling on public endpoints
- [ ] **Data Privacy**: Since it's self-hosted, ensure Docker data volumes are properly backed up
- [ ] **Network Isolation**: Use reverse proxy (Nginx Proxy Manager) if accessing outside home network

## 🐛 Troubleshooting

### Issue: ML Engine Slow Response

```bash
# Solution: Check GPU availability
docker exec -it photo_ml_engine nvidia-smi

# If no GPU, switch to CPU execution provider in main.py:
providers=['CPUExecutionProvider']
```

### Issue: High Memory Usage

```bash
# Solution: Reduce concurrency in BullMQ configuration
concurrency: 1
```

### Issue: Container Can't Read Images

```bash
# Solution: Check volume permissions
chmod -R 777 storage/photos
```

### Issue: Vector Search Returns No Results

```bash
# Solution: Verify HNSW index was created
docker exec photo_db psql -U user -d photo_manager -c "\di"
```

## 📦 Deployment Checklist

- [ ] Set up PostgreSQL with `pgvector` extension enabled
- [ ] Configure Redis as message broker
- [ ] Pre-download InsightFace models to ML engine volumes
- [ ] Ensure Docker Compose networking is isolated
- [ ] Set appropriate CORS headers in NestJS API
- [ ] Configure proper log levels and monitoring
- [ ] Test end-to-end: Upload → Process → Search similarity
- [ ] Set up backups for database and photo storage

## 📚 Additional Resources

### InsightFace Documentation
- [Official GitHub Repository](https://github.com/deepinsight/insightface)
- [Model Zoo](https://github.com/deepinsight/insightface/tree/master/model_zoo)

### pgvector Documentation
- [pgvector Quickstart](https://github.com/pgvector/pgvector)
- [Vector Similarity Search](https://github.com/pgvector/pgvector#usage-in-postgresql)

### BullMQ Documentation
- [BullMQ GitHub](https://github.com/Oblivia/queue/tree/master/packages/bullmq)

### NestJS Official Docs
- [NestJS Documentation](https://docs.nestjs.com/)

## 🎉 Conclusion

This implementation gives you a production-ready, self-hosted photo management system with:

✅ **Face Recognition** - Detect and identify faces across your photo collection  
✅ **Scene Search** - Find images by semantic content ("show me all beach photos")  
✅ **Vector Similarity** - Fast similarity search using HNSW indexes  
✅ **Background Processing** - Non-blocking job queue for large batch processing  
✅ **Privacy-First** - All data stays on your local infrastructure  

Start with the Database Setup and work through each phase sequentially. Test each component before moving to the next!
