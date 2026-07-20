---
title: "Deploy Backend"
date: 2026-07-13
weight: 6
chapter: false
pre: " <b> 5.6 </b> "
---

#### Introduction

This chapter deploys the application tier: the Backend API, written in Node.js/Express and run with PM2 on `t3.small` EC2 instances, placed in a Private Subnet, managed with automatic scaling by an Auto Scaling Group, and receiving traffic through an Application Load Balancer.

#### Objectives

- Create a Launch Template containing the AMI, a script that installs Node.js/PM2, and the Backend source code.
- Create an Application Load Balancer (ALB) in the Public Subnet.
- Create a Target Group and attach a Health Check.
- Create an Auto Scaling Group spanning 2 Private Subnets (2 AZs), and configure a scaling policy.

#### Knowledge Gained

- Understand how a Launch Template + Auto Scaling Group automatically replaces failed instances and scales with load.
- Understand how the ALB Health Check removes unresponsive instances from the Target Group.
- Understand how PM2 keeps the Node.js application running in the background and restarts it automatically on failure.

#### Architecture

```
Internet ── CloudFront (API path, optional) ── Route 53 (api.officems.example.com)
                                                        │
                                                        ▼
                                    Application Load Balancer (Public Subnet, 2 AZ)
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                        EC2 (Private Subnet AZ-1, PM2)          EC2 (Private Subnet AZ-2, PM2)
                                    └───────────── Auto Scaling Group ───────────┘
```

**Illustration**

`[Placeholder: backend-asg-alb.png - Diagram of ALB + Auto Scaling Group across 2 AZs]`
{{< figure src="/images/5-Workshop/5.6-Cleanup/backend-asg-alb.png" title="Backend ALB and Auto Scaling Group" >}}


#### Steps

**Step 1 - Prepare the User Data script**

Create a `user-data.sh` file that installs Node.js, PM2, and pulls the Backend source code:

```bash
#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2

cd /home/ubuntu
git clone https://github.com/<your-org>/officems-backend.git
cd officems-backend
npm install --production

# Fetch sensitive environment variables from Secrets Manager (details in Chapter 5.9)
export DB_SECRET=$(aws secretsmanager get-secret-value --secret-id officems/rds --query SecretString --output text --region ap-southeast-1)

pm2 start ecosystem.config.js --env production
pm2 startup systemd
pm2 save
```

**Step 2 - Create the Launch Template**

```bash
aws ec2 create-launch-template \
  --launch-template-name officems-lt-backend \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",
    "InstanceType": "t3.small",
    "KeyName": "officems-keypair",
    "SecurityGroupIds": ["<sg-backend-id>"],
    "IamInstanceProfile": {"Name": "officems-ec2-profile"},
    "UserData": "'"$(base64 -w0 user-data.sh)"'",
    "TagSpecifications": [{"ResourceType": "instance", "Tags": [{"Key": "Name", "Value": "officems-backend"}]}]
  }'
```

{{% notice note %}}
Replace `ami-0abcdef1234567890` with the latest Ubuntu 22.04 LTS AMI for `ap-southeast-1`, which you can look up with `aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"`.
{{% /notice %}}

**Step 3 - Create the Application Load Balancer and Target Group**

```bash
aws elbv2 create-load-balancer \
  --name officems-alb \
  --subnets <public-subnet-1a-id> <public-subnet-1b-id> \
  --security-groups <sg-alb-id> \
  --scheme internet-facing --type application

aws elbv2 create-target-group \
  --name officems-tg-backend \
  --protocol HTTP --port 3000 \
  --vpc-id <vpc-id> \
  --health-check-path /health \
  --health-check-interval-seconds 15 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --target-type instance
```

Create an HTTPS Listener (using the regional ACM certificate created in Chapter 5.4):

```bash
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<acm-regional-cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

**Step 4 - Create the Auto Scaling Group**

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name officems-asg-backend \
  --launch-template LaunchTemplateName=officems-lt-backend,Version='$Latest' \
  --min-size 2 --max-size 4 --desired-capacity 2 \
  --vpc-zone-identifier "<private-subnet-1a-id>,<private-subnet-1b-id>" \
  --target-group-arns <tg-arn> \
  --health-check-type ELB \
  --health-check-grace-period 120
```

Configure a Target Tracking Scaling Policy based on CPU Utilization:

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name officems-asg-backend \
  --policy-name officems-cpu-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {"PredefinedMetricType": "ASGAverageCPUUtilization"},
    "TargetValue": 60.0
  }'
```

**Illustration**

`[Placeholder: asg-scaling-policy.png - Auto Scaling Group with a Target Tracking Policy]`

#### Verify the Result

```bash
aws elbv2 describe-target-health --target-group-arn <tg-arn>
```

Expected result: both targets (one per AZ) show `TargetHealth.State = healthy`.

```bash
curl -I https://api.officems.example.com/health
```

Expected result: HTTP 200 returned from the Backend's health check endpoint.

#### Best Practices

- Set `health-check-grace-period` long enough for the instance to finish starting the application before being marked unhealthy.
- Spread the Auto Scaling Group across at least 2 AZs to ensure availability if one AZ has an outage.
- Use a Launch Template instead of the deprecated Launch Configuration, to take advantage of newer features like instance versioning.
- Use a dedicated `/health` endpoint that doesn't depend on the database, so the Health Check reflects the actual state of the Node.js process.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| The Target Group reports `unhealthy` | The Security Group hasn't opened port 3000 from the ALB, or the app hasn't started yet | Connect via Session Manager and check `pm2 status` and `pm2 logs` |
| The Auto Scaling Group can't launch new instances | The Launch Template has a UserData syntax error or is missing the IAM Instance Profile | Check the Activity History in the ASG Console |
| The ALB returns 502 Bad Gateway | The Backend isn't listening on the correct port, or the PM2 process has crashed | Check `pm2 logs` and confirm `ecosystem.config.js` uses port 3000 |

#### Next Step

Continue to [Chapter 5.7 - Deploy Database](../5.7-Database/) to deploy RDS Multi-AZ, ElastiCache Redis, and DynamoDB.
