# Deployment Guide for EC2 (Ubuntu)

This guide assumes you have an EC2 instance running Ubuntu and have SSH access to it.

## 1. Prepare your EC2 Instance

1.  **SSH into your instance:**
    ```bash
    ssh -i "your-key.pem" ubuntu@<your-ec2-public-ip>
    ```

2.  **Copy the setup script and run it:**
    You can copy the `setup_ec2.sh` content manually or upload it.
    
    ```bash
    # On your EC2
    nano setup_ec2.sh
    # Paste the content of setup_ec2.sh here, save (Ctrl+O) and exit (Ctrl+X)
    
    chmod +x setup_ec2.sh
    ./setup_ec2.sh
    ```
    
    > **Important:** After running the script, verify docker works: `docker run hello-world`. If you get a permission error, run `newgrp docker` or logout and login again.

## 2. Deploy Code

WARNING: Since this is a simple deployment, we will copy the `backend` code and `deploy` folder to the server. For a proper CI/CD, you would build the image and push to Docker Hub, then pull on EC2. Here we build *on* the EC2 for simplicity.

### Option A: Using SCP (Copy files from your local machine)

From your local machine (Windows PowerShell or Git Bash):

```bash
# Copy backend folder
scp -i "path/to/key.pem" -r "d:\Capstone Project\School Management\backend" ubuntu@<ec2-ip>:~/backend

# Copy deploy folder
scp -i "path/to/key.pem" -r "d:\Capstone Project\School Management\deploy" ubuntu@<ec2-ip>:~/deploy
```

### Option B: Git Clone (If your repo is on GitHub/GitLab)

```bash
# On EC2
git clone <your-repo-url> app
cd app
```

## 3. Start the Application

1.  Navigate to the directory containing `docker-compose.prod.yml` (or where you put it). if you used SCP above:
    ```bash
    cd ~/deploy
    ```

2.  Run Docker Compose:
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

3.  Check status:
    ```bash
    docker compose -f docker-compose.prod.yml ps
    docker compose -f docker-compose.prod.yml logs -f backend
    ```

## 4. Access the Application

-   Ensure your EC2 Security Group allows Inbound traffic on port **8081** (Custom TCP).
-   Access via browser or Postman: `http://<ec2-public-ip>:8081`

## Troubleshooting

-   **Database Connection:** If backend fails to connect to DB, check the logs. Ensure `SPRING_DATASOURCE_URL` in `docker-compose.prod.yml` matches the service name `postgres`.
-   **Ports:** Make sure port 8081 isn't blocked by firewall (ufw) on Ubuntu itself (rare for AWS default images, but possible).
