---
title: "Blog 3"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.3. </b> "
---
## Identity Management and Application Security with Amazon Cognito: Don't Reinvent the Wheel

### Why Use Amazon Cognito?

In traditional applications, building user registration, authentication, password encryption, authorization, and session management from scratch requires significant development effort and often introduces serious security risks, such as password database leaks.

For the **Cloud-based Office Rental Management System**, I decided to delegate the entire identity management and authentication process to **Amazon Cognito**. This approach not only reduced development time but also provided enterprise-grade security from the very beginning.

### How It Works

The system leverages Amazon Cognito together with other AWS security services in three key areas:

#### 1. Role-Based Access Control with Cognito Groups

The application supports four primary user roles:

- Administrator
- Building Manager
- Tenant
- Technician

Instead of maintaining complex role mappings inside the application database, I created four corresponding **Cognito User Pool Groups**.

When users authenticate successfully, the generated **JSON Web Token (JWT)** already contains their role information. The Node.js backend simply validates and decodes the JWT token to determine the user's access permissions.

#### 2. API Protection with Amazon Cognito Authorizer

**Amazon API Gateway** is directly integrated with **Amazon Cognito Authorizer**.

Every request to serverless APIs—such as payment processing services—is authenticated by API Gateway before reaching the backend Lambda functions.

If a token is invalid or expired, API Gateway immediately rejects the request with an HTTP **401 Unauthorized** or **403 Forbidden** response, preventing unauthorized access to backend resources.

#### 3. Applying the Principle of Least Privilege

Authenticating users alone is not sufficient—system components also require proper authorization.

Separate **AWS IAM Roles** were assigned to Amazon EC2, AWS Lambda, and AWS CodeBuild.

Each IAM Role is granted only the permissions required to access specific AWS resources, such as designated Amazon S3 buckets or Amazon DynamoDB tables. This implementation follows the **Principle of Least Privilege**, minimizing the potential impact if any system component is compromised.

### Common Misconceptions

- **Amazon Cognito handles all application authorization logic.**

  This is not entirely true.

  Amazon Cognito performs **authentication** and identifies which user group a user belongs to. However, application-specific authorization—such as determining whether a tenant can access another tenant's invoices—must still be implemented within the backend application based on the authenticated user's identity.

- **Using Cognito means APIs no longer require additional protection.**

  Cognito Authorizer blocks requests from unauthenticated users, but it does not protect applications from attacks such as **Distributed Denial of Service (DDoS)**, **SQL Injection**, or **Cross-Site Scripting (XSS)** originating from authenticated users.

  Therefore, deploying **AWS WAF** in front of **Amazon CloudFront** and **Application Load Balancer (ALB)** remains an essential security best practice.

- **JWT tokens never expire.**

  JWT access tokens have a limited lifetime, typically around **one hour**.

  Without implementing a proper **Refresh Token** mechanism on the frontend, users will be forced to log in repeatedly after token expiration, resulting in a poor user experience.

### Lessons Learned During Security Testing

While implementing the authentication and authorization system, several practical lessons emerged:

- Configuring a strong password policy in Amazon Cognito from the beginning—including uppercase letters, lowercase letters, numbers, and special characters—is essential for mitigating brute-force attacks.

- Sensitive Access Tokens should be stored securely on the frontend. Using **HttpOnly Cookies** is strongly recommended to reduce the risk of session theft through Cross-Site Scripting (XSS) attacks.

- Authorization testing demonstrated the importance of backend middleware. For example, when a Tenant account intentionally attempted to invoke Administrator APIs (such as building management endpoints), the backend correctly returned an HTTP **403 Forbidden** response, confirming that role-based access control was functioning as designed.

### Conclusion

In the cloud computing era, leveraging managed services such as **Amazon Cognito** is a smart architectural decision.

It enables applications to meet modern security standards while eliminating the need to reinvent common authentication and identity management features. As a result, developers can focus their time and effort on building the application's core business logic instead of maintaining complex security infrastructure.

...Image...

![Secure Authentication and Authorization with Amazon Cognito](/images/3-BlogsPosted/BLOG3.png)

...Link...

...Guide...