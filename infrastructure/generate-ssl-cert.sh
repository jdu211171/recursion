#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "Self-signed SSL certificate generated in ssl/ directory"
echo "cert.pem - Certificate file"
echo "key.pem - Private key file"