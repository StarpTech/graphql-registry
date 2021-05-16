#!/usr/bin/env bash

docker build -t graphql-registry:latest .
docker push starptech/graphql-registry:latest