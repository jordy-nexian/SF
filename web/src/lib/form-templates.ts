/**
 * Pre-built form templates for common use cases.
 * Users can start from these instead of blank JSON.
 */

import type { FormSchema } from "@/types/form-schema";

export type FormTemplate = {
	id: string;
	name: string;
	description: string;
	category: "general" | "business" | "events" | "feedback" | "support";
	schema: FormSchema;
};

export const formTemplates: FormTemplate[] = [
	// ─────────────────────────────────────────────────────────────
	// GENERAL
	// ─────────────────────────────────────────────────────────────
	{
		id: "contact",
		name: "Contact Form",
		description: "Simple contact form with name, email, and message",
		category: "general",
		schema: {
			id: "contact",
			version: 1,
			title: "Contact Us",
			description: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
			fields: [
				{ key: "name", type: "text", label: "Full Name", required: true },
				{ key: "email", type: "email", label: "Email Address", required: true },
				{ key: "phone", type: "text", label: "Phone Number", helpText: "Optional" },
				{
					key: "subject",
					type: "select",
					label: "Subject",
					required: true,
					options: [
						{ value: "general", label: "General Inquiry" },
						{ value: "support", label: "Support Request" },
						{ value: "sales", label: "Sales Question" },
						{ value: "partnership", label: "Partnership Opportunity" },
					],
				},
				{ key: "message", type: "textarea", label: "Message", required: true, validation: { minLength: 10 } },
			],
		},
	},
	{
		id: "newsletter",
		name: "Newsletter Signup",
		description: "Email subscription form with preferences",
		category: "general",
		schema: {
			id: "newsletter",
			version: 1,
			title: "Subscribe to Our Newsletter",
			description: "Stay updated with our latest news and offers.",
			fields: [
				{ key: "email", type: "email", label: "Email Address", required: true },
				{ key: "firstName", type: "text", label: "First Name" },
				{
					key: "interests",
					type: "checkboxGroup",
					label: "I'm interested in",
					options: [
						{ value: "product", label: "Product Updates" },
						{ value: "tips", label: "Tips & Tutorials" },
						{ value: "news", label: "Company News" },
						{ value: "offers", label: "Special Offers" },
					],
				},
				{
					key: "frequency",
					type: "radio",
					label: "Email Frequency",
					options: [
						{ value: "daily", label: "Daily Digest" },
						{ value: "weekly", label: "Weekly Summary" },
						{ value: "monthly", label: "Monthly Roundup" },
					],
				},
				{ key: "consent", type: "boolean", label: "I agree to receive marketing emails", required: true },
			],
		},
	},

	// ─────────────────────────────────────────────────────────────
	// BUSINESS
	// ─────────────────────────────────────────────────────────────
	{
		id: "lead-capture",
		name: "Lead Capture",
		description: "Multi-step lead generation form for B2B",
		category: "business",
		schema: {
			id: "lead-capture",
			version: 1,
			title: "Get a Free Quote",
			description: "Tell us about your project and we'll get back to you within 24 hours.",
			steps: [
				{ id: "contact", title: "Your Details", fields: ["firstName", "lastName", "email", "phone", "company"] },
				{ id: "project", title: "Project Info", fields: ["projectType", "budget", "timeline", "description"] },
				{ id: "confirm", title: "Confirm", fields: ["howHeard", "consent"] },
			],
			fields: [
				{ key: "firstName", type: "text", label: "First Name", required: true },
				{ key: "lastName", type: "text", label: "Last Name", required: true },
				{ key: "email", type: "email", label: "Work Email", required: true },
				{ key: "phone", type: "text", label: "Phone Number" },
				{ key: "company", type: "text", label: "Company Name", required: true },
				{
					key: "projectType",
					type: "select",
					label: "Project Type",
					required: true,
					options: [
						{ value: "new", label: "New Project" },
						{ value: "redesign", label: "Redesign/Upgrade" },
						{ value: "consulting", label: "Consulting" },
						{ value: "other", label: "Other" },
					],
				},
				{
					key: "budget",
					type: "radio",
					label: "Budget Range",
					required: true,
					options: [
						{ value: "5k", label: "Under $5,000" },
						{ value: "10k", label: "$5,000 - $10,000" },
						{ value: "25k", label: "$10,000 - $25,000" },
						{ value: "50k", label: "$25,000 - $50,000" },
						{ value: "50k+", label: "Over $50,000" },
					],
				},
				{
					key: "timeline",
					type: "select",
					label: "Timeline",
					options: [
						{ value: "asap", label: "As soon as possible" },
						{ value: "1month", label: "Within 1 month" },
						{ value: "3months", label: "1-3 months" },
						{ value: "6months", label: "3-6 months" },
						{ value: "flexible", label: "Flexible" },
					],
				},
				{ key: "description", type: "textarea", label: "Project Description", helpText: "Tell us more about what you need" },
				{
					key: "howHeard",
					type: "select",
					label: "How did you hear about us?",
					options: [
						{ value: "google", label: "Google Search" },
						{ value: "social", label: "Social Media" },
						{ value: "referral", label: "Referral" },
						{ value: "ad", label: "Advertisement" },
						{ value: "other", label: "Other" },
					],
				},
				{ key: "consent", type: "boolean", label: "I agree to be contacted about this inquiry", required: true },
			],
		},
	},
	{
		id: "job-application",
		name: "Job Application",
		description: "Employment application with work history",
		category: "business",
		schema: {
			id: "job-application",
			version: 1,
			title: "Job Application",
			description: "Apply for a position at our company.",
			steps: [
				{ id: "personal", title: "Personal Info", fields: ["fullName", "email", "phone", "location"] },
				{ id: "experience", title: "Experience", fields: ["currentRole", "yearsExperience", "workHistory"] },
				{ id: "additional", title: "Additional", fields: ["coverLetter", "availability", "salary", "referral"] },
			],
			fields: [
				{ key: "fullName", type: "text", label: "Full Name", required: true },
				{ key: "email", type: "email", label: "Email Address", required: true },
				{ key: "phone", type: "text", label: "Phone Number", required: true },
				{ key: "location", type: "text", label: "City, Country" },
				{ key: "currentRole", type: "text", label: "Current/Most Recent Job Title" },
				{
					key: "yearsExperience",
					type: "select",
					label: "Years of Experience",
					required: true,
					options: [
						{ value: "0-1", label: "0-1 years" },
						{ value: "2-4", label: "2-4 years" },
						{ value: "5-9", label: "5-9 years" },
						{ value: "10+", label: "10+ years" },
					],
				},
				{
					key: "workHistory",
					type: "repeatable",
					label: "Work History",
					helpText: "Add your previous positions",
					itemFields: [
						{ key: "company", type: "text", label: "Company", required: true },
						{ key: "title", type: "text", label: "Job Title", required: true },
						{ key: "duration", type: "text", label: "Duration (e.g., 2020-2023)" },
					],
				},
				{ key: "coverLetter", type: "textarea", label: "Cover Letter", helpText: "Tell us why you're a great fit" },
				{ key: "availability", type: "date", label: "Available Start Date" },
				{ key: "salary", type: "text", label: "Salary Expectations" },
				{ key: "referral", type: "text", label: "How did you hear about this position?" },
			],
		},
	},

	// ─────────────────────────────────────────────────────────────
	// EVENTS
	// ─────────────────────────────────────────────────────────────
	{
		id: "event-registration",
		name: "Event Registration",
		description: "Registration form for conferences, workshops, or meetups",
		category: "events",
		schema: {
			id: "event-registration",
			version: 1,
			title: "Event Registration",
			description: "Register for our upcoming event.",
			fields: [
				{ key: "firstName", type: "text", label: "First Name", required: true },
				{ key: "lastName", type: "text", label: "Last Name", required: true },
				{ key: "email", type: "email", label: "Email Address", required: true },
				{ key: "company", type: "text", label: "Company/Organization" },
				{ key: "jobTitle", type: "text", label: "Job Title" },
				{
					key: "ticketType",
					type: "radio",
					label: "Ticket Type",
					required: true,
					options: [
						{ value: "general", label: "General Admission" },
						{ value: "vip", label: "VIP Access" },
						{ value: "virtual", label: "Virtual Attendance" },
					],
				},
				{
					key: "sessions",
					type: "checkboxGroup",
					label: "Which sessions are you interested in?",
					options: [
						{ value: "keynote", label: "Opening Keynote" },
						{ value: "workshop1", label: "Workshop: Getting Started" },
						{ value: "workshop2", label: "Workshop: Advanced Topics" },
						{ value: "networking", label: "Networking Session" },
						{ value: "closing", label: "Closing Ceremony" },
					],
				},
				{
					key: "dietary",
					type: "select",
					label: "Dietary Requirements",
					options: [
						{ value: "none", label: "No restrictions" },
						{ value: "vegetarian", label: "Vegetarian" },
						{ value: "vegan", label: "Vegan" },
						{ value: "gluten-free", label: "Gluten-free" },
						{ value: "other", label: "Other (please specify)" },
					],
				},
				{
					key: "dietaryOther",
					type: "text",
					label: "Other dietary requirements",
					visibilityCondition: { field: "dietary", operator: "equals", value: "other" },
				},
				{ key: "specialRequests", type: "textarea", label: "Special Requests or Accessibility Needs" },
			],
		},
	},
	{
		id: "rsvp",
		name: "RSVP",
		description: "Simple event RSVP with guest count",
		category: "events",
		schema: {
			id: "rsvp",
			version: 1,
			title: "RSVP",
			description: "Please let us know if you can attend.",
			fields: [
				{ key: "name", type: "text", label: "Your Name", required: true },
				{ key: "email", type: "email", label: "Email Address", required: true },
				{
					key: "attending",
					type: "radio",
					label: "Will you be attending?",
					required: true,
					options: [
						{ value: "yes", label: "Yes, I'll be there!" },
						{ value: "no", label: "Sorry, I can't make it" },
						{ value: "maybe", label: "Maybe, I'll confirm later" },
					],
				},
				{
					key: "guests",
					type: "number",
					label: "Number of guests (including yourself)",
					visibilityCondition: { field: "attending", operator: "equals", value: "yes" },
					validation: { min: 1, max: 10 },
				},
				{
					key: "guestNames",
					type: "textarea",
					label: "Guest names",
					helpText: "Please list the names of your guests",
					visibilityCondition: { field: "guests", operator: "greater_than", value: 1 },
				},
				{ key: "message", type: "textarea", label: "Message for the host" },
			],
		},
	},

	// ─────────────────────────────────────────────────────────────
	// FEEDBACK
	// ─────────────────────────────────────────────────────────────
	{
		id: "customer-feedback",
		name: "Customer Feedback",
		description: "Collect customer satisfaction and feedback",
		category: "feedback",
		schema: {
			id: "customer-feedback",
			version: 1,
			title: "Customer Feedback",
			description: "Help us improve by sharing your experience.",
			fields: [
				{ key: "email", type: "email", label: "Email Address (optional)", helpText: "If you'd like us to follow up" },
				{
					key: "satisfaction",
					type: "radio",
					label: "Overall, how satisfied are you with our service?",
					required: true,
					options: [
						{ value: "5", label: "Very Satisfied" },
						{ value: "4", label: "Satisfied" },
						{ value: "3", label: "Neutral" },
						{ value: "2", label: "Dissatisfied" },
						{ value: "1", label: "Very Dissatisfied" },
					],
				},
				{
					key: "recommend",
					type: "radio",
					label: "How likely are you to recommend us to others?",
					required: true,
					options: [
						{ value: "10", label: "10 - Extremely likely" },
						{ value: "9", label: "9" },
						{ value: "8", label: "8" },
						{ value: "7", label: "7" },
						{ value: "6", label: "6" },
						{ value: "5", label: "5 - Neutral" },
						{ value: "4", label: "4" },
						{ value: "3", label: "3" },
						{ value: "2", label: "2" },
						{ value: "1", label: "1" },
						{ value: "0", label: "0 - Not at all likely" },
					],
				},
				{
					key: "whatWentWell",
					type: "textarea",
					label: "What did we do well?",
				},
				{
					key: "improvements",
					type: "textarea",
					label: "What could we improve?",
				},
				{ key: "additionalComments", type: "textarea", label: "Any additional comments?" },
			],
		},
	},
	{
		id: "product-review",
		name: "Product Review",
		description: "Collect product ratings and reviews",
		category: "feedback",
		schema: {
			id: "product-review",
			version: 1,
			title: "Product Review",
			description: "Share your thoughts on our product.",
			fields: [
				{ key: "productName", type: "text", label: "Product Name", required: true },
				{ key: "purchaseDate", type: "date", label: "Purchase Date" },
				{
					key: "rating",
					type: "radio",
					label: "Overall Rating",
					required: true,
					options: [
						{ value: "5", label: "★★★★★ Excellent" },
						{ value: "4", label: "★★★★☆ Good" },
						{ value: "3", label: "★★★☆☆ Average" },
						{ value: "2", label: "★★☆☆☆ Poor" },
						{ value: "1", label: "★☆☆☆☆ Terrible" },
					],
				},
				{ key: "title", type: "text", label: "Review Title", required: true, validation: { maxLength: 100 } },
				{ key: "review", type: "textarea", label: "Your Review", required: true, validation: { minLength: 50 } },
				{
					key: "pros",
					type: "textarea",
					label: "Pros",
					helpText: "What did you like?",
				},
				{
					key: "cons",
					type: "textarea",
					label: "Cons",
					helpText: "What could be improved?",
				},
				{ key: "wouldRecommend", type: "boolean", label: "I would recommend this product" },
				{ key: "name", type: "text", label: "Your Name (for display)" },
			],
		},
	},

	// ─────────────────────────────────────────────────────────────
	// SUPPORT
	// ─────────────────────────────────────────────────────────────
	{
		id: "support-ticket",
		name: "Support Ticket",
		description: "Technical support request form",
		category: "support",
		schema: {
			id: "support-ticket",
			version: 1,
			title: "Support Request",
			description: "Submit a support ticket and we'll get back to you as soon as possible.",
			fields: [
				{ key: "name", type: "text", label: "Your Name", required: true },
				{ key: "email", type: "email", label: "Email Address", required: true },
				{ key: "accountId", type: "text", label: "Account ID / Order Number", helpText: "If applicable" },
				{
					key: "category",
					type: "select",
					label: "Category",
					required: true,
					options: [
						{ value: "technical", label: "Technical Issue" },
						{ value: "billing", label: "Billing Question" },
						{ value: "account", label: "Account Access" },
						{ value: "feature", label: "Feature Request" },
						{ value: "other", label: "Other" },
					],
				},
				{
					key: "priority",
					type: "radio",
					label: "Priority",
					required: true,
					options: [
						{ value: "low", label: "Low - General question" },
						{ value: "medium", label: "Medium - Issue affecting work" },
						{ value: "high", label: "High - Urgent, blocking issue" },
						{ value: "critical", label: "Critical - System down" },
					],
				},
				{ key: "subject", type: "text", label: "Subject", required: true },
				{
					key: "description",
					type: "textarea",
					label: "Description",
					required: true,
					helpText: "Please describe the issue in detail. Include steps to reproduce if applicable.",
					validation: { minLength: 20 },
				},
				{
					key: "browser",
					type: "select",
					label: "Browser (if technical issue)",
					visibilityCondition: { field: "category", operator: "equals", value: "technical" },
					options: [
						{ value: "chrome", label: "Google Chrome" },
						{ value: "firefox", label: "Mozilla Firefox" },
						{ value: "safari", label: "Safari" },
						{ value: "edge", label: "Microsoft Edge" },
						{ value: "other", label: "Other" },
					],
				},
				{
					key: "os",
					type: "select",
					label: "Operating System",
					visibilityCondition: { field: "category", operator: "equals", value: "technical" },
					options: [
						{ value: "windows", label: "Windows" },
						{ value: "mac", label: "macOS" },
						{ value: "linux", label: "Linux" },
						{ value: "ios", label: "iOS" },
						{ value: "android", label: "Android" },
						{ value: "other", label: "Other" },
					],
				},
			],
		},
	},
	{
		id: "bug-report",
		name: "Bug Report",
		description: "Detailed bug report form for software issues",
		category: "support",
		schema: {
			id: "bug-report",
			version: 1,
			title: "Bug Report",
			description: "Help us fix issues by providing detailed bug reports.",
			steps: [
				{ id: "issue", title: "Issue Details", fields: ["title", "severity", "component"] },
				{ id: "reproduce", title: "How to Reproduce", fields: ["stepsToReproduce", "expectedBehavior", "actualBehavior"] },
				{ id: "environment", title: "Environment", fields: ["browser", "os", "version", "additionalInfo"] },
			],
			fields: [
				{ key: "title", type: "text", label: "Bug Title", required: true, validation: { maxLength: 100 } },
				{
					key: "severity",
					type: "radio",
					label: "Severity",
					required: true,
					options: [
						{ value: "critical", label: "Critical - App crashes or data loss" },
						{ value: "major", label: "Major - Feature broken, no workaround" },
						{ value: "minor", label: "Minor - Feature broken, has workaround" },
						{ value: "trivial", label: "Trivial - Cosmetic issue" },
					],
				},
				{ key: "component", type: "text", label: "Component/Feature", helpText: "Which part of the app is affected?" },
				{
					key: "stepsToReproduce",
					type: "textarea",
					label: "Steps to Reproduce",
					required: true,
					helpText: "1. Go to...\n2. Click on...\n3. See error",
				},
				{ key: "expectedBehavior", type: "textarea", label: "Expected Behavior", required: true },
				{ key: "actualBehavior", type: "textarea", label: "Actual Behavior", required: true },
				{
					key: "browser",
					type: "select",
					label: "Browser",
					options: [
						{ value: "chrome", label: "Google Chrome" },
						{ value: "firefox", label: "Mozilla Firefox" },
						{ value: "safari", label: "Safari" },
						{ value: "edge", label: "Microsoft Edge" },
						{ value: "other", label: "Other" },
					],
				},
				{
					key: "os",
					type: "select",
					label: "Operating System",
					options: [
						{ value: "windows", label: "Windows" },
						{ value: "mac", label: "macOS" },
						{ value: "linux", label: "Linux" },
						{ value: "ios", label: "iOS" },
						{ value: "android", label: "Android" },
					],
				},
				{ key: "version", type: "text", label: "App Version", helpText: "If known" },
				{ key: "additionalInfo", type: "textarea", label: "Additional Information", helpText: "Console errors, screenshots description, etc." },
			],
		},
	},
];

export const templateCategories = [
	{ id: "general", name: "General", description: "Contact forms, newsletters, and basic forms" },
	{ id: "business", name: "Business", description: "Lead capture, job applications, and B2B forms" },
	{ id: "events", name: "Events", description: "Event registration, RSVPs, and attendance forms" },
	{ id: "feedback", name: "Feedback", description: "Customer feedback, surveys, and reviews" },
	{ id: "support", name: "Support", description: "Support tickets, bug reports, and help requests" },
] as const;

export function getTemplateById(id: string): FormTemplate | undefined {
	return formTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): FormTemplate[] {
	return formTemplates.filter((t) => t.category === category);
}












