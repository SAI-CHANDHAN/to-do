#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="ap-south-1"
CLUSTER_NAME="todo-eks"
NODEGROUP_NAME="todo-ng"
INSTANCE_TYPE="t3.medium"
NODES_MIN=2
NODES_MAX=5
NODES_DESIRED=2
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_FRONTEND="todo-frontend"
ECR_BACKEND="todo-backend"

eksctl create cluster \
  --name "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --nodes "${NODES_DESIRED}" \
  --nodes-min "${NODES_MIN}" \
  --nodes-max "${NODES_MAX}" \
  --node-type "${INSTANCE_TYPE}" \
  --managed

aws eks update-kubeconfig --name "${CLUSTER_NAME}" --region "${AWS_REGION}"

aws ecr create-repository --repository-name "${ECR_FRONTEND}" --region "${AWS_REGION}" >/dev/null 2>&1 || true
aws ecr create-repository --repository-name "${ECR_BACKEND}" --region "${AWS_REGION}" >/dev/null 2>&1 || true

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "${ECR_FRONTEND}:latest" ./client
docker tag "${ECR_FRONTEND}:latest" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}:latest"
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}:latest"

docker build -t "${ECR_BACKEND}:latest" ./server
docker tag "${ECR_BACKEND}:latest" "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:latest"
docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}:latest"

kubectl apply -k ./infra/k8s

kubectl -n ingress-nginx get svc
kubectl -n todo-app get pods,svc,ingress,hpa,pvc
