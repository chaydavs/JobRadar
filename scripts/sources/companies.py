"""
Curated company lists for ATS job board scraping.
Mirror of the lists in api/jobs.js — keep roughly in sync.

To add a company: find its ATS slug in the careers URL.
  Greenhouse: boards.greenhouse.io/{slug}
  Ashby:      jobs.ashbyhq.com/{slug}
"""

GREENHOUSE = [
    ("openai", "OpenAI"),
    ("anthropic", "Anthropic"),
    ("discord", "Discord"),
    ("airbnb", "Airbnb"),
    ("coinbase", "Coinbase"),
    ("databricks", "Databricks"),
    ("brex", "Brex"),
    ("doordash", "DoorDash"),
    ("cloudflare", "Cloudflare"),
    ("mongodb", "MongoDB"),
    ("datadog", "Datadog"),
    ("miro", "Miro"),
    ("gusto", "Gusto"),
    ("robinhood", "Robinhood"),
    ("plaid", "Plaid"),
    ("chime", "Chime"),
    ("scaleai", "Scale AI"),
    ("pagerduty", "PagerDuty"),
    ("hashicorp", "HashiCorp"),
    ("hubspot", "HubSpot"),
    ("zendesk", "Zendesk"),
    ("twilio", "Twilio"),
    ("elastic", "Elastic"),
    ("sendgrid", "SendGrid"),
]

ASHBY = [
    ("vercel", "Vercel"),
    ("linear", "Linear"),
    ("ramp", "Ramp"),
    ("mercury", "Mercury"),
    ("retool", "Retool"),
    ("dbtlabs", "dbt Labs"),
    ("figma", "Figma"),
    ("notion", "Notion"),
    ("posthog", "PostHog"),
    ("resend", "Resend"),
    ("cal", "Cal.com"),
]
