"""
Curated company lists for ATS job board scraping.
Mirror of the lists in api/jobs.js — keep roughly in sync.
All slugs verified live as of 2026-05-31.

To add a company: find its ATS slug in the careers URL.
  Greenhouse: boards.greenhouse.io/{slug}
  Ashby:      jobs.ashbyhq.com/{slug}
"""

# --- Greenhouse ---
GREENHOUSE = [
    # Big tech / scale-ups
    ("openai", "OpenAI"),
    ("anthropic", "Anthropic"),
    ("discord", "Discord"),
    ("airbnb", "Airbnb"),
    ("coinbase", "Coinbase"),
    ("databricks", "Databricks"),
    ("doordash", "DoorDash"),
    ("cloudflare", "Cloudflare"),
    ("mongodb", "MongoDB"),
    ("datadog", "Datadog"),
    ("robinhood", "Robinhood"),
    ("hashicorp", "HashiCorp"),
    ("hubspot", "HubSpot"),
    ("twilio", "Twilio"),
    ("elastic", "Elastic"),
    ("stripe", "Stripe"),
    ("instacart", "Instacart"),
    ("asana", "Asana"),
    ("gitlab", "GitLab"),
    ("samsara", "Samsara"),
    ("airtable", "Airtable"),
    # Startups (well-funded, hire interns)
    ("brex", "Brex"),
    ("plaid", "Plaid"),
    ("chime", "Chime"),
    ("scaleai", "Scale AI"),
    ("affirm", "Affirm"),
    ("flexport", "Flexport"),
    ("faire", "Faire"),
    ("webflow", "Webflow"),
    ("figma", "Figma"),
    ("temporal", "Temporal"),
    ("cockroachlabs", "CockroachDB"),
    ("starburst", "Starburst"),
    ("vannevarlabs", "Vannevar Labs"),
    ("miro", "Miro"),
    ("gusto", "Gusto"),
    ("pagerduty", "PagerDuty"),
    ("zendesk", "Zendesk"),
    ("verkada", "Verkada"),
    ("hightouch", "Hightouch"),
]

# --- Ashby (very startup-heavy) ---
ASHBY = [
    # AI startups
    ("perplexity", "Perplexity"),
    ("cognition", "Cognition"),
    ("baseten", "Baseten"),
    ("sierra", "Sierra"),
    ("decagon", "Decagon"),
    ("elevenlabs", "ElevenLabs"),
    ("writer", "Writer"),
    ("harvey", "Harvey"),
    ("modal", "Modal"),
    ("langchain", "LangChain"),
    ("unstructured", "Unstructured"),
    ("vapi", "Vapi"),
    # Dev tools / infra startups
    ("vercel", "Vercel"),
    ("linear", "Linear"),
    ("retool", "Retool"),
    ("replit", "Replit"),
    ("mintlify", "Mintlify"),
    ("browserbase", "Browserbase"),
    ("supabase", "Supabase"),
    ("posthog", "PostHog"),
    ("resend", "Resend"),
    ("dbtlabs", "dbt Labs"),
    ("cal", "Cal.com"),
    # Fintech / other startups
    ("ramp", "Ramp"),
    ("mercury", "Mercury"),
    ("notion", "Notion"),
    # More AI startups (rotate interns seasonally)
    ("cohere", "Cohere"),
    ("character", "Character.AI"),
    ("pinecone", "Pinecone"),
    ("weaviate", "Weaviate"),
    ("suno", "Suno"),
    ("abridge", "Abridge"),
    ("openevidence", "OpenEvidence"),
    ("contextual", "Contextual AI"),
]
