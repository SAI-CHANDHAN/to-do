MERN To-Do on AWS EKS (ap-south-1)

1) Prerequisites
- aws cli configured with an IAM user/role that can manage EKS, EC2, IAM, ECR
- kubectl, eksctl, docker, helm installed

2) Create EKS cluster
- eksctl create cluster --name todo-eks --region ap-south-1 --managed --node-type t3.medium --nodes 2 --nodes-min 2 --nodes-max 5
- aws eks update-kubeconfig --name todo-eks --region ap-south-1

3) Enable EBS CSI (for gp3 PVC dynamic provisioning)
- eksctl utils associate-iam-oidc-provider --region ap-south-1 --cluster todo-eks --approve
- eksctl create addon --name aws-ebs-csi-driver --cluster todo-eks --region ap-south-1 --force

4) Install NGINX Ingress Controller
- helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
- helm repo update
- kubectl create namespace ingress-nginx || true
- helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --set controller.replicaCount=2 --set controller.service.type=LoadBalancer

5) Create ECR repositories and push images
- aws ecr create-repository --repository-name todo-frontend --region ap-south-1 || true
- aws ecr create-repository --repository-name todo-backend --region ap-south-1 || true
- AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
- aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com
- docker build -t todo-frontend:latest ./client
- docker tag todo-frontend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/todo-frontend:latest
- docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/todo-frontend:latest
- docker build -t todo-backend:latest ./server
- docker tag todo-backend:latest ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/todo-backend:latest
- docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/todo-backend:latest

6) Update Kubernetes manifests
- Replace <AWS_ACCOUNT_ID> in infra/k8s/backend.yaml and infra/k8s/frontend.yaml
- Replace todo.example.com in infra/k8s/ingress.yaml and infra/k8s/configmap.yaml
- Fill real secret values in infra/k8s/secret.yaml

7) Deploy to EKS
- kubectl apply -k infra/k8s

8) Verify
- kubectl -n todo-app get pods
- kubectl -n todo-app get svc
- kubectl -n todo-app get ingress
- kubectl -n todo-app get hpa
- kubectl -n todo-app get pvc
- kubectl -n ingress-nginx get svc

9) Local optional smoke test
- docker compose up --build -d
