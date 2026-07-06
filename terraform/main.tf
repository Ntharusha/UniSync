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

# EC2 Instance
resource "aws_instance" "unisync_backend" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS AMI in us-east-1 (amd64)
  instance_type = "t3.micro"
  key_name      = "unisync-key" # Make sure to create this key pair in AWS Console

  vpc_security_group_ids = [aws_security_group.unisync_sg.id]

  # Simple bash script to install Docker & node/npm on startup
  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update -y
              sudo apt-get install -y nodejs npm git
              # Run backend daemon setup here if needed
              EOF

  tags = {
    Name = "UniSync-Backend-Server"
  }
}

# Output the Public IP
output "backend_public_ip" {
  value       = aws_instance.unisync_backend.public_ip
  description = "The public IP address of the EC2 backend instance"
}
