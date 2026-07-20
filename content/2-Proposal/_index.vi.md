---
title: "Bản đề xuất"
date: 2026-07-13
weight: 2
chapter: false
pre: " <b> 2. </b> "
---
# Hệ Thống Quản Lý Cho Thuê Văn Phòng Trên Cloud (Cloud Office Rental Management System)
## Giải pháp AWS Serverless & 3-Tier Thống nhất cho Quản lý Bất động sản theo Thời gian thực

### 1. Tóm tắt dự án (Executive Summary)
Hệ thống Quản lý Cho thuê Văn phòng trên Cloud được thiết kế nhằm nâng cao hiệu quả hoạt động cho thuê văn phòng đối với các đơn vị quản lý nhiều tòa nhà. Hệ thống hỗ trợ vận hành lên đến 50 tòa nhà và 2.000 văn phòng, với khả năng mở rộng cho các quy mô lớn hơn, sử dụng nền tảng web để quản lý khách thuê, hợp đồng và bảo trì. Nền tảng tận dụng các dịch vụ của AWS Cloud để cung cấp khả năng giám sát theo thời gian thực, lập hóa đơn tự động và tối ưu chi phí, với quyền truy cập được phân quyền chặt chẽ cho bốn vai trò người dùng khác nhau thông qua Amazon Cognito.

### 2. Phát biểu vấn đề (Problem Statement)
### Vấn đề là gì?
Việc quản lý bất động sản hiện tại đòi hỏi phải thu thập dữ liệu thủ công bằng bảng tính và giấy tờ, dẫn đến tình trạng khó kiểm soát khi số lượng tòa nhà tăng lên. Doanh nghiệp không có một hệ thống tập trung nào để cung cấp dữ liệu tỷ lệ lấp đầy theo thời gian thực, thanh toán tự động hay quản lý yêu cầu bảo trì của khách thuê.

### Giải pháp
Nền tảng sử dụng Amazon EC2 với Auto Scaling Group cho tầng ứng dụng (application tier), Application Load Balancer để phân phối lưu lượng và Amazon RDS (MySQL Multi-AZ) cho dữ liệu giao dịch. AWS Lambda và API Gateway xử lý các tác vụ bất đồng bộ như xử lý thanh toán và gửi thông báo, trong khi Amazon S3 lưu trữ hợp đồng và các tài nguyên frontend tĩnh. Amazon CloudFront phân phối giao diện web ReactJS và Amazon Cognito đảm bảo xác thực truy cập an toàn. Tương tự như các phần mềm quản lý bất động sản hiện có, người dùng có thể đăng ký và quản lý hợp đồng thuê, nhưng nền tảng này hoạt động hoàn toàn trên kiến trúc cloud-native, có độ sẵn sàng cao. Các tính năng chính bao gồm dashboard theo thời gian thực, lập hóa đơn tự động và chi phí vận hành thấp.

### Lợi ích và Hiệu quả đầu tư (ROI)
Giải pháp thiết lập một nền tảng tập trung cơ bản cho người quản lý và khách thuê, đóng vai trò là trung tâm vận hành có độ sẵn sàng cao. Nó giảm thiểu việc báo cáo thủ công và quản lý hợp đồng thông qua một nền tảng tập trung, đơn giản hóa công tác quản trị và cải thiện độ tin cậy của dữ liệu. Chi phí hàng tháng ước tính khoảng $168 - $223 USD dựa trên bảng tính AWS Pricing Calculator. Điểm hòa vốn đạt được nhanh chóng nhờ tiết kiệm đáng kể thời gian từ việc giảm bớt khối lượng công việc quản trị thủ công và tối ưu hóa việc sử dụng tài nguyên cloud serverless.

### 3. Kiến trúc giải pháp (Solution Architecture)
Nền tảng sử dụng kiến trúc AWS 3-tier (3 tầng) và serverless để quản lý dữ liệu từ 50 tòa nhà, có khả năng mở rộng lên hàng nghìn người dùng. Dữ liệu được xử lý bởi các instance EC2, lưu trữ trong RDS và S3, trong khi các tác vụ bất đồng bộ được Lambda xử lý. S3 kết hợp CloudFront dùng để lưu trữ và phân phối dashboard, được bảo mật bởi Cognito. Kiến trúc chi tiết như sau:

![Cloud Office Rental Architecture](/images/2-Proposal/architecture.jpeg)


![IoT Weather Station Architecture](/images/2-Proposal/edge_architecture.jpeg)

![IoT Weather Platform Architecture](/images/2-Proposal/platform_architecture.jpeg)
### Các dịch vụ AWS sử dụng
- **Amazon EC2 & Auto Scaling**: Xử lý logic ứng dụng backend (Node.js) có khả năng tự động mở rộng theo tải truy cập.
- **AWS Lambda**: Xử lý các sự kiện serverless như thanh toán và gửi thông báo qua email/SMS.
- **Amazon API Gateway**: Xử lý các giao tiếp API serverless.
- **Amazon S3**: Lưu trữ file PDF hợp đồng gốc, hình ảnh và lưu trữ các file frontend tĩnh.
- **Amazon RDS & DynamoDB**: Lưu trữ dữ liệu giao dịch (MySQL) và nhật ký hoạt động/audit logs (NoSQL).
- **Application Load Balancer**: Phân phối lưu lượng truy cập ứng dụng web.
- **Amazon CloudFront**: Lưu trữ cache và phân phối an toàn giao diện web ReactJS trên toàn cầu.
- **Amazon Cognito**: Bảo mật quyền truy cập cho người dùng là Admin, Quản lý tòa nhà, Khách thuê và Nhân viên kỹ thuật.

### Thiết kế thành phần (Component Design)
- **Giao diện Frontend**: Ứng dụng ReactJS được lưu trữ trên S3 và phân phối qua mạng nội dung CloudFront CDN.
- **Tầng ứng dụng (Application Tier)**: Backend Node.js được host trên các instance EC2 nằm trong Auto Scaling Group tại các private subnet.
- **Lưu trữ dữ liệu**: Dữ liệu có cấu trúc lưu trữ trong Multi-AZ RDS; log lưu trữ trong DynamoDB; file lưu trữ trong S3.
- **Xử lý sự kiện**: AWS Lambda được kích hoạt bởi API Gateway cho các API chuyên biệt và bởi EventBridge cho các tác vụ lên lịch tự động.
- **Quản lý người dùng**: Amazon Cognito quản lý quyền truy cập người dùng, cho phép phân quyền theo từng vai trò cụ thể.

### 4. Triển khai kỹ thuật (Technical Implementation)
**Các giai đoạn triển khai**
Dự án này bao gồm 4 giai đoạn để triển khai hạ tầng và ứng dụng:
- Xây dựng lý thuyết và Thiết kế kiến trúc: Nghiên cứu kiến trúc cloud 3-tier và thiết kế topology AWS bao gồm VPC, EC2 và RDS (Tuần 1-3).
- Tính toán giá và Kiểm tra tính thực tế: Sử dụng AWS Pricing Calculator để ước tính chi phí và điều chỉnh thiết kế nếu cần thiết.
- Điều chỉnh kiến trúc cho phù hợp với chi phí/giải pháp: Tinh chỉnh thiết kế (ví dụ: sử dụng Lambda cho các tác vụ nền) để duy trì hiệu quả chi phí.
- Phát triển, Kiểm thử và Triển khai: Viết mã nguồn backend (Node.js), frontend (ReactJS) và thiết lập dịch vụ AWS bằng IaC, cấu hình hệ thống CI/CD (CodePipeline, CodeBuild, CodeDeploy), sau đó kiểm thử qua JMeter và phát hành lên môi trường production (Tuần 4-12).

**Yêu cầu kỹ thuật**
- Công nghệ ứng dụng: Frontend xây dựng bằng ReactJS, backend xây dựng bằng Node.js/Express.js.
- Nền tảng Cloud: Yêu cầu kiến thức thực hành về AWS EC2, Auto Scaling, RDS (MySQL), S3, CloudFront, API Gateway, Lambda, và Cognito.
- DevOps & Tự động hóa: Sử dụng AWS CodePipeline, CodeBuild, và CodeDeploy để thiết lập CI/CD tự động và cơ chế triển khai Blue/Green.

### 5. Kế hoạch & Các mốc thực hiện (Timeline & Milestones)
**Tiến độ dự án**
- Giai đoạn 1 (Tuần 1-3): Lập kế hoạch, thiết kế kiến trúc và thiết lập hạ tầng mạng VPC cơ bản.
- Giai đoạn 2 (Tuần 4-6): Triển khai tầng tính toán (EC2/ALB) và cơ sở dữ liệu (RDS/DynamoDB).
- Giai đoạn 3 (Tuần 7-9): Tích hợp xác thực Cognito, các hàm serverless (Lambda) và triển khai frontend.
- Giai đoạn 4 (Tuần 10-12): Tự động hóa CI/CD, kiểm thử tải (load testing), thiết lập giám sát và bàn giao tài liệu.

### 6. Ước tính chi phí (Budget Estimation)
Bạn có thể tìm thấy bảng ước tính chi phí chi tiết trên công cụ AWS Pricing Calculator.[Công cụ tính giá AWS](https://computer.aws/#/estimate?id=621f38b12a1ef026842ba2ddfe46ff936ed4ab01)
Hoặc tải xuống [tệp ước tính ngân sách](../attachments/budget_estimation.pdf). 

### Chi phí hạ tầng
- Các dịch vụ AWS:
    - EC2 (Auto Scaling): ~$30 - $75/tháng (2-5 x t3.small).
    - Application Load Balancer: ~$18/tháng (1 ALB).
    - RDS MySQL (Multi-AZ): ~$70/tháng (db.t3.small, 50GB).
    - ElastiCache Redis: ~$12/tháng (cache.t3.micro).
    - S3 + CloudFront: ~$20/tháng (50GB lưu trữ + 200GB data transfer).
    - Lambda + API Gateway: ~$5/tháng (~200,000 requests).
    - DynamoDB (On-Demand): ~$5/tháng.
    - Cognito: ~$0 - $10/tháng (5,000 MAU).
    - CloudWatch + SNS: ~$8/tháng (Metrics, Logs, Alarms).

Tổng cộng: ~$168 - $223/tháng.

### 7. Đánh giá rủi ro (Risk Assessment)
#### Ma trận rủi ro
- Tấn công bảo mật (SQLi, XSS): Mức độ ảnh hưởng Cao, Xác suất Trung bình.
- Vượt ngân sách: Mức độ ảnh hưởng Trung bình, Xác suất Trung bình.
- Gián đoạn dịch vụ / Hỏng hóc phần cứng: Mức độ ảnh hưởng Đặc biệt nghiêm trọng, Xác suất Thấp.

#### Biện pháp giảm thiểu
- Bảo mật: Triển khai AWS WAF bảo vệ CloudFront và cấu hình chặt chẽ các luật Security Group.
- Chi phí: Thiết lập AWS Budgets và các cảnh báo CloudWatch để chủ động giám sát mức sử dụng tài nguyên.
- Gián đoạn: Triển khai kiến trúc Multi-AZ cho RDS và cơ chế Auto Scaling cho các máy chủ EC2.

#### Kế hoạch dự phòng
- Khôi phục (Rollback) về các phiên bản ứng dụng hoạt động ổn định trước đó thông qua tính năng rollback CI/CD tự động (CodeDeploy) nếu quá trình triển khai gặp lỗi.
- Dựa vào cơ chế tự động chuyển đổi dự phòng (failover) của RDS (mất khoảng 45-70 giây) nếu database chính gặp sự cố vật lý.

### 8. Kết quả mong đợi (Expected Outcomes)
#### Kết quả kỹ thuật: 
- Quản lý bằng dữ liệu theo thời gian thực và phân tích tự động thay thế hoàn toàn cho việc theo dõi thủ công bằng bảng tính Excel.
- Hệ thống có độ sẵn sàng cao, có khả năng tự động mở rộng để hỗ trợ hàng nghìn người dùng đồng thời với thời gian phản hồi luôn duy trì dưới 300ms.
#### Giá trị dài hạn
- Xây dựng nền tảng dữ liệu vững chắc cho việc tích hợp các dịch vụ AI/ML trong tương lai (ví dụ: Sử dụng Amazon Personalize để tự động gợi ý văn phòng phù hợp).
- Cung cấp bộ thư viện cơ sở hạ tầng dưới dạng mã (IaC templates) có thể tái sử dụng cho các dự án triển khai cloud sau này của doanh nghiệp.