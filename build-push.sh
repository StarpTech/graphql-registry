#!/bin/bash
set -e

npm i
docker build -t graphql-registry .
docker image tag graphql-registry:latest starptech/graphql-registry:latest
docker push starptech/graphql-registry:latest