---
title: "Event 2"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 4.2. </b> "
---

## Summary Report: "FCAJ Community Day – Context, CloudFront & Multi-Agent Systems"

**Link sự kiện:** [https://luma.com/ubaur0y5](https://luma.com/ubaur0y5)
**Địa điểm:** Bitexco Financial Tower (tầng 26), TP. Hồ Chí Minh
**Host:** Huỳnh Hoàng Long, Thien Lu, Trần Đại Vĩ

### Event Objectives
- Chia sẻ cách tối ưu "context" để ứng dụng AI hoạt động hiệu quả hơn trong thực tế.
- Giới thiệu các tính năng AI assistant mới trên Amazon Quick phục vụ phân tích dữ liệu và xây dựng workflow.
- Trình bày về Amazon CloudFront như nền tảng phân phối nội dung cho mọi loại workload.
- Chia sẻ hành trình xây dựng sản phẩm trong 36 giờ hackathon và các bài học thực chiến.
- Phân tích sâu về tính không xác định (non-determinism) của LLM và kiến trúc hệ thống multi-agent trong doanh nghiệp.

### Key Highlights

**Context Is Everything: Making AI Actually Work for You**
- Lý do vì sao AI hoạt động kém hiệu quả khi thiếu ngữ cảnh (context) phù hợp.
- Sự chuyển dịch từ prompt đơn thuần sang khái niệm "bộ nhớ" (Second AI Brain) trong ứng dụng AI.
- Cách xây dựng ngữ cảnh tốt hơn để cải thiện chất lượng kết quả đầu ra của AI.
- Chia sẻ định hướng nghề nghiệp cho sinh viên muốn bắt đầu xây dựng sản phẩm với AI.

**Friendly AI Assistant with Amazon Quick**
- Quick Chat Agent: trợ lý AI hỗ trợ khai thác và phân tích dữ liệu.
- Quick Flows: xây dựng workflow thông minh bằng ngôn ngữ tự nhiên, không cần viết code.
- Quick Spaces: không gian làm việc chung, chuyển hóa hiểu biết cá nhân thành tri thức của cả đội.
- Quick Sight: tạo dashboard và báo cáo từ dữ liệu thô bằng ngôn ngữ tự nhiên.

**From Edge To Origin: CloudFront as Your Foundation**
- Amazon CloudFront có thể phục vụ cho nhiều loại workload khác nhau.
- Tối ưu chi phí và nâng cao hiệu năng khi sử dụng CloudFront.
- Các khả năng bảo mật và độ tin cậy được tăng cường khi triển khai CloudFront làm nền tảng phân phối nội dung.

**36 hrs with LotusHacks – Building UTMorpho from Idea to Reality**
- Lý do tham gia LotusHacks và hành trình từ ý tưởng ban đầu đến khi định hình sản phẩm UTMorpho.
- Quá trình phát triển sản phẩm dưới áp lực thời gian trong 36 giờ.
- Những khó khăn, thất bại và bước ngoặt trong quá trình xây dựng sản phẩm.
- Demo tổng quan sản phẩm UTMorpho và các bài học rút ra sau cuộc thi.

**Non-Determinism of "Deterministic" LLM Settings**
- Cách LLM lựa chọn token tiếp theo trong quá trình sinh văn bản.
- Giả định phổ biến rằng thiết lập Temperature = 0 sẽ đảm bảo tính xác định (determinism).
- Thực tế cho thấy các kỹ thuật tối ưu suy luận (inference optimization) có thể phá vỡ giả định này.
- Tác động thực tế và các chiến lược giảm thiểu rủi ro khi xây dựng ứng dụng dựa trên LLM.

**Enterprise-Grade Multi-Agent System: The Case of Startup Credit Scoring**
- Sự không tương thích giữa hệ thống ngân hàng truyền thống và dữ liệu của các startup.
- Khi nào nên và không nên sử dụng kiến trúc single-agent.
- Giới thiệu mô hình multi-agent và bản thiết kế "hội đồng tín dụng ảo" (Virtual Credit Committee).
- Các yếu tố về guardrail, tuân thủ (compliance), ROI vận hành và lộ trình triển khai thực tế.

### Key Takeaways
- **Context là trung tâm của AI hiệu quả:** Chất lượng ngữ cảnh cung cấp cho AI quan trọng hơn việc chỉ tối ưu prompt.
- **AI assistant không cần code:** Các công cụ như Amazon Quick đang giúp người dùng không chuyên kỹ thuật có thể tự xây dựng workflow và báo cáo bằng ngôn ngữ tự nhiên.
- **Hạ tầng edge vẫn là nền tảng quan trọng:** CloudFront tiếp tục đóng vai trò cốt lõi trong việc tối ưu chi phí, bảo mật và hiệu năng cho nhiều loại ứng dụng.
- **LLM không hoàn toàn xác định:** Ngay cả khi Temperature = 0, kết quả của LLM vẫn có thể thay đổi do các tối ưu ở tầng inference — cần có chiến lược kiểm soát phù hợp khi xây dựng ứng dụng production.
- **Multi-agent cho bài toán phức tạp:** Kiến trúc nhiều agent phối hợp phù hợp với các bài toán nghiệp vụ phức tạp như chấm điểm tín dụng, nơi cần nhiều góc nhìn và bước xử lý khác nhau.

### Applying to Work
- Áp dụng tư duy xây dựng ngữ cảnh (context engineering) khi thiết kế prompt cho các bài lab/dự án sử dụng AI trong chương trình FCJ.
- Thử nghiệm Amazon Quick để xây dựng nhanh các workflow hoặc dashboard phân tích dữ liệu cho dự án thực tế.
- Tham khảo kiến trúc CloudFront khi tối ưu hiệu năng và bảo mật cho ứng dụng web được triển khai trong khóa học.
- Ghi nhớ vấn đề non-determinism của LLM khi xây dựng các tính năng AI trong dự án, để có phương án kiểm thử và xử lý phù hợp.

### Event Experience
Buổi FCAJ Community Day lần này mang đến rất nhiều góc nhìn thực tế, từ cách xây dựng ngữ cảnh cho AI, tối ưu hạ tầng edge, cho đến kiến trúc multi-agent trong doanh nghiệp. Một số trải nghiệm đáng nhớ:

- Hiểu rõ hơn về tầm quan trọng của "context" trong việc giúp AI trả lời chính xác và hữu ích hơn, thay vì chỉ tập trung vào việc viết prompt.
- Được tìm hiểu trực tiếp các tính năng mới của Amazon Quick qua phần trình bày và demo.
- Lắng nghe câu chuyện thực tế từ đội thi LotusHacks giúp hiểu rõ hơn áp lực và bài học khi xây dựng sản phẩm trong thời gian ngắn.
- Phần chia sẻ về tính không xác định của LLM là một góc nhìn kỹ thuật sâu, giúp mình cẩn trọng hơn khi thiết kế các ứng dụng dựa trên AI cho môi trường production.
- Có cơ hội trao đổi với diễn giả và cộng đồng về cách triển khai hệ thống multi-agent cho bài toán doanh nghiệp thực tế.

### Some event photos
*(Thêm ảnh sự kiện tại đây)*

Nhìn chung, sự kiện đã giúp mình mở rộng kiến thức không chỉ về công cụ AI mới của AWS mà còn về cách tư duy thiết kế hệ thống AI đáng tin cậy, có kiểm soát trong môi trường doanh nghiệp.
