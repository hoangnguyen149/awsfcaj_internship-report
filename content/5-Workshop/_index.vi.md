---
title: "Workshop"
date: 2026-07-13
weight: 5
chapter: false
pre: " <b> 5. </b> "
---

## Triển khai Hệ Thống Quản Lý Cho Thuê Văn Phòng On Cloud trên AWS

### Tổng quan

**Hệ Thống Quản Lý Cho Thuê Văn Phòng On Cloud** à một ứng dụng web phục vụ ba nhóm người dùng - Tenant (khách thuê), Admin (quản trị) và Technician (kỹ thuật viên) - được xây dựng theo kiến trúc Multi-tier kết hợp Serverless trên nền tảng AWS tại khu vực ap-southeast-1 (Singapore). Workshop này hướng dẫn bạn triển khai toàn bộ hệ thống từ hạ tầng mạng, bảo mật, frontend, backend, cơ sở dữ liệu cho đến các dịch vụ serverless, giám sát và CI/CD, theo đúng kiến trúc tham chiếu đã được thiết kế.

Hệ thống được thiết kế đảm bảo tính sẵn sàng cao (High Availability) trên 2 vùng sẵn sàng (Availability Zones), sử dụng Amazon EC2 trong Auto Scaling Group đứng sau Application Load Balancer cho tầng ứng dụng, Amazon RDS MySQL Multi-AZ và Amazon ElastiCache for Redis cho tầng dữ liệu. Các nghiệp vụ đặc thù như thanh toán (Payments) và xử lý tài liệu được tách thành vi dịch vụ chạy trên AWS Lambda và Amazon API Gateway, giúp tối ưu hiệu suất xử lý và tiết kiệm chi phí tính toán so với mô hình chạy thường trực.

+ **Về bảo mật**, hệ thống sử dụng Amazon Cognito để xác thực và cấp quyền người dùng, AWS WAF kết hợp Amazon CloudFront để bảo vệ tầng biên, AWS Certificate Manager (ACM) và Amazon Route 53 để quản lý tên miền và chứng chỉ SSL/TLS, cùng AWS Secrets Manager để bảo vệ các thông tin nhạy cảm như mật khẩu cơ sở dữ liệu. Toàn bộ workload backend được đặt trong Private Subnets, chỉ có thể ra Internet một chiều qua NAT Gateway.

+ **Về vận hành** , hệ thống áp dụng quy trình CI/CD tự động từ GitHub thông qua AWS CodePipeline, AWS CodeBuild và AWS CodeDeploy với chiến lược Blue/Green Deployment để triển khai không gián đoạn dịch vụ. Amazon CloudWatch và Amazon SNS đảm nhiệm giám sát và cảnh báo, trong khi AWS Budgets, AWS Cost Explorer, Savings Plans, S3 Intelligent-Tiering và VPC Endpoints được sử dụng để tối ưu chi phí vận hành hàng tháng.

Kết thúc workshop, bạn sẽ có khả năng tự thiết kế và triển khai một hệ thống web ba tầng (three-tier) có tính sẵn sàng cao, bảo mật theo chuẩn AWS Well-Architected Framework, mở rộng bằng Auto Scaling và Serverless, đồng thời vận hành với quy trình CI/CD và giám sát chi phí hoàn chỉnh.

#### Nội dung

1. [Tổng quan về workshop](5.1-Workshop-overview/)
2. [Điều kiện tiên quyết](5.2-Prerequistes/)
3. [Tạo mạng AWS](5.3-Create-AWS-Network/)
4. [Cấu hình bảo mật](5.4-Security-Configuration/)
5. [Triển khai giao diện người dùng](5.5-User-Interface-Presentation/)
6. [Triển khai máy chủ](5.6-Deploying-Servers/)
7. [Triển khai máy chủ phụ trợ](5.7-Deploying-Server-Support/)
8. [Triển khai cơ sở dữ liệu](5.8-Data-Declaration-Base/)
9. [Xây dựng dịch vụ Serverless](5.9-Building-Serverless-Services/)
10. [Quản lý bí mật](5.10-Secret-Management/)
11. [Giám sát](5.11-Monitoring/)
12. [Tối ưu hóa chi phí](5.12-Cost-Optimization/)
13. [Dọn dẹp](5.13-Cleanup/)