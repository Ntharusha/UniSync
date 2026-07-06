provider "aws" {
  region = "us-east-1"
}

# Security Group to allow SSH and API access
resource "aws_security_group" "unisync_sg" {
  name        = "unisync-backend-sg"
  description = "Allow SSH and Backend API traffic"

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend Express Port
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "unisync-security-group"
  }
}

# Append this to your existing terraform file

# EC2 Instance
resource "aws_instance" "unisync_backend" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS AMI in us-east-1 (amd64)
  instance_type = "t3.micro"
  key_name      = "unisync" # Make sure to create this key pair in AWS Console

  vpc_security_group_ids = [aws_security_group.unisync_sg.id]

  # Shell script to install Docker & configure permissions on startup
  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update -y
              sudo apt-get install -y ca-certificates curl gnupg lsb-release git

              # Install Docker
              sudo mkdir -p /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
              sudo apt-get update -y
              sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

              # Configure docker permissions for ubuntu user
              sudo usermod -aG docker ubuntu
              EOF

  tags = {
    Name = "UniSync-Backend-Server"
  }
}

# Append this to the bottom of your terraform file

# Output the Public IP
output "backend_public_ip" {
  value       = aws_instance.unisync_backend.public_ip
  description = "The public IP address of the EC2 backend instance"
}