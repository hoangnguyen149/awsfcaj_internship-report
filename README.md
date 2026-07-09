# FCJ Workshop Template

Template dùng để tạo workshop cho **First Cloud Journey (FCJ)** dựa trên [Hugo](https://gohugo.io/) và theme [hugo-theme-learn](https://github.com/matcornic/hugo-theme-learn).

## Xem demo

🌐 [workshop-sample.fcjuni.com](http://workshop-sample.fcjuni.com/)

---

## Yêu cầu cài đặt

| Công cụ | Phiên bản | Cài đặt |
|---------|-----------|---------|
| Hugo | v0.111.3+ (extended) | [Hướng dẫn](a/) |
| Git | Latest | [Hướng dẫn](https://git-scm.com/) |

---

## Chạy local (Development)

### Bước 1: Clone repository

```bash
git clone --recurse-submodules https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

> Nếu đã clone rồi nhưng chưa có theme, chạy:
> ```bash
> git submodule update --init --recursive
> ```

### Bước 2: Chạy development server

```bash
hugo server -D -p 8080
```

Mở trình duyệt và truy cập: **http://localhost:8080**

### Tùy chọn hữu ích khi chạy

```bash
# Chạy với hot-reload và hiện draft
hugo server -D

# Chạy trên cổng khác
hugo server -D -p 8080

# Chạy và cho phép truy cập từ máy khác trong mạng LAN
hugo server -D --bind 0.0.0.0
```

### Bước 3: Build production

```bash
hugo --minify
```

Output sẽ nằm trong thư mục `public/`.

---

## Cấu trúc thư mục

```
fcj-workshop-template/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD tự động deploy lên GitHub Pages
├── archetypes/
│   └── default.md              # Template cho trang mới
├── content/                    # ⭐ Nội dung workshop (chỉnh sửa ở đây)
│   ├── _index.vi.md            # Trang chủ (Tiếng Việt)
│   ├── _index.en.md            # Trang chủ (English)
│   ├── 1-introduce/            # Phần 1: Giới thiệu
│   ├── 2-prerequisite/         # Phần 2: Điều kiện cần thiết
│   ├── 3-content/              # Phần 3: Nội dung chính
│   │   ├── 3.1-step1/
│   │   └── 3.2-step2/
│   └── 4-cleanup/              # Phần 4: Dọn dẹp tài nguyên
├── static/
│   ├── css/
│   │   └── theme-workshop.css  # CSS tùy chỉnh màu sắc FCJ
│   └── images/                 # Hình ảnh (screenshot, diagram)
├── themes/
│   └── hugo-theme-learn/       # Git submodule - theme chính
├── .gitmodules
├── .gitignore
└── config.toml                 # ⭐ Cấu hình chính
```

---

## Hướng dẫn chỉnh sửa nội dung

### Đổi tiêu đề workshop

Mở `config.toml`, tìm và thay đổi:

```toml
[Languages.vi]
  title = "Chương trình AWS First Cloud Journey"

[Languages.en]
  title = "AWS First Cloud Journey Program"
```

### Thêm trang mới

```bash
# Tạo trang cho bước 3.3
hugo new content/3-content/3.3-step3/_index.vi.md
hugo new content/3-content/3.3-step3/_index.en.md
```

### Front matter của mỗi trang

```yaml
---
title: "Tiêu đề trang"
date: 2024-01-01
chapter: false
pre: "<b>3.1 </b>"   # Số thứ tự hiển thị ở menu
weight: 1             # Thứ tự sắp xếp (số nhỏ = lên trên)
---
```

### Các notice box

```markdown
{{% notice tip %}}
Mẹo hữu ích
{{% /notice %}}

{{% notice warning %}}
Cảnh báo quan trọng
{{% /notice %}}

{{% notice info %}}
Thông tin thêm
{{% /notice %}}
```

---

## Deploy lên GitHub Pages

### Cách 1: Tự động với GitHub Actions

1. Push code lên branch `main`
2. GitHub Actions sẽ tự động build và deploy
3. Vào **Settings** → **Pages** → chọn branch `gh-pages`

### Cách 2: Thủ công

```bash
hugo --minify
# Upload thư mục public/ lên server của bạn
```

---

## Thay đổi màu sắc theme

Chỉnh file `static/css/theme-workshop.css`:

```css
:root {
  --MAIN-TITLES-TEXT-color: #FF6600;  /* Màu tiêu đề - mặc định cam AWS */
  --MAIN-LINK-color: #FF6600;          /* Màu link */
  --MENU-HEADER-BG-color: #232F3E;    /* Màu nền sidebar - đen AWS */
}
```

---

## Troubleshooting

### Lỗi: `Error: module "hugo-theme-learn" not found`

```bash
git submodule update --init --recursive
```

### Lỗi: `hugo: command not found`

Cài Hugo theo hướng dẫn: https://gohugo.io/installation/

**macOS:**
```bash
brew install hugo
```

**Windows:**
```bash
winget install Hugo.Hugo.Extended
```

**Ubuntu/Debian:**
```bash
sudo apt install hugo
# Hoặc tải binary từ https://github.com/gohugoio/hugo/releases
```

### Theme không load đúng

Kiểm tra `config.toml` có dòng:
```toml
theme = "hugo-theme-learn"
```

---

## Liên kết hữu ích

- 📘 [Hugo Documentation](https://gohugo.io/documentation/)
- 🎨 [Hugo Learn Theme](https://learn.netlify.app/en/)
- ☁️ [AWS Study Group](https://awsstudygroup.com)
- 👥 [FCJ Facebook Group](https://www.facebook.com/groups/awsstudygroupfcj)
