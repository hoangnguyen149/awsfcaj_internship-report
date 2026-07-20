---
title: "Create AWS Networking"
date: 2026-07-13
weight: 3
chapter: false
pre: " <b> 5.3 </b> "
---

#### Giới thiệu

Chương này hướng dẫn xây dựng nền tảng mạng (networking foundation) cho Hệ Thống Quản Lý Cho Thuê Văn Phòng, gồm một VPC trải rộng trên 2 Availability Zone tại ap-southeast-1, với Public Subnet và Private Subnet ở mỗi AZ, đảm bảo tính sẵn sàng cao cho tầng ứng dụng và cơ sở dữ liệu.

#### Mục tiêu

- Tạo 1 VPC với CIDR block riêng.
- Tạo 2 Public Subnet và 2 Private Subnet trải trên `ap-southeast-1a` và `ap-southeast-1b`.
- Tạo Internet Gateway và gắn vào VPC.
- Tạo 2 NAT Gateway (mỗi AZ một cái) kèm Elastic IP.
- Cấu hình Route Table cho Public Subnet và Private Subnet.

#### Kiến thức đạt được

- Hiểu vai trò của Public/Private Subnet trong kiến trúc High Availability.
- Hiểu cách NAT Gateway cho phép EC2 trong Private Subnet truy cập Internet một chiều (outbound).
- Hiểu cách Route Table điều hướng lưu lượng mạng.

#### Kiến trúc sử dụng

Sơ đồ mạng của hệ thống:

```
VPC: 10.0.0.0/16
├── AZ: ap-southeast-1a
│   ├── Public Subnet:  10.0.0.0/24  (ALB, NAT Gateway 1)
│   └── Private Subnet: 10.0.10.0/24 (EC2 Backend, RDS Master)
└── AZ: ap-southeast-1b
    ├── Public Subnet:  10.0.1.0/24  (NAT Gateway 2)
    └── Private Subnet: 10.0.11.0/24 (EC2 Backend, RDS Standby)
```

**Hình minh họa**

`[Placeholder: vpc-architecture.png - Sơ đồ VPC với Public/Private Subnet trên 2 AZ]`
{{< figure src="/images/5-Workshop/5.3-S3-vpc/vpc-architecture.png" title="VPC architecture diagram" >}}

#### Các bước thực hiện

**Bước 1 - Tạo VPC**

```bash
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=officems-vpc}]'
```

Ghi lại `VpcId` trả về, ví dụ `vpc-0123456789abcdef0`.

Bật DNS hostname cho VPC:

```bash
aws ec2 modify-vpc-attribute --vpc-id <vpc-id> --enable-dns-hostnames
```

**Bước 2 - Tạo Subnet**

```bash
# Public Subnet AZ-1
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.0.0/24 \
  --availability-zone ap-southeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-public-1a}]'

# Public Subnet AZ-2
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 \
  --availability-zone ap-southeast-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-public-1b}]'

# Private Subnet AZ-1
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.10.0/24 \
  --availability-zone ap-southeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-private-1a}]'

# Private Subnet AZ-2
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.11.0/24 \
  --availability-zone ap-southeast-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-private-1b}]'
```

Với Public Subnet, bật tự động cấp public IP:

```bash
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-1a-id> --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-1b-id> --map-public-ip-on-launch
```

**Bước 3 - Tạo và gắn Internet Gateway**

```bash
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=officems-igw}]'

aws ec2 attach-internet-gateway --vpc-id <vpc-id> --internet-gateway-id <igw-id>
```

**Bước 4 - Tạo NAT Gateway**

Cấp Elastic IP cho từng NAT Gateway:

```bash
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=officems-eip-nat1}]'
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=officems-eip-nat2}]'
```

Tạo NAT Gateway tại mỗi Public Subnet:

```bash
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1a-id> \
  --allocation-id <eip-nat1-allocation-id> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=officems-nat-1a}]'

aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1b-id> \
  --allocation-id <eip-nat2-allocation-id> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=officems-nat-1b}]'
```

Chờ trạng thái NAT Gateway chuyển sang `available` trước khi qua bước tiếp theo.

**Bước 5 - Cấu hình Route Table**

Route Table cho Public Subnet (trỏ về Internet Gateway):

```bash
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-public}]'

aws ec2 create-route --route-table-id <rt-public-id> \
  --destination-cidr-block 0.0.0.0/0 --gateway-id <igw-id>

aws ec2 associate-route-table --subnet-id <public-subnet-1a-id> --route-table-id <rt-public-id>
aws ec2 associate-route-table --subnet-id <public-subnet-1b-id> --route-table-id <rt-public-id>
```

Route Table riêng cho Private Subnet mỗi AZ (trỏ về NAT Gateway tương ứng để đảm bảo tính sẵn sàng độc lập theo AZ):

```bash
# Private Route Table AZ-1
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-private-1a}]'
aws ec2 create-route --route-table-id <rt-private-1a-id> \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-1a-id>
aws ec2 associate-route-table --subnet-id <private-subnet-1a-id> --route-table-id <rt-private-1a-id>

# Private Route Table AZ-2
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-private-1b}]'
aws ec2 create-route --route-table-id <rt-private-1b-id> \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-1b-id>
aws ec2 associate-route-table --subnet-id <private-subnet-1b-id> --route-table-id <rt-private-1b-id>
```

{{% notice tip %}}
Mỗi Private Subnet định tuyến qua NAT Gateway cùng AZ để tránh Cross-AZ Data Transfer Charge và tăng khả năng chịu lỗi khi một AZ gặp sự cố.
{{% /notice %}}

#### Kiểm tra kết quả

Trong AWS Console, vào **VPC > Your VPCs**, xác nhận:

- VPC `officems-vpc` có trạng thái `Available`.
- 4 Subnet đã tạo đúng CIDR và đúng AZ.
- 2 NAT Gateway ở trạng thái `Available`.
- Route Table Public có route `0.0.0.0/0 -> igw-xxxx`.
- Route Table Private có route `0.0.0.0/0 -> nat-xxxx`.

Kiểm tra kết nối bằng cách khởi tạo một EC2 instance thử nghiệm trong Private Subnet và thực hiện `curl https://aws.amazon.com` để xác nhận Outbound Internet hoạt động qua NAT Gateway.

**Hình minh họa**

`[Placeholder: route-table-verify.png - Route Table Public/Private sau khi cấu hình]`

#### Best Practices

- Tách CIDR theo từng lớp (10.0.0.0/24, 10.0.1.0/24...) để dễ mở rộng subnet trong tương lai.
- Luôn triển khai NAT Gateway theo từng AZ thay vì dùng chung 1 NAT Gateway, tránh single point of failure.
- Đặt tag `Name` rõ ràng cho mọi tài nguyên mạng để thuận tiện khi audit và dọn dẹp.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| EC2 trong Private Subnet không ra được Internet | Route Table chưa trỏ đến NAT Gateway hoặc NAT Gateway chưa `Available` | Kiểm tra lại Route Table và trạng thái NAT Gateway |
| Không tạo được NAT Gateway | Elastic IP chưa được cấp phát hoặc đã dùng hết quota | Kiểm tra `aws ec2 describe-addresses`, giải phóng EIP không dùng |
| Subnet không có Public IP dù đã ở Public Subnet | Chưa bật `map-public-ip-on-launch` | Chạy lại lệnh `modify-subnet-attribute` |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.4 - Configure Security](../5.4-Security/) để cấu hình Security Group, NACL, IAM, Cognito, ACM và WAF cho hệ thống.
