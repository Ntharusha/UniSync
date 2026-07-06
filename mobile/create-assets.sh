#!/bin/bash
mkdir -p "assets"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" | base64 -d > "assets/icon.png"
cp "assets/icon.png" "assets/splash-icon.png"
cp "assets/icon.png" "assets/adaptive-icon.png"
cp "assets/icon.png" "assets/favicon.png"
cp "assets/icon.png" "assets/notification-icon.png"
echo "Assets generated successfully!"
