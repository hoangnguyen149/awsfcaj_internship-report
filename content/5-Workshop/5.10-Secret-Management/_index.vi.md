---
title: "Monitoring"
date: 2026-07-13
weight: 10
chapter: false
pre: " <b> 5.10 </b> "
---

#### Giới thiệu

Chương này thiết lập giám sát toàn diện hiệu suất và log của hệ thống bằng Amazon CloudWatch, kết hợp Amazon SNS để phát cảnh báo tự động đến đội vận hành khi có sự cố hoặc chỉ số vượt ngưỡng.

#### Mục tiêu

- Cài đặt CloudWatch Agent trên EC2 để thu thập log và metric chi tiết (memory, disk - vốn không có sẵn mặc định).
- Tạo CloudWatch Dashboard tổng hợp các chỉ số quan trọng.
- Tạo CloudWatch Alarm cho ALB, EC2 ASG, RDS.
- Tạo SNS Topic và subscription email để nhận cảnh báo.

#### Kiến thức đạt được

- Hiểu sự khác biệt giữa metric mặc định (CPU, Network) và metric custom (Memory, Disk) cần CloudWatch Agent.
- Hiểu cách CloudWatch Alarm chuyển trạng thái `OK -> ALARM` và kích hoạt hành động qua SNS.
- Hiểu cách tổ chức Log Group theo từng thành phần hệ thống để dễ truy vấn bằng CloudWatch Logs Insights.

#### Kiến trúc sử dụng

```
EC2 (CloudWatch Agent) ──┐
ALB ──────────────────────┤
RDS ──────────────────────┼──► Amazon CloudWatch (Metrics, Logs, Alarms, Dashboard)
Lambda ────────────────────┤                              │
DynamoDB ──────────────────┘                              ▼
                                                   Amazon SNS Topic
                                                            │
                                                            ▼
                                                  Email / SMS đến đội vận hành
```

**Hình minh họa**

`[Placeholder: cloudwatch-dashboard.png - Dashboard tổng hợp CPU/Memory/RDS Connections/ALB Latency]`

#### Các bước thực hiện

**Bước 1 - Tạo SNS Topic**

```bash
aws sns create-topic --name officems-alerts

aws sns subscribe \
  --topic-arn <sns-topic-arn> \
  --protocol email \
  --notification-endpoint ops-team@example.com
```

Xác nhận subscription qua email được gửi đến.

**Bước 2 - Cài đặt CloudWatch Agent trên EC2**

Thêm vào script `user-data.sh` (hoặc cài thủ công qua Session Manager):

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
{
  "metrics": {
    "namespace": "OfficeMS/EC2",
    "metrics_collected": {
      "mem": {"measurement": ["mem_used_percent"]},
      "disk": {"measurement": ["used_percent"], "resources": ["/"]}
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [{
          "file_path": "/home/ubuntu/officems-backend/logs/app.log",
          "log_group_name": "/officems/backend",
          "log_stream_name": "{instance_id}"
        }]
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**Bước 3 - Tạo CloudWatch Alarm**

Alarm CPU cao trên Auto Scaling Group:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-high-cpu \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=officems-asg-backend \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

Alarm cho ALB - target unhealthy:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-alb-unhealthy-targets \
  --namespace AWS/ApplicationELB \
  --metric-name UnHealthyHostCount \
  --dimensions Name=TargetGroup,Value=<tg-arn-suffix> Name=LoadBalancer,Value=<alb-arn-suffix> \
  --statistic Average \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

Alarm cho RDS - CPU và Storage:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-rds-high-cpu \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=officems-mysql \
  --statistic Average \
  --period 300 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions <sns-topic-arn>

aws cloudwatch put-metric-alarm \
  --alarm-name officems-rds-low-storage \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=officems-mysql \
  --statistic Average \
  --period 300 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>
```

**Bước 4 - Tạo CloudWatch Dashboard**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name officems-overview \
  --dashboard-body '{
    "widgets": [
      {"type":"metric","properties":{"title":"EC2 CPU","metrics":[["AWS/EC2","CPUUtilization","AutoScalingGroupName","officems-asg-backend"]]}},
      {"type":"metric","properties":{"title":"ALB Request Count","metrics":[["AWS/ApplicationELB","RequestCount"]]}},
      {"type":"metric","properties":{"title":"RDS CPU","metrics":[["AWS/RDS","CPUUtilization","DBInstanceIdentifier","officems-mysql"]]}},
      {"type":"metric","properties":{"title":"Lambda Errors","metrics":[["AWS/Lambda","Errors","FunctionName","officems-payments-fn"]]}}
    ]
  }'
```

**Hình minh họa**

`[Placeholder: sns-alert-email.png - Email cảnh báo nhận được khi Alarm chuyển trạng thái ALARM]`

#### Kiểm tra kết quả

```bash
aws cloudwatch describe-alarms --alarm-names officems-high-cpu \
  --query 'MetricAlarms[0].StateValue'
```

Kết quả mong đợi: `OK` (khi hệ thống hoạt động bình thường).

Thử tạo tải giả lập bằng công cụ `stress` trên một EC2 instance để kiểm tra Alarm có chuyển sang `ALARM` và gửi email qua SNS hay không.

#### Best Practices

- Đặt `evaluation-periods` hợp lý (2-3 chu kỳ liên tiếp) để tránh cảnh báo giả (false positive) do tăng tải tức thời.
- Nhóm log theo Log Group riêng cho từng thành phần (`/officems/backend`, `/officems/lambda-payments`...) để dễ truy vấn.
- Sử dụng CloudWatch Logs Insights để phân tích lỗi theo pattern thay vì đọc log thủ công.
- Thiết lập Composite Alarm khi cần kết hợp nhiều điều kiện (ví dụ CPU cao VÀ Latency cao) trước khi cảnh báo.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không nhận được email cảnh báo | Chưa xác nhận (Confirm) subscription SNS | Kiểm tra lại email xác nhận subscription |
| CloudWatch Agent không gửi metric Memory/Disk | Agent chưa cài đúng hoặc thiếu quyền IAM | Kiểm tra `CloudWatchAgentServerPolicy` đã gắn vào `officems-ec2-role` |
| Alarm luôn ở trạng thái `INSUFFICIENT_DATA` | Chưa có đủ dữ liệu metric trong khoảng thời gian đánh giá | Chờ thêm chu kỳ thu thập hoặc kiểm tra Agent đang chạy |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.11 - CI/CD](../5.11-CICD/) để xây dựng pipeline triển khai tự động.
