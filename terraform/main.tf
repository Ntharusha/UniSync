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