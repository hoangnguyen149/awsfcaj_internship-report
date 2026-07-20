---
title: "Blog 2"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.2. </b> "
---
## Xây dựng hệ thống High Availability: Tự động mở rộng và phục hồi sự cố thực tế

### Vì sao cần kiến trúc High Availability (HA)?
Hệ thống quản lý cho thuê văn phòng, một trong những yêu cầu phi chức năng cốt lõi là hệ thống phải đáp ứng tối thiểu 500 người dùng đồng thời và chịu được mức tải đỉnh điểm lên đến 2.000 người dùng mà không bị sập hay phản hồi chậm. Nếu chỉ chạy ứng dụng trên một máy chủ duy nhất, khi máy chủ đó quá tải hoặc gặp sự cố phần cứng, toàn bộ hệ thống sẽ tê liệt. Để giải quyết bài toán này, mình đã triển khai kiến trúc 3 tầng (3-tier) phân bố trên nhiều vùng khả dụng (Multi-AZ) để đảm bảo tính sẵn sàng cao và khả năng tự động co giãn.

### Cơ chế hoạt động

Kiến trúc HA của hệ thống được vận hành nhờ sự phối hợp của 3 thành phần chính:

1. Điều hướng traffic với Application Load Balancer (ALB): ALB được đặt ở Public Subnet để tiếp nhận request từ bên ngoài và phân phối đều vào các EC2 instance ở Private Subnet. Nhờ cơ chế Health Check, nếu một máy chủ EC2 bị lỗi, ALB sẽ tự động ngừng chuyển traffic vào máy chủ đó, giúp người dùng không gặp lỗi gián đoạn.
2. Co giãn tự động với Auto Scaling Group (ASG): Tầng ứng dụng Node.js được quản lý bởi ASG với chính sách Target Tracking Scaling dựa trên mức sử dụng CPU (ngưỡng 60%). Khi tải tăng vọt, ASG tự động "đẻ" thêm máy chủ, và khi tải giảm, nó tự động thu hẹp lại để tối ưu chi phí.  
3. Chốt chặn với AWS Budgets & Cost Explorer: Để tránh bất ngờ vào cuối tháng, hệ thống cấu hình AWS Budgets gửi cảnh báo qua Email/SMS (thông qua Amazon SNS) ngay khi chi phí thực tế chạm mức 80% ngân sách dự kiến. Kết hợp với Cost Explorer, người quản trị có thể phân tích chi phí theo từng dịch vụ để liên tục đề xuất phương án tối ưu.Dự phòng dữ liệu với RDS Multi-AZ: Cơ sở dữ liệu MySQL được cấu hình Multi-AZ, tự động đồng bộ dữ liệu sang một máy chủ standby ở vùng AZ khác. Khi có sự cố với DB chính, hệ thống tự động chuyển đổi (failover) chỉ trong 45-70 giây.

### Một số điểm dễ nhầm lẫn

- **Auto Scaling mở rộng máy chủ ngay lập tức.**  Thực tế, ASG cần một khoảng thời gian (khoảng vài phút) để khởi tạo EC2, chạy các script khởi động, tải code và vượt qua Health Check trước khi nhận traffic. Do đó, hệ thống luôn cần cấu hình mức Minimum capacity phù hợp để chịu tải đột ngột trong lúc chờ scale-out.
- **ALB có thể chống lại mọi đợt tấn công DDoS.** ALB giúp phân tán tải rất tốt, nhưng bản thân nó không thể phân biệt request độc hại với request hợp lệ ở tầng ứng dụng. Để bảo mật thực sự, bắt buộc phải tích hợp thêm AWS WAF (Web Application Firewall).
- **High Availability có nghĩa là uptime 100%** HA giúp hệ thống đạt được SLA cao (ví dụ 99.9%), nhưng những sự cố chuyển đổi (như RDS failover) vẫn gây ra gián đoạn ngắn (transient failures). Ứng dụng phải được thiết kế để tự động thử lại (retry) các request bị rớt trong lúc chuyển đổi.

### Bài học khi kiểm thử tải thực tế

Để kiểm chứng kiến trúc, mình đã sử dụng Apache JMeter mô phỏng tải 2.000 người dùng đồng thời. Một số bài học rút ra:

- Cấu hình ngưỡng CPU 60% cho Target Tracking là hợp lý. Khi lưu lượng tăng vọt lên 600.000 requests trong 15 phút, CPU trung bình vọt lên 82%, hệ thống tự động tăng từ 2 lên 5 instance trong chưa đầy 3 phút.
- Quá trình scale-out diễn ra mượt mà không ghi nhận request lỗi (0% error rate đối với mã 5xx). Điều này chứng minh việc đóng gói sẵn môi trường vào AMI kết hợp với Launch Template hoạt động cực kỳ hiệu quả.
- Cần theo dõi sát sao biểu đồ CloudWatch để tinh chỉnh thời gian Cooldown, tránh việc ASG liên tục scale in/out (hiện tượng thrashing) khi tải dao động nhẹ.

### Kết luận

High Availability không phải là một dịch vụ hay nút bấm duy nhất trên Cloud, mà là sự kết hợp chặt chẽ giữa tầng mạng (ALB), tầng tính toán (Auto Scaling) và tầng dữ liệu (Multi-AZ). Việc cấu hình và kiểm thử tải thực tế giúp chúng ta hiểu rõ giới hạn của hệ thống, từ đó tự tin vận hành các ứng dụng có lượng truy cập lớn mà không cần thao tác can thiệp thủ công khi sự cố xảy ra.

...Image...
![High Availability Architecture Using ALB, Auto Scaling, and Amazon RDS Multi-AZ](/images/3-BlogsPosted/BLOG2.png)
...Link...

...Guide...