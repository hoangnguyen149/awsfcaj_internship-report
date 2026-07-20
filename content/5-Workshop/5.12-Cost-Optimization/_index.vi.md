---
title: "Cost Optimization"
date: 2026-07-13
weight: 12
chapter: false
pre: " <b> 5.12 </b> "
---

#### Giới thiệu

Chương này áp dụng các biện pháp tối ưu chi phí vận hành cho hệ thống mà không thay đổi kiến trúc gốc, gồm thiết lập AWS Budgets và Cost Explorer để theo dõi chi tiêu, áp dụng Savings Plans cho tài nguyên chạy ổn định, bật S3 Intelligent-Tiering cho dữ liệu lưu trữ, và tạo VPC Endpoints để loại bỏ phí xử lý dữ liệu qua NAT Gateway khi truy cập S3/DynamoDB.

#### Mục tiêu

- Ước tính và so sánh chi phí vận hành hàng tháng theo từng thành phần.
- Thiết lập AWS Budgets cảnh báo khi chi phí vượt ngưỡng.
- Bật Cost Explorer và phân tích chi phí theo dịch vụ/tag.
- Mua Savings Plans cho EC2 chạy ổn định.
- Bật S3 Intelligent-Tiering cho bucket lưu tài liệu.
- Tạo Gateway VPC Endpoint cho S3/DynamoDB và Interface VPC Endpoint cho Secrets Manager, giảm chi phí NAT Gateway data processing.

#### Kiến thức đạt được

- Hiểu cơ cấu chi phí của từng dịch vụ AWS trong kiến trúc hệ thống.
- Hiểu sự khác biệt giữa Gateway VPC Endpoint (miễn phí, dùng Route Table) và Interface VPC Endpoint (tính phí theo giờ + data processing, dùng ENI).
- Hiểu cách Savings Plans giảm chi phí EC2/Lambda so với On-Demand.

#### Kiến trúc sử dụng

Ước tính ngân sách hàng tháng tại `ap-southeast-1`, với lưu lượng khoảng 1.000 người dùng/ngày:

| Thành phần | Chi phí ước tính/tháng |
|---|---|
| EC2 Auto Scaling Group (2-4 x t3.small) | ~$30 - $60 |
| RDS db.t3.small Multi-AZ | ~$50 - $80 |
| ElastiCache cache.t3.micro | ~$15 - $25 |
| NAT Gateway (2 cái) | ~$60 - $70 |
| ALB + Băng thông + CloudFront | ~$20 - $50 |
| S3 / Lambda / API Gateway / DynamoDB / SES | ~$10 - $30 |
| **Tổng cộng** | **~$200 - $400/tháng** |

Ba tài nguyên tốn kém nhất: **NAT Gateway**, **RDS Multi-AZ**, và **phí truyền tải băng thông (Data Transfer)**.

**Hình minh họa**

`[Placeholder: cost-breakdown.png - Biểu đồ phân bổ chi phí theo dịch vụ]`
{{< figure src="/images/5-Workshop/5.12-Cost Optimization/cost-breakdown.png" title="Monthly cost breakdown" >}}`

#### Các bước thực hiện

**Bước 1 - Thiết lập AWS Budgets**

```bash
aws budgets create-budget \
  --account-id <account-id> \
  --budget '{
    "BudgetName": "officems-monthly-budget",
    "BudgetLimit": {"Amount": "400", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 80},
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops-team@example.com"}]
  }]'
```

**Bước 2 - Bật Cost Explorer và gắn Tag phân bổ chi phí**

```bash
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active TagKey=Environment,Status=Active
```

Đảm bảo mọi tài nguyên trong hệ thống đều có tag `Project=OfficeMS` và `Environment=Production` để Cost Explorer có thể lọc chi phí chính xác theo dự án.

**Bước 3 - Mua Savings Plans cho EC2**

```bash
aws savingsplans describe-savings-plans-offerings \
  --plan-types Compute \
  --payment-options No Upfront \
  --durations 31536000
```

Sau khi xác định offering phù hợp với baseline sử dụng (dựa trên usage 30 ngày gần nhất từ Cost Explorer), tiến hành mua qua Console **Savings Plans**, chọn Compute Savings Plans với cam kết 1 năm để linh hoạt áp dụng cho cả EC2 lẫn Lambda/Fargate nếu mở rộng sau này.

**Bước 4 - Bật S3 Intelligent-Tiering**

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket officems-documents-<unique-suffix> \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "officems-intelligent-tiering",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [{"Days": 0, "StorageClass": "INTELLIGENT_TIERING"}]
    }]
  }'
```

S3 Intelligent-Tiering tự động di chuyển object giữa các tầng truy cập (Frequent, Infrequent, Archive Instant Access) dựa trên pattern truy cập thực tế, phù hợp với dữ liệu hợp đồng/hình ảnh văn phòng có tần suất truy cập không đồng đều.

**Bước 5 - Tạo Gateway VPC Endpoint cho S3 và DynamoDB**

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.s3 \
  --route-table-ids <rt-private-1a-id> <rt-private-1b-id> \
  --vpc-endpoint-type Gateway

aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.dynamodb \
  --route-table-ids <rt-private-1a-id> <rt-private-1b-id> \
  --vpc-endpoint-type Gateway
```

Gateway VPC Endpoint không tính phí theo giờ và không tính phí data processing, hoạt động bằng cách thêm route vào Route Table của Private Subnet để traffic đến S3/DynamoDB đi qua mạng nội bộ AWS thay vì qua NAT Gateway.

**Bước 6 - Tạo Interface VPC Endpoint cho Secrets Manager**

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.secretsmanager \
  --vpc-endpoint-type Interface \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id> \
  --security-group-ids <sg-backend-id> \
  --private-dns-enabled
```

{{% notice note %}}
Interface VPC Endpoint tính phí theo giờ hoạt động và theo GB dữ liệu xử lý, nhưng vẫn thường rẻ hơn đáng kể so với việc để traffic đi qua NAT Gateway ở khối lượng lớn, đồng thời giảm độ trễ và tăng tính bảo mật do traffic không rời khỏi mạng AWS.
{{% /notice %}}

**Hình minh họa**

`[Placeholder: vpc-endpoints-console.png - Danh sách VPC Endpoint Gateway và Interface đã tạo]`

#### Kiểm tra kết quả

```bash
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=<vpc-id>" \
  --query 'VpcEndpoints[*].[ServiceName,State]'
```

Kết quả mong đợi: các endpoint S3, DynamoDB, Secrets Manager đều ở trạng thái `available`.

Từ EC2 Backend, kiểm tra traffic đến S3 không còn qua NAT Gateway bằng cách theo dõi chỉ số `BytesOutToDestination` của NAT Gateway trên CloudWatch trước/sau khi tạo VPC Endpoint - chỉ số này sẽ giảm rõ rệt đối với traffic S3/DynamoDB.

```bash
aws budgets describe-budgets --account-id <account-id> \
  --query 'Budgets[?BudgetName==`officems-monthly-budget`]'
```

Kết quả mong đợi: Budget đã được tạo với ngưỡng cảnh báo 80%.

#### Best Practices

- Gắn tag chi phí (`Project`, `Environment`, `Owner`) nhất quán trên mọi tài nguyên ngay từ đầu để Cost Explorer/Budgets phân tích chính xác.
- Ưu tiên Gateway VPC Endpoint (miễn phí) trước, chỉ dùng Interface VPC Endpoint cho các service không hỗ trợ Gateway (như Secrets Manager, SNS, SQS).
- Chỉ mua Savings Plans sau khi đã có ít nhất 30 ngày dữ liệu sử dụng thực tế để tránh cam kết sai baseline.
- Định kỳ rà soát Cost Explorer hàng tuần trong giai đoạn đầu vận hành để phát hiện sớm chi phí bất thường.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Tạo VPC Endpoint Gateway không thấy giảm chi phí NAT | Route Table chưa được gắn đúng vào Endpoint | Kiểm tra lại `--route-table-ids` khi tạo endpoint |
| Budget không gửi được cảnh báo | Chưa xác nhận email subscriber | Kiểm tra hộp thư và xác nhận subscription |
| S3 Intelligent-Tiering không áp dụng cho object cũ | Lifecycle Rule chỉ áp dụng cho object mới sau khi bật | Áp dụng lại rule hoặc chờ chu kỳ đánh giá tự động của S3 |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.13 - Clean Up](../5.13-Cleanup/) để dọn dẹp toàn bộ tài nguyên đã tạo, tránh phát sinh chi phí ngoài ý muốn.
