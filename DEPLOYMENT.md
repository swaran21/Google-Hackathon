# ResQNet Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Step 1: Set Up Google Cloud Project](#step-1-set-up-google-cloud-project)
- [Step 2: Install Required Tools](#step-2-install-required-tools)
- [Step 3: Configure Artifact Registry](#step-3-configure-artifact-registry)
- [Step 4: Update Kubernetes Manifests](#step-4-update-kubernetes-manifests)
- [Step 5: Build and Push Docker Images](#step-5-build-and-push-docker-images)
- [Step 6: Create GKE Cluster](#step-6-create-gke-cluster)
- [Step 7: Deploy to Kubernetes](#step-7-deploy-to-kubernetes)
- [Step 8: Configure DNS and SSL](#step-8-configure-dns-and-ssl)
- [Step 9: Verify Deployment](#step-9-verify-deployment)
- [Scaling Configuration](#scaling-configuration)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:
- Google Cloud account with billing enabled
- Domain name (optional, for SSL)
- MongoDB Atlas connection string (already have)
- Gemini API key

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    Google Cloud                      │
                    │                                                      │
   Users ──────────►│  ┌─────────────┐     ┌──────────────────────────┐   │
                    │  │   Cloud     │     │         GKE               │   │
                    │  │   Load      │────►│  ┌─────────────────────┐  │   │
                    │  │   Balancer  │     │  │  resqnet-frontend   │  │   │
                    │  └─────────────┘     │  │  (2-10 pods)        │  │   │
                    │                      │  └──────────┬──────────┘  │   │
                    │                      │             │             │   │
                    │                      │  ┌──────────▼──────────┐  │   │
                    │                      │  │  resqnet-backend    │  │   │
                    │                      │  │  (2-10 pods)        │  │   │
                    │                      │  └──────────┬──────────┘  │   │
                    │                      └─────────────│─────────────┘   │
                    │                                │                     │
                    │                                ▼                     │
                    │                      ┌─────────────────┐             │
                    │                      │   MongoDB Atlas │             │
                    │                      │   (Database)    │             │
                    │                      └─────────────────┘             │
                    └─────────────────────────────────────────────────────┘
```

---

## Step 1: Set Up Google Cloud Project

### 1.1 Create or Select Project

```bash
# Create new project
gcloud projects create resqnet-deployment --name="ResQNet"

# Set as default
gcloud config set project resqnet-deployment

# Set billing (replace BILLING_ACCOUNT with your billing account ID)
gcloud beta billing projects link resqnet-deployment --billing-account=BILLING_ACCOUNT
```

### 1.2 Enable Required APIs

```bash
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  servicenetworking.googleapis.com \
  dns.googleapis.com
```

---

## Step 2: Install Required Tools

### 2.1 Install Google Cloud SDK

```bash
# Download and install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init
```

### 2.2 Install kubectl

```bash
gcloud components install kubectl
```

### 2.3 Install Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add yourself to docker group
sudo usermod -aG docker $USER
```

---

## Step 3: Configure Artifact Registry

### 3.1 Create Artifact Registry Repository

```bash
# Replace REGION with your preferred region (e.g., us-central1, asia-south1)
REGION="us-central1"

gcloud artifact-registry repositories create resqnet \
  --repository-format=docker \
  --location=$REGION \
  --description="ResQNet Docker images"

# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 3.2 Repository URLs

Your images will be available at:
- Backend: `REGION-docker.pkg.dev/resqnet-deployment/resqnet/resqnet-backend`
- Frontend: `REGION-docker.pkg.dev/resqnet-deployment/resqnet/resqnet-frontend`

---

## Step 4: Update Kubernetes Manifests

### 4.1 Update Placeholders in Kubernetes Files

Edit `kubernetes/backend-deployment.yaml` and replace:
- `REGION` with your artifact registry region
- `PROJECT_ID` with your Google Cloud Project ID

### 4.2 Update Secrets

Edit `kubernetes/backend-secret.yaml` and replace:

```yaml
stringData:
  MONGODB_URI: "mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?appName=GoogleHackathon"
  JWT_SECRET: "YOUR_SUPER_SECURE_JWT_SECRET_AT_LEAST_32_CHARACTERS"
  GEMINI_API_KEY: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 4.3 Update Ingress

Edit `kubernetes/ingress.yaml` and replace:
- `YOUR_DOMAIN.com` with your actual domain name
- `resqnet-ip` with your preferred static IP name

---

## Step 5: Build and Push Docker Images

### 5.1 Navigate to Project Root

```bash
cd /path/to/Google-Hackathon
```

### 5.2 Build Backend Image

```bash
REGION="us-central1"
PROJECT_ID="resqnet-deployment"

cd server
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/resqnet/resqnet-backend:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/resqnet/resqnet-backend:latest
cd ..
```

### 5.3 Build Frontend Image

```bash
cd client
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/resqnet/resqnet-frontend:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/resqnet/resqnet-frontend:latest
cd ..
```

---

## Step 6: Create GKE Cluster

### 6.1 Create VPC Network (Recommended)

```bash
gcloud compute networks create resqnet-vpc \
  --subnet-mode=custom

gcloud compute networks subnets create resqnet-subnet \
  --network=resqnet-vpc \
  --region=us-central1 \
  --range=10.0.0.0/20
```

### 6.2 Create GKE Cluster

```bash
gcloud container clusters create resqnet-cluster \
  --region=us-central1 \
  --network=resqnet-vpc \
  --subnetwork=resqnet-subnet \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --enable-ip-alias \
  --num-nodes=2 \
  --machine-type=e2-standard-2 \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autoscaling
```

### 6.3 Get Cluster Credentials

```bash
gcloud container clusters get-credentials resqnet-cluster --region=us-central1
```

### 6.4 Create Static IP for Ingress

```bash
gcloud compute addresses create resqnet-ip --global

# Note the IP address for later DNS configuration
gcloud compute addresses describe resqnet-ip --global --format="get(address)"
```

---

## Step 7: Deploy to Kubernetes

### 7.1 Create Namespace

```bash
kubectl create namespace resqnet
```

### 7.2 Apply Kubernetes Manifests

```bash
kubectl apply -f kubernetes/backend-configmap.yaml
kubectl apply -f kubernetes/backend-secret.yaml
kubectl apply -f kubernetes/frontend-configmap.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/ingress.yaml
kubectl apply -f kubernetes/managed-certificate.yaml
kubectl apply -f kubernetes/hpa.yaml
```

### 7.3 Verify Deployment

```bash
# Check pods
kubectl get pods -n resqnet

# Check services
kubectl get services -n resqnet

# Check ingress
kubectl get ingress -n resqnet

# Check HPAs
kubectl get hpa -n resqnet
```

---

## Step 8: Configure DNS and SSL

### 8.1 Get Ingress IP

```bash
kubectl get ingress resqnet-ingress -n resqnet
```

### 8.2 Configure DNS

Create an A record in your DNS provider pointing to the ingress IP:
- Type: A
- Name: @ (or your subdomain)
- Value: YOUR_INGRESS_IP
- TTL: 300

### 8.3 SSL Certificate

The ManagedCertificate resource will automatically provision and manage SSL certificates once DNS is configured and propagating.

---

## Step 9: Verify Deployment

### 9.1 Check Pod Status

```bash
kubectl get pods -n resqnet -w
```

### 9.2 Check Logs

```bash
# Backend logs
kubectl logs -f deployment/resqnet-backend -n resqnet

# Frontend logs
kubectl logs -f deployment/resqnet-frontend -n resqnet
```

### 9.3 Test Health Endpoint

```bash
kubectl port-forward svc/backend-service 5000:5000 -n resqnet &
curl http://localhost:5000/api/health
```

### 9.4 Access Application

Open your browser and navigate to `https://YOUR_DOMAIN.com`

---

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

The deployment includes HPA configured to:
- **Backend**: Scale between 2-10 pods based on CPU (70%) and memory (80%)
- **Frontend**: Scale between 2-10 pods based on CPU (70%) and memory (80%)

### Manual Scaling

```bash
# Scale backend to 5 replicas
kubectl scale deployment resqnet-backend --replicas=5 -n resqnet

# Scale frontend to 3 replicas
kubectl scale deployment resqnet-frontend --replicas=3 -n resqnet
```

### Cluster Autoscaler

The GKE cluster is configured with autoscale from 2-10 nodes.

---

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod for details
kubectl describe pod <pod-name> -n resqnet

# Check events
kubectl get events -n resqnet --sort-by='.lastTimestamp'
```

### ImagePullBackOff Error

```bash
# Verify image exists
gcloud artifact-registry docker list ${REGION}-docker.pkg.dev/${PROJECT_ID}/resqnet

# Check secret for artifact registry
kubectl get secret -n resqnet
```

### Database Connection Issues

```bash
# Check if secret is correctly applied
kubectl get secret resqnet-secrets -n resqnet -o yaml

# Verify MONGODB_URI in secret
kubectl describe secret resqnet-secrets -n resqnet
```

### SSL Certificate Not Provisioning

1. Verify DNS is pointing to correct IP
2. Check ManagedCertificate status:
   ```bash
   kubectl describe managedcertificate resqnet-cert -n resqnet
   ```
3. SSL certs can take up to 15-30 minutes to provision

### Ingress 404 Errors

Check that the ingress annotations are correct and services are properly labeled.

---

## Environment Variables Summary

### Backend Variables

| Variable | Type | Description | Where to Set |
|----------|------|-------------|--------------|
| PORT | ConfigMap | Server port (5000) | kubernetes/backend-configmap.yaml |
| NODE_ENV | ConfigMap | Environment (production) | kubernetes/backend-configmap.yaml |
| CLIENT_URL | ConfigMap | Frontend URL | kubernetes/backend-configmap.yaml |
| JWT_EXPIRE | ConfigMap | Token expiry (7d) | kubernetes/backend-configmap.yaml |
| RATE_LIMIT_WINDOW_MS | ConfigMap | Rate limit window | kubernetes/backend-configmap.yaml |
| RATE_LIMIT_MAX | ConfigMap | Max requests per window | kubernetes/backend-configmap.yaml |
| MONGODB_URI | Secret | MongoDB Atlas connection string | kubernetes/backend-secret.yaml |
| JWT_SECRET | Secret | JWT signing secret | kubernetes/backend-secret.yaml |
| GEMINI_API_KEY | Secret | Google Gemini API key | kubernetes/backend-secret.yaml |

### Frontend Variables

| Variable | Type | Description | Where to Set |
|----------|------|-------------|--------------|
| VITE_API_URL | ConfigMap | API base URL (/api) | kubernetes/frontend-configmap.yaml |
| VITE_SOCKET_URL | ConfigMap | Socket.io URL (/socket.io) | kubernetes/frontend-configmap.yaml |

---

## Useful Commands

```bash
# View all resources in namespace
kubectl get all -n resqnet

# Delete everything
kubectl delete -f kubernetes/ -n resqnet

# Rollback deployment
kubectl rollout undo deployment/resqnet-backend -n resqnet

# Check resource usage
kubectl top pods -n resqnet
kubectl top nodes

# Exec into pod
kubectl exec -it <pod-name> -n resqnet -- /bin/sh

# Port forward for testing
kubectl port-forward svc/backend-service 5000:5000 -n resqnet
```

---

## Security Best Practices

1. **Secrets Management**: Use Google Secret Manager for production secrets
2. **Network Policies**: Implement Kubernetes NetworkPolicies to restrict traffic
3. **RBAC**: Use service accounts with minimal permissions
4. **Container Security**: Run containers as non-root user
5. **Regular Updates**: Keep base images and dependencies updated

---

## Monitoring and Logging

### Cloud Monitoring

```bash
# Install Cloud Operations for GKE
gcloud container clusters update resqnet-cluster \
  --region=us-central1 \
  --enable-logging \
  --enable-monitoring
```

### View Logs in Cloud Logging

```bash
gcloud logging read "resource.type=k8s_container" --project=resqnet-deployment
```

---

## Cost Optimization Tips

1. Use preemptible VMs for non-critical workloads
2. Set appropriate HPA limits to avoid over-scaling
3. Use regional GKE clusters for high availability
4. Monitor and delete unused resources
5. Consider using Cloud Run for lighter workloads