# SES Lambda Mailer

Deploy this Lambda in AWS and connect it to API Gateway or Lambda Function URL.

## 1) Install dependencies

```bash
npm install
```

## 2) Configure Lambda environment variables

- `AWS_REGION=ap-south-1`
- `SES_FROM_EMAIL=noreply@yourdomain.com`
- `SES_LAMBDA_API_KEY=<strong-random-shared-secret>`

## 3) IAM permissions

Lambda execution role must allow:

- `ses:SendEmail`

## 4) Expose endpoint

Use either:
- Lambda Function URL, or
- API Gateway HTTP API.

## 5) Backend integration env

Set these in `cosmetic-ecomm-backend`:

- `SES_LAMBDA_URL=<your_lambda_endpoint>`
- `SES_LAMBDA_API_KEY=<same-shared-secret>`

Then backend calls Lambda for order confirmation/invoice and other transactional emails.
