---
title: "Blog 1"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.1. </b> "
---
## Tối ưu chi phí hạ tầng AWS: Các chiến lược "sát ván" và bài học triển khai thực tế

### Vì sao cần Tối ưu chi phí hạ tầng?

Khi triển khai một hệ thống lên Cloud, nỗi sợ lớn nhất của chúng ta đôi khi không phải là lỗi code, mà là rủi ro "bị sập nguồn tài chính" vì hóa đơn AWS cuối tháng không thể kiểm soát. Trong dự án "Hệ thống quản lý cho thuê văn phòng trên Cloud", tối ưu chi phí không chỉ là việc chọn dịch vụ có giá rẻ nhất, mà đòi hỏi một chiến lược thiết kế kiến trúc ngay từ đầu. Mục tiêu là làm sao để chọn đúng mô hình hoạt động (Right-sizing), đáp ứng tốt hiệu năng nhưng vẫn có cơ chế tự động dọn dẹp tài nguyên dư thừa để tránh lãng phí.

### Các chiến lược hoạt động chính

Khi bật Multi-AZ cho một RDS instance (ví dụ MySQL, PostgreSQL), AWS sẽ:

1. Hybrid Compute (Lai cấu trúc EC2 và Serverless): Thay vì bắt các máy chủ EC2 phải gồng mình chạy liên tục 24/7 để xử lý tất cả các loại tác vụ, hệ thống chỉ dùng EC2 (Auto Scaling Group với instance t3.small) cho các API nghiệp vụ cốt lõi. Đối với các tác vụ không thường xuyên (như quét hợp đồng hết hạn hằng ngày, xử lý thanh toán hóa đơn), hệ thống đẩy sang AWS Lambda và API Gateway. Lambda hoạt động theo cơ chế pay-per-use (chỉ tính tiền khi có request chạy), giúp giảm tải đáng kể và giảm luôn kích cỡ instance EC2 cần mua ban đầu.
2. Quản lý vòng đời dữ liệu với S3 Lifecycle Policy: Hệ thống cho thuê văn phòng phát sinh rất nhiều tệp hình ảnh và file PDF hợp đồng điện tử theo thời gian. Để tránh bộ nhớ S3 Standard phình to gây tốn kém, hệ thống được thiết lập chính sách tự động chuyển các tài liệu cũ (sau 12 tháng) sang lớp lưu trữ S3 Glacier, giúp chi phí lưu trữ rẻ hơn tới 3-4 lần.
3. Chốt chặn với AWS Budgets & Cost Explorer: Để tránh bất ngờ vào cuối tháng, hệ thống cấu hình AWS Budgets gửi cảnh báo qua Email/SMS (thông qua Amazon SNS) ngay khi chi phí thực tế chạm mức 80% ngân sách dự kiến. Kết hợp với Cost Explorer, người quản trị có thể phân tích chi phí theo từng dịch vụ để liên tục đề xuất phương án tối ưu.

Thời gian failover trung bình thường rơi vào khoảng 60–120 giây tùy loại engine và khối lượng dữ liệu, đủ nhanh để hầu hết ứng dụng chỉ bị gián đoạn ngắn thay vì downtime kéo dài.

### Một số điểm dễ nhầm lẫn

- **Serverless không phải lúc nào cũng rẻ nhất.**  Nếu hệ thống của bạn có lượng truy cập liên tục, dày đặc 24/7, việc dùng Lambda cho mọi thứ có thể đắt hơn so với việc chạy các EC2 instance cố định có mua Reserved Instances. Do đó, mô hình lai (Hybrid) phân chia rõ tác vụ như trên mới là chìa khóa.
- **S3 Glacier không dành cho dữ liệu truy cập thường xuyên.** Mặc dù chi phí lưu trữ rẻ hơn rất nhiều, nhưng phí truy xuất (retrieval) và thời gian để lấy dữ liệu ra khỏi Glacier lại cao và lâu hơn. Chỉ nên áp dụng Lifecycle Policy cho dữ liệu mang tính lưu trữ dài hạn (archival) như hợp đồng đã thanh lý.
- **Cost Explorer không tự động tối ưu giúp bạn.** Đây chỉ là công cụ giám sát và phân tích. Bạn vẫn phải tự đọc biểu đồ để đưa ra quyết định hành động (ví dụ: dọn dẹp tài nguyên rác, tắt máy chủ không dùng).

### Bài học khi tối ưu thực tế

Trong quá trình xây dựng hệ thống, mình rút ra được một vài lưu ý thực tiễn:

- Không nên chờ đến khi hệ thống hoàn thiện mới tính đến bài toán chi phí. Việc cài đặt AWS Budgets phải được thực hiện ngay từ ngày đầu tiên tạo tài khoản và khởi tạo tài nguyên.
- Tận dụng triệt để các dịch vụ Managed Service của AWS ở dạng Free Tier trong thời gian đầu (như Amazon Cognito, Lambda) giúp giảm thiểu đáng kể chi phí vận hành cho các dự án vừa và nhỏ.
- Tối ưu chi phí là một quá trình liên tục. Thường xuyên kiểm tra để dọn dẹp các tài nguyên vô tình bị bỏ quên (như Elastic IPs không được gắn, EBS volume bị mồ côi khi xóa EC2) là thói quen cần có.

### Kết luận

Tối ưu chi phí trên AWS đòi hỏi sự kết hợp giữa hiểu biết về kiến trúc (như Serverless, Lifecycle) và kỹ năng giám sát ngân sách (Budgets). Bằng cách áp dụng đúng mô hình tính toán và lưu trữ, các hệ thống Web App vừa và nhỏ hoàn toàn có thể tận dụng tối đa sức mạnh, độ ổn định của Cloud mà vẫn loại bỏ được nỗi lo vượt rào tài chính.

...Image...
![AWS Infrastructure Cost Optimization Architecture](/images/3-BlogsPosted/BLOG1.png)
...Link...

...Guide...