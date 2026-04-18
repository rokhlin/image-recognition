#!/bin/bash

# Pre-download InsightFace models
echo "Downloading InsightFace models..."

cd ml-engine

if [ ! -d "models" ]; then
    mkdir -p models
fi

# Download buffalo_l model (standard face recognition)
wget -O models/buffalo_l.tar \
    https://github.com/deepinsight/insightface/releases/download/v0.7.3/buffalo_l.tar

if [ $? -eq 0 ]; then
    echo "Model downloaded successfully!"
    
    # Extract and move to correct location
    tar -xzf models/buffalo_l.tar -C models/
    
    if [ $? -eq 0 ]; then
        # Move extracted files to insightface models directory
        mv models/models/* /root/.insightface/models/ 2>/dev/null || true
        
        echo "Models installed successfully!"
        ls -la /root/.insightface/models/
    else
        echo "Failed to extract model"
    fi
else
    echo "Failed to download model"
fi
