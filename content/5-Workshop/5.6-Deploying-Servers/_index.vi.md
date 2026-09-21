---
title: "Deploy Backend"
date: 2026-07-13
weight: 6
chapter: false
pre: " <b> 5.6 </b> "
---

#### Giới thiệu

Chương này triển khai tầng ứng dụng Backend, gồm Backend API viết bằng Node.js/Express chạy bằng PM2 trên các instance EC2 loại `t3.small`, đặt trong Private Subnet, được quản lý tự động mở rộng/thu hẹp bởi Auto Scaling Group, và tiếp nhận lưu lượng qua Application Load Balancer.

#### Mục tiêu

- Tạo Launch Template chứa AMI, script cài đặt Node.js/PM2 và mã nguồn Backend.
- Tạo Application Load Balancer (ALB) tại Public Subnet.
- Tạo Target Group và gắn Health Check.
- Tạo Auto Scaling Group trải trên 2 Private Subnet (2 AZ), cấu hình scaling policy.

#### Kiến thức đạt được

- Hiểu cách Launch Template + Auto Scaling Group giúp tự động thay thế instance lỗi và mở rộng theo tải.
- Hiểu cách ALB Health Check loại bỏ instance không phản hồi khỏi Target Group.
- Hiểu cách PM2 giữ ứng dụng Node.js chạy nền và tự khởi động lại khi lỗi.

#### Kiến trúc sử dụng

```
Internet ── CloudFront (API path, tuỳ chọn) ── Route 53 (api.officems.example.com)
                                                        │
                                                        ▼
                                    Application Load Balancer (Public Subnet, 2 AZ)
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                        EC2 (Private Subnet AZ-1, PM2)          EC2 (Private Subnet AZ-2, PM2)
                                    └───────────── Auto Scaling Group ───────────┘
```

**Hình minh họa**

`[Placeholder: backend-asg-alb.png - Sơ đồ ALB + Auto Scaling Group 2 AZ]`
{{< figure src="/images/5-Workshop/5.6-Cleanup/backend-asg-alb.png" title="Backend ALB and Auto Scaling Group" >}}

#### Các bước thực hiện

**Bước 1 - Chuẩn bị User Data script**

Tạo file `user-data.sh` cài đặt Node.js, PM2 và pull mã nguồn Backend:

```bash
#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2

cd /home/ubuntu
git clone https://github.com/<your-org>/officems-backend.git
cd officems-backend
npm install --production

# Lấy biến môi trường nhạy cảm từ Secrets Manager (chi tiết ở Chương 5.9)
export DB_SECRET=$(aws secretsmanager get-secret-value --secret-id officems/rds --query SecretString --output text --region ap-southeast-1)

pm2 start ecosystem.config.js --env production
pm2 startup systemd
pm2 save
```

**Bước 2 - Tạo Launch Template**

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
Thay `ami-0abcdef1234567890` bằng AMI Ubuntu 22.04 LTS mới nhất cho `ap-southeast-1`, tra cứu qua `aws ec2 describe-images --owners 099720109477 --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"`.
{{% /notice %}}

**Bước 3 - Tạo Application Load Balancer và Target Group**

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

Tạo Listener HTTPS (dùng chứng chỉ ACM regional đã tạo ở Chương 5.4):

```bash
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<acm-regional-cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

**Bước 4 - Tạo Auto Scaling Group**

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

Cấu hình Target Tracking Scaling Policy dựa trên CPU Utilization:

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

**Hình minh họa**

`[Placeholder: asg-scaling-policy.png - Auto Scaling Group với Target Tracking Policy]`

#### Kiểm tra kết quả

```bash
aws elbv2 describe-target-health --target-group-arn <tg-arn>
```

Kết quả mong đợi: cả 2 target (mỗi target ở một AZ) đều có `TargetHealth.State = healthy`.

```bash
curl -I https://api.officems.example.com/health
```

Kết quả mong đợi: HTTP 200 trả về từ endpoint health check của Backend.

#### Best Practices

- Đặt `health-check-grace-period` đủ dài để instance có thời gian khởi động ứng dụng trước khi bị đánh dấu unhealthy.
- Trải Auto Scaling Group trên tối thiểu 2 AZ để đảm bảo tính sẵn sàng khi một AZ gặp sự cố.
- Sử dụng Launch Template thay vì Launch Configuration (đã deprecated) để tận dụng các tính năng mới như Instance versioning.
- Tách endpoint `/health` riêng, không phụ thuộc vào database, để Health Check phản ánh đúng trạng thái tiến trình Node.js.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Target Group báo `unhealthy` | Security Group chưa mở port 3000 từ ALB, hoặc ứng dụng chưa start | SSH qua Session Manager kiểm tra `pm2 status` và log `pm2 logs` |
| Auto Scaling Group không launch được instance mới | Launch Template lỗi cú pháp UserData hoặc thiếu IAM Instance Profile | Kiểm tra Activity History trong ASG Console |
| ALB trả về 502 Bad Gateway | Backend chưa lắng nghe đúng port hoặc PM2 process bị crash | Kiểm tra `pm2 logs`, xác nhận `ecosystem.config.js` đúng port 3000 |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.7 - Deploy Database](../5.7-Deploying-Server-Support/) để triển khai RDS Multi-AZ, ElastiCache Redis và DynamoDB.
