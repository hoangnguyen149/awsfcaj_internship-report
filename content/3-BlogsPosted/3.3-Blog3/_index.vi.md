---
title: "Blog 3"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.3. </b> "
---
## Quản lý định danh và bảo mật với Amazon Cognito: Đừng tự "phát minh lại bánh xe"

### Vì sao cần Amazon Cognito?

Trong các hệ thống truyền thống, việc tự xây dựng module đăng ký, đăng nhập, mã hóa mật khẩu, phân quyền và quản lý session thường tiêu tốn rất nhiều thời gian của lập trình viên, đồng thời tiềm ẩn rủi ro bảo mật nghiêm trọng (như rò rỉ cơ sở dữ liệu mật khẩu). Đối với dự án "Hệ thống quản lý cho thuê văn phòng", mình quyết định ủy quyền hoàn toàn khâu quản lý định danh và xác thực cho Amazon Cognito. Điều này giúp tiết kiệm thời gian phát triển và nâng cao chuẩn bảo mật ngay từ đầu.

### Cơ chế hoạt động

Hệ thống tận dụng các tính năng mạnh mẽ của Cognito kết hợp với các dịch vụ bảo mật AWS khác qua 3 khía cạnh:

1. Phân quyền với Cognito Groups: Hệ thống có 4 đối tượng người dùng chính: Admin, Building Manager, Tenant, và Technician. Thay vì lưu trữ vai trò phức tạp trong Database, mình tạo 4 nhóm tương ứng trên Cognito User Pool. Khi user đăng nhập, JWT token trả về sẽ chứa sẵn thuộc tính vai trò, giúp Backend (Node.js) dễ dàng giải mã và kiểm tra quyền truy cập.
2. Bảo mật vòng ngoài cùng với Cognito Authorizer: API Gateway được tích hợp trực tiếp Cognito Authorizer. Mọi request gọi vào các API serverless (như xử lý thanh toán) đều bị API Gateway kiểm tra token đầu tiên. Nếu token không hợp lệ hoặc hết hạn, request bị chặn ngay (trả về 401/403) mà không thể chạm tới hàm Lambda bên trong.
3. Nguyên tắc đặc quyền tối thiểu (Least Privilege): Xác thực người dùng là chưa đủ, các thành phần hệ thống cũng phải được phân quyền. Mình cấp các AWS IAM Role riêng biệt cho EC2, Lambda, và CodeBuild. Mỗi Role chỉ được phép truy cập vào đúng các tài nguyên cần thiết (như S3 bucket hoặc bảng DynamoDB cụ thể), giảm thiểu tối đa rủi ro nếu một thành phần bị tấn công.

### Một số điểm dễ nhầm lẫn

- **Cognito xử lý toàn bộ logic phân quyền (Authorization) của ứng dụng.**  Không đúng. Cognito giúp xác thực (Authentication) và cho biết người dùng thuộc nhóm nào. Còn việc người dùng nhóm "Tenant" có được xem hóa đơn của người khác hay không thì logic ứng dụng ở Backend vẫn phải tự kiểm tra dựa trên user_id.
- **Dùng Cognito thì không cần bảo vệ API nữa.** Cognito Authorizer chỉ chặn các request không có danh tính hợp lệ. Ứng dụng vẫn có thể bị tấn công DDoS, SQL Injection hay XSS từ người dùng đã đăng nhập. Do đó, việc sử dụng AWS WAF đứng trước CloudFront và ALB vẫn là bắt buộc.
- **Mã thông báo JWT (Token) tồn tại vĩnh viễn.** JJWT token có thời gian hết hạn (thường là 1 tiếng). Việc không thiết lập cơ chế Refresh Token trên Frontend sẽ khiến người dùng liên tục bị văng ra ngoài, gây trải nghiệm rất tệ.

### Bài học khi kiểm thử tải thực tế

Qua việc xây dựng hệ thống phân quyền trong. Một số bài học rút ra:

- Cấu hình chính sách mật khẩu mạnh ngay từ đầu trên Cognito (yêu cầu chữ hoa, chữ thường, số, ký tự đặc biệt) là cực kỳ quan trọng để ngăn chặn các cuộc tấn công brute-force.
- Khi gọi các API nhạy cảm, việc lưu trữ Access Token trên Frontend cần được thực hiện cẩn thận (khuyến nghị dùng HttpOnly Cookies) để phòng tránh lỗ hổng XSS đánh cắp phiên đăng nhập.
- Việc kiểm thử bảo mật bằng cách dùng tài khoản Tenant cố tình gọi các API của Admin (ví dụ API quản lý tòa nhà) đã chứng minh vai trò của Middleware: Backend trả về lỗi 403 Forbidden chính xác như kỳ vọng thiết kế.
### Kết luận

Trong kỷ nguyên điện toán đám mây, việc tận dụng các dịch vụ Managed Service như Amazon Cognito là bước đi thông minh. Nó không chỉ giúp hệ thống đáp ứng các tiêu chuẩn bảo mật khắt khe nhất mà còn giải phóng lập trình viên khỏi những công việc "reinvent the wheel" (phát minh lại bánh xe), để họ có thể tập trung hoàn toàn vào việc xây dựng logic nghiệp vụ (Business Logic) cốt lõi của sản phẩm.

...Image...
![High Availability Architecture Using ALB, Auto Scaling, and Amazon RDS Multi-AZ](/images/3-BlogsPosted/BLOG3.png)
...Link...

...Guide...