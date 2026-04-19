package email

import (
	"bytes"
	"fmt"
	"net/smtp"
	"text/template"
	"time"

	"ecommerce-backend/internal/models"
)

// EmailConfig holds SMTP configuration
type EmailConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	FromAddr string
}

// EmailRecipient represents email recipient
type EmailRecipient struct {
	Email string
	Name  string
}

// EmailData represents email template data
type EmailData map[string]interface{}

// EmailTemplate represents an email template
type EmailTemplate struct {
	Name    string
	Subject string
	Body    string
}

// EmailSender defines email sending interface
type EmailSender interface {
	SendOrderConfirmation(recipient EmailRecipient, order *models.Order) error
	SendPaymentConfirmation(recipient EmailRecipient, order *models.Order) error
	SendOrderStatusUpdate(recipient EmailRecipient, order *models.Order, newStatus string) error
	SendNewsletter(recipient EmailRecipient, subject, content string) error
	SendPasswordReset(recipient EmailRecipient, resetLink string) error
	SendEmailVerification(recipient EmailRecipient, verificationLink string) error
}

// EmailService implements email sending functionality
type EmailService struct {
	config    EmailConfig
	templates map[string]*template.Template
}

// NewEmailService creates a new email service
func NewEmailService(config EmailConfig) (*EmailService, error) {
	svc := &EmailService{
		config:    config,
		templates: make(map[string]*template.Template),
	}

	// Initialize templates
	if err := svc.initializeTemplates(); err != nil {
		return nil, fmt.Errorf("failed to initialize email templates: %w", err)
	}

	return svc, nil
}

// initializeTemplates loads email templates
func (s *EmailService) initializeTemplates() error {
	// Order Confirmation Template
	orderConfirmTpl, err := template.New("order_confirmation").Parse(orderConfirmationTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse order confirmation template: %w", err)
	}
	s.templates["order_confirmation"] = orderConfirmTpl

	// Payment Confirmation Template
	paymentConfirmTpl, err := template.New("payment_confirmation").Parse(paymentConfirmationTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse payment confirmation template: %w", err)
	}
	s.templates["payment_confirmation"] = paymentConfirmTpl

	// Order Status Update Template
	statusUpdateTpl, err := template.New("order_status_update").Parse(orderStatusUpdateTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse order status update template: %w", err)
	}
	s.templates["order_status_update"] = statusUpdateTpl

	// Password Reset Template
	resetTpl, err := template.New("password_reset").Parse(passwordResetTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse password reset template: %w", err)
	}
	s.templates["password_reset"] = resetTpl

	// Email Verification Template
	verifyTpl, err := template.New("email_verification").Parse(emailVerificationTemplate)
	if err != nil {
		return fmt.Errorf("failed to parse email verification template: %w", err)
	}
	s.templates["email_verification"] = verifyTpl

	return nil
}

// SendEmail sends an email with the specified template
func (s *EmailService) SendEmail(to EmailRecipient, subject, htmlBody string) error {
	// Skip sending if SMTP is not configured
	if s.config.Host == "" {
		fmt.Printf("[DEV MODE] Would send email to %s: %s\n", to.Email, subject)
		return nil
	}

	from := s.config.FromAddr
	if from == "" {
		from = s.config.Username
	}

	// Prepare email message
	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s",
		from,
		to.Email,
		subject,
		htmlBody,
	)

	// Create auth
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	// Send email
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	if err := smtp.SendMail(addr, auth, from, []string{to.Email}, []byte(msg)); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendOrderConfirmation sends order confirmation email
func (s *EmailService) SendOrderConfirmation(recipient EmailRecipient, order *models.Order) error {
	data := EmailData{
		"OrderID":      order.ID,
		"OrderNumber":  order.OrderNumber,
		"CustomerName": recipient.Name,
		"TotalAmount":  order.Total,
		"Status":       order.OrderStatus,
		"CreatedAt":    order.CreatedAt.Format("2006-01-02 15:04:05"),
		"Items":        order.Items,
	}

	htmlBody, err := s.renderTemplate("order_confirmation", data)
	if err != nil {
		return err
	}

	return s.SendEmail(recipient, "Order Confirmation - "+order.OrderNumber, htmlBody)
}

// SendPaymentConfirmation sends payment confirmation email
func (s *EmailService) SendPaymentConfirmation(recipient EmailRecipient, order *models.Order) error {
	data := EmailData{
		"OrderID":      order.ID,
		"OrderNumber":  order.OrderNumber,
		"CustomerName": recipient.Name,
		"TotalAmount":  order.Total,
		"Status":       order.PaymentStatus,
		"PaidAt":       time.Now().Format("2006-01-02 15:04:05"),
	}

	htmlBody, err := s.renderTemplate("payment_confirmation", data)
	if err != nil {
		return err
	}

	return s.SendEmail(recipient, "Payment Confirmed - "+order.OrderNumber, htmlBody)
}

// SendOrderStatusUpdate sends order status update email
func (s *EmailService) SendOrderStatusUpdate(recipient EmailRecipient, order *models.Order, newStatus string) error {
	statusMessages := map[string]string{
		"processing":        "Your order is being processed",
		"shipped":           "Your order has been shipped",
		"delivered":         "Your order has been delivered",
		"cancelled":         "Your order has been cancelled",
		"payment_confirmed": "Payment confirmed! Your order is confirmed",
	}

	statusMessage := statusMessages[newStatus]
	if statusMessage == "" {
		statusMessage = fmt.Sprintf("Status updated to: %s", newStatus)
	}

	data := EmailData{
		"OrderID":       order.ID,
		"OrderNumber":   order.OrderNumber,
		"CustomerName":  recipient.Name,
		"Status":        newStatus,
		"StatusMessage": statusMessage,
		"UpdatedAt":     time.Now().Format("2006-01-02 15:04:05"),
	}

	htmlBody, err := s.renderTemplate("order_status_update", data)
	if err != nil {
		return err
	}

	return s.SendEmail(recipient, "Order Status Update - "+order.OrderNumber, htmlBody)
}

// SendNewsletter sends newsletter email
func (s *EmailService) SendNewsletter(recipient EmailRecipient, subject, content string) error {
	return s.SendEmail(recipient, subject, content)
}

// SendPasswordReset sends password reset email
func (s *EmailService) SendPasswordReset(recipient EmailRecipient, resetLink string) error {
	data := EmailData{
		"CustomerName": recipient.Name,
		"ResetLink":    resetLink,
		"ExpiresIn":    "1 hour",
	}

	htmlBody, err := s.renderTemplate("password_reset", data)
	if err != nil {
		return err
	}

	return s.SendEmail(recipient, "Reset Your Password", htmlBody)
}

// SendEmailVerification sends email verification email with code
func (s *EmailService) SendEmailVerification(recipient interface{}, verificationCode string) error {
	emailRecipient, ok := recipient.(EmailRecipient)
	if !ok {
		return fmt.Errorf("invalid recipient type")
	}

	data := EmailData{
		"CustomerName":      emailRecipient.Name,
		"VerificationCode":  verificationCode,
		"ExpiresIn":         "24 hours",
	}

	htmlBody, err := s.renderTemplate("email_verification", data)
	if err != nil {
		return err
	}

	return s.SendEmail(emailRecipient, "Verify Your Email Address - "+verificationCode, htmlBody)
}

// renderTemplate renders email template with data
func (s *EmailService) renderTemplate(templateName string, data EmailData) (string, error) {
	tpl, exists := s.templates[templateName]
	if !exists {
		return "", fmt.Errorf("template not found: %s", templateName)
	}

	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to render template: %w", err)
	}

	return buf.String(), nil
}

// Email Templates
const (
	orderConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
        .order-details { margin: 20px 0; }
        .detail-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmation</h1>
        </div>
        <div class="content">
            <p>Dear {{.CustomerName}},</p>
            <p>Thank you for your order! We're excited to help you.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                <div class="detail-item">
                    <span>Order Number:</span>
                    <strong>{{.OrderNumber}}</strong>
                </div>
                <div class="detail-item">
                    <span>Order Date:</span>
                    <span>{{.CreatedAt}}</span>
                </div>
                <div class="detail-item">
                    <span>Total Amount:</span>
                    <strong>Rp {{.TotalAmount}}</strong>
                </div>
                <div class="detail-item">
                    <span>Status:</span>
                    <span style="color: #27ae60; font-weight: bold;">{{.Status}}</span>
                </div>
            </div>
            
            <p>We'll send you an email as soon as your order is shipped. If you have any questions, please don't hesitate to contact us.</p>
            
            <a href="#" class="button">Track Your Order</a>
        </div>
        <div class="footer">
            <p>&copy; 2024 E-Commerce. All rights reserved.</p>
            <p>This email was sent to {{.Email}}</p>
        </div>
    </div>
</body>
</html>
`

	paymentConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
        .success-badge { display: inline-block; padding: 10px 20px; background-color: #27ae60; color: white; border-radius: 4px; margin: 10px 0; }
        .detail-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Payment Confirmed</h1>
        </div>
        <div class="content">
            <p>Dear {{.CustomerName}},</p>
            <p>Your payment has been successfully received!</p>
            
            <div class="success-badge">Payment Confirmed</div>
            
            <h3>Payment Details</h3>
            <div class="detail-item">
                <span>Order Number:</span>
                <strong>{{.OrderNumber}}</strong>
            </div>
            <div class="detail-item">
                <span>Amount Paid:</span>
                <strong>Rp {{.TotalAmount}}</strong>
            </div>
            <div class="detail-item">
                <span>Confirmation Date:</span>
                <span>{{.PaidAt}}</span>
            </div>
            
            <p>Your order is now confirmed and will be processed shortly. You'll receive a shipping notification as soon as your items are dispatched.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 E-Commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	orderStatusUpdateTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
        .status-badge { display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; border-radius: 4px; margin: 10px 0; }
        .detail-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Status Update</h1>
        </div>
        <div class="content">
            <p>Dear {{.CustomerName}},</p>
            <p>{{.StatusMessage}}</p>
            
            <div class="status-badge">{{.Status}}</div>
            
            <h3>Order Information</h3>
            <div class="detail-item">
                <span>Order Number:</span>
                <strong>{{.OrderNumber}}</strong>
            </div>
            <div class="detail-item">
                <span>Status Updated:</span>
                <span>{{.UpdatedAt}}</span>
            </div>
            
            <p>Thank you for your patience. For more details about your order, you can track it from your account.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 E-Commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	passwordResetTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 10px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <p>Dear {{.CustomerName}},</p>
            <p>We received a request to reset your password. Click the button below to set a new password.</p>
            
            <a href="{{.ResetLink}}" class="button">Reset Password</a>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This link will expire in {{.ExpiresIn}}. If you didn't request a password reset, please ignore this email.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">{{.ResetLink}}</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 E-Commerce. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	emailVerificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .code-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to E-Commerce!</h1>
            <p>Verify your email address</p>
        </div>
        <div class="content">
            <p>Dear {{.CustomerName}},</p>
            <p>Thank you for registering with us! To complete your registration and activate your account, please verify your email address using the code below:</p>
            
            <div class="code-box">
                <div class="code">{{.VerificationCode}}</div>
            </div>
            
            <p>Enter this 6-digit code on the verification page to confirm your email address.</p>
            <p><strong>This code expires in {{.ExpiresIn}}.</strong></p>
            
            <p>If you didn't create this account, you can safely ignore this email.</p>
            
            <div class="footer">
                <p>© 2026 E-Commerce Platform. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>
`
)

