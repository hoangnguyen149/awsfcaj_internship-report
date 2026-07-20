---
title: "Deploy Database"
date: 2026-07-13
weight: 7
chapter: false
pre: " <b> 5.7 </b> "
---

#### Giới thiệu

Chương này triển khai tầng dữ liệu của hệ thống, gồm Amazon RDS MySQL cấu hình Multi-AZ cho dữ liệu quan hệ (hợp đồng, khách thuê, văn phòng), Amazon ElastiCache for Redis cho cache/session tốc độ cao, và Amazon DynamoDB cho audit log/giao dịch.

#### Mục tiêu

- Tạo DB Subnet Group và RDS MySQL Multi-AZ (Master tại AZ-1, Standby tại AZ-2).
- Tạo ElastiCache for Redis (cache.t3.micro).
- Tạo bảng DynamoDB lưu Audit Log.

#### Kiến thức đạt được

- Hiểu cơ chế Failover tự động của RDS Multi-AZ khi Master gặp sự cố.
- Hiểu vai trò của Redis trong việc giảm tải truy vấn lặp lại và lưu session.
- Hiểu mô hình dữ liệu NoSQL của DynamoDB phù hợp cho audit log với lượng ghi lớn.

#### Kiến trúc sử dụng

```
EC2 Backend (Private Subnet, 2 AZ)
    │
    ├── RDS MySQL Multi-AZ
    │     ├── Master   (Private Subnet AZ-1)
    │     └── Standby  (Private Subnet AZ-2, đồng bộ synchronous)
    │
    ├── ElastiCache for Redis (cache.t3.micro, Private Subnet)
    │
    └── DynamoDB (Audit Logs, Transactions) - không cần đặt trong VPC
```

**Hình minh họa**

`[Placeholder: database-multiaz.png - Sơ đồ RDS Multi-AZ + Redis + DynamoDB]`
{{< figure src="/images/5-Workshop/5.7-Deploy the Backend Services/database-multiaz.png" title="Database Multi-AZ architecture" >}}

#### Các bước thực hiện

**Bước 1 - Tạo DB Subnet Group**

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name officems-db-subnet-group \
  --db-subnet-group-description "Private subnets for RDS" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>
```

**Bước 2 - Tạo RDS MySQL Multi-AZ**

```bash
aws rds create-db-instance \
  --db-instance-identifier officems-mysql \
  --db-instance-class db.t3.small \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --manage-master-user-password \
  --allocated-storage 20 \
  --storage-type gp3 \
  --multi-az \
  --db-subnet-group-name officems-db-subnet-group \
  --vpc-security-group-ids <sg-rds-id> \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --db-name officems
```

{{% notice tip %}}
Tuỳ chọn `--manage-master-user-password` cho phép RDS tự động tạo và lưu mật khẩu vào AWS Secrets Manager, loại bỏ nhu cầu tự quản lý mật khẩu thủ công (sẽ dùng lại ở Chương 5.9).
{{% /notice %}}

Chờ trạng thái instance chuyển sang `available` (thường mất 10-15 phút với Multi-AZ):

```bash
aws rds wait db-instance-available --db-instance-identifier officems-mysql
```

**Bước 3 - Tạo ElastiCache for Redis**

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name officems-redis-subnet-group \
  --cache-subnet-group-description "Private subnets for Redis" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>

aws elasticache create-cache-cluster \
  --cache-cluster-id officems-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --cache-subnet-group-name officems-redis-subnet-group \
  --security-group-ids <sg-redis-id> \
  --engine-version 7.1
```

**Bước 4 - Tạo bảng DynamoDB cho Audit Log**

```bash
aws dynamodb create-table \
  --table-name officems-audit-logs \
  --attribute-definitions \
      AttributeName=entityId,AttributeType=S \
      AttributeName=timestamp,AttributeType=N \
  --key-schema \
      AttributeName=entityId,KeyType=HASH \
      AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

`PAY_PER_REQUEST` (On-Demand) phù hợp với khối lượng ghi log không đều, tránh phải ước lượng capacity trước.

**Bước 5 - Khởi tạo schema cho RDS**

Kết nối vào RDS thông qua EC2 Backend (đã ở cùng VPC) hoặc qua Bastion/Session Manager port-forwarding:

```bash
mysql -h <rds-endpoint> -u admin -p officems < schema.sql
```

Ví dụ schema cơ bản gồm các bảng chính:

```sql
CREATE TABLE offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  status ENUM('available','rented','maintenance') DEFAULT 'available'
);

CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cognito_sub VARCHAR(255) UNIQUE
);

CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  tenant_id INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status ENUM('active','expired','terminated') DEFAULT 'active',
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

**Hình minh họa**

`[Placeholder: rds-console.png - RDS Console hiển thị trạng thái Multi-AZ Available]`

#### Kiểm tra kết quả

```bash
aws rds describe-db-instances --db-instance-identifier officems-mysql \
  --query 'DBInstances[0].[DBInstanceStatus,MultiAZ,AvailabilityZone,SecondaryAvailabilityZone]'
```

Kết quả mong đợi: `DBInstanceStatus = available`, `MultiAZ = true`, và `AvailabilityZone`/`SecondaryAvailabilityZone` nằm ở hai AZ khác nhau.

```bash
aws elasticache describe-cache-clusters --cache-cluster-id officems-redis \
  --query 'CacheClusters[0].CacheClusterStatus'
```

Kết quả mong đợi: `available`.

Thử ghi/đọc thử một item vào DynamoDB:

```bash
aws dynamodb put-item --table-name officems-audit-logs \
  --item '{"entityId": {"S": "test-1"}, "timestamp": {"N": "1737100000"}, "action": {"S": "CREATE"}}'
aws dynamodb get-item --table-name officems-audit-logs \
  --key '{"entityId": {"S": "test-1"}, "timestamp": {"N": "1737100000"}}'
```

#### Best Practices

- Bật `--manage-master-user-password` để RDS tự động lưu và xoay vòng mật khẩu qua Secrets Manager.
- Bật Automated Backup với retention tối thiểu 7 ngày và bật Point-in-Time Recovery cho DynamoDB đối với dữ liệu quan trọng.
- Không đặt RDS/Redis trong Public Subnet, luôn giữ `--no-publicly-accessible`.
- Theo dõi `FreeableMemory` và `CPUUtilization` của RDS/Redis qua CloudWatch để chủ động nâng cấp instance class.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Backend không kết nối được RDS | Security Group hoặc endpoint sai | Kiểm tra `sg-rds` cho phép `sg-backend`, xác nhận đúng RDS endpoint |
| Tạo RDS Multi-AZ quá lâu không xong | Bình thường với Multi-AZ, cần 10-15 phút | Dùng `aws rds wait db-instance-available` để chờ đúng cách |
| DynamoDB báo lỗi `ProvisionedThroughputExceededException` | Đang dùng billing mode Provisioned với capacity thấp | Chuyển sang `PAY_PER_REQUEST` hoặc tăng capacity |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.8 - Build Serverless Services](../5.8-Serverless/) để triển khai các vi dịch vụ Lambda và API Gateway.
