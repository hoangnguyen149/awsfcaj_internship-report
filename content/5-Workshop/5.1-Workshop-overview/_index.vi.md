---
title: "Workshop Overview"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 5.1 </b> "
---

#### Giới thiệu

Hệ Thống Quản Lý Cho Thuê Văn Phòng On Cloud là một ứng dụng web ba tầng (three-tier), phục vụ đồng thời ba nhóm người dùng:

- **Tenant** - khách thuê văn phòng, xem thông tin hợp đồng, thanh toán, gửi yêu cầu hỗ trợ.
- **Admin** - quản trị viên, quản lý văn phòng, hợp đồng, khách thuê và báo cáo.
- **Technician** - kỹ thuật viên, xử lý các yêu cầu bảo trì, sửa chữa.

Toàn bộ hệ thống được triển khai trên AWS tại khu vực **ap-southeast-1 (Singapore)**, kết hợp kiến trúc Multi-tier truyền thống (Frontend - Backend - Database) với kiến trúc Serverless cho các nghiệp vụ đặc thù như thanh toán và xử lý tài liệu.

#### Mục tiêu Workshop

Sau khi hoàn thành workshop này, bạn sẽ có khả năng:

- Thiết kế và triển khai hạ tầng mạng VPC với Public/Private Subnet trải trên 2 Availability Zone.
- Cấu hình các lớp bảo mật: Security Group, NACL, IAM, Amazon Cognito, ACM, AWS WAF.
- Triển khai Frontend React tĩnh trên Amazon S3, phân phối qua Amazon CloudFront và Route 53.
- Triển khai Backend Node.js/Express chạy trên EC2 Auto Scaling Group, đứng sau Application Load Balancer.
- Triển khai tầng dữ liệu với Amazon RDS Multi-AZ, ElastiCache for Redis và Amazon DynamoDB.
- Xây dựng các vi dịch vụ Serverless bằng AWS Lambda và Amazon API Gateway.
- Quản lý thông tin nhạy cảm bằng AWS Secrets Manager.
- Thiết lập giám sát toàn diện với Amazon CloudWatch và Amazon SNS.
- Xây dựng pipeline CI/CD tự động từ GitHub bằng CodePipeline, CodeBuild, CodeDeploy theo chiến lược Blue/Green Deployment.
- Áp dụng các biện pháp tối ưu chi phí: AWS Budgets, Cost Explorer, Savings Plans, S3 Intelligent-Tiering, VPC Endpoints.

#### Kiến thức đạt được

- Nắm vững nguyên lý thiết kế kiến trúc High Availability trên AWS.
- Hiểu cách kết hợp mô hình Multi-tier và Serverless trong cùng một hệ thống.
- Thực hành các best practice về bảo mật theo AWS Well-Architected Framework.
- Thực hành triển khai CI/CD với chiến lược Blue/Green Deployment.
- Thực hành các kỹ thuật tối ưu chi phí vận hành trên AWS.

#### Kiến trúc tổng thể

Kiến trúc tham chiếu của hệ thống gồm các lớp chính sau:

| Lớp | Thành phần | Vai trò |
|---|---|---|
| Global Edge | Route 53, ACM, WAF, CloudFront | Quản lý tên miền, chứng chỉ, CDN, tường lửa ứng dụng web |
| Frontend | Amazon S3 (Static Website) | Lưu trữ React Frontend tĩnh |
| Identity | Amazon Cognito (User Pool/Identity Pool) | Xác thực, cấp quyền, bảo vệ API |
| Load Balancing | Application Load Balancer | Phân phối lưu lượng vào Backend |
| Application | EC2 Auto Scaling Group (Private Subnet, 2 AZ) | Chạy Backend API Node.js/Express bằng PM2 |
| Serverless API | AWS Lambda, Amazon API Gateway | Xử lý Payments, xử lý tài liệu |
| Database | Amazon RDS MySQL Multi-AZ | Cơ sở dữ liệu quan hệ chính |
| Cache | Amazon ElastiCache for Redis | Cache/session tốc độ cao |
| Storage | Amazon S3, Amazon DynamoDB | Lưu trữ tài liệu phi cấu trúc, audit log |
| Networking | VPC, NAT Gateway, Internet Gateway, VPC Peering | Kết nối mạng an toàn |
| Operations | Secrets Manager, CloudWatch, SNS | Bảo mật secret, giám sát, cảnh báo |
| DevOps | GitHub, CodePipeline, CodeBuild, CodeDeploy | CI/CD tự động, Blue/Green Deployment |



**Hình minh họa: Kiến trúc tổng thể hệ thống**

`[Placeholder: architecture-overview.png - Sơ đồ kiến trúc tổng thể từ Global Edge đến Database]`
{{< figure src="/images/5-Workshop/5.1-Workshop-overview/architecture-overview.png" title="Overall system architecture" >}}

#### Cấu trúc Workshop

Workshop được chia thành 13 chương, đi theo trình tự triển khai thực tế: từ chuẩn bị môi trường, dựng hạ tầng mạng, cấu hình bảo mật, triển khai từng tầng ứng dụng, đến giám sát, CI/CD, tối ưu chi phí và dọn dẹp tài nguyên. Mỗi chương đều có phần thực hành từng bước (step-by-step), kiểm tra kết quả và các lưu ý Best Practice/Troubleshooting.

#### Best Practices

- Luôn đặt tên tài nguyên (Name tag) theo quy ước thống nhất, ví dụ: `officems-<env>-<resource>`, để dễ quản lý và dọn dẹp sau này.
- Thực hiện toàn bộ workshop trong một tài khoản AWS thử nghiệm (sandbox account) riêng, tránh ảnh hưởng đến môi trường production.
- Ghi lại các Resource ID (VPC ID, Subnet ID, Security Group ID...) khi tạo, để tiện tham chiếu ở các chương sau.

#### Bước tiếp theo

Tiếp tục sang [Chương 5.2 - Prerequisites](../5.2-Prerequistes/) để chuẩn bị tài khoản AWS, công cụ CLI và các thông tin cần thiết trước khi bắt đầu triển khai.
