/**
 * Shared resume profiles — single source of truth for dashboard + email digest.
 * Edit keywords here; both systems read from this config.
 */

export const RESUME_PROFILES = {
  "AI/ML Engineer": {
    color: "#8B5CF6",
    keywords: [
      "machine learning", "ml", "ai", "artificial intelligence", "deep learning",
      "neural network", "nlp", "natural language", "tensorflow", "pytorch",
      "scikit-learn", "computer vision", "llm", "large language model",
      "reinforcement learning", "generative ai", "agentic", "claude",
      "openai", "model", "inference", "training", "fine-tune", "prompt",
      "python", "classification", "regression", "transformer", "embedding",
      "spacy", "hugging face", "research", "perception", "robotics",
      "autonomous", "agent", "rl", "gpt", "diffusion", "vision"
    ],
    weight: 1.0
  },
  "BI & Operations": {
    color: "#F59E0B",
    keywords: [
      "data analyst", "analytics", "business intelligence", "power bi",
      "tableau", "sql", "dashboard", "reporting", "crm", "salesforce",
      "operations", "etl", "pipeline", "data engineer", "database",
      "postgresql", "data warehouse", "bi", "excel", "visualization",
      "metrics", "kpi", "stakeholder", "admissions", "recruitment",
      "process", "automation", "n8n", "make", "workflow", "integration",
      "api", "webhook", "supabase", "data governance", "quality"
    ],
    weight: 0.9
  },
  "Data Science Research": {
    color: "#10B981",
    keywords: [
      "data science", "data scientist", "research", "statistical",
      "statistics", "hypothesis", "monte carlo", "optimization",
      "regression", "r", "matlab", "scipy", "numpy", "pandas",
      "geospatial", "satellite", "computational", "modeling",
      "simulation", "numerical", "analysis", "quantitative",
      "experiment", "inference", "bayesian", "probability",
      "feature engineering", "prediction", "forecasting", "time series",
      "bioinformatics", "genomics", "scientific", "publication"
    ],
    weight: 0.95
  }
};

export const BONUS_KEYWORDS = [
  "remote", "python", "aws", "docker", "flask", "api",
  "supabase", "postgresql", "startup", "no sponsorship required"
];

export const EDU_LABELS = { undergrad: "Undergrad", masters: "Master's", phd: "PhD" };
export const EDU_COLORS = { undergrad: "#10B981", masters: "#3B82F6", phd: "#A855F7" };

export const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied", color: "#8B5CF6" },
  { value: "phone_screen", label: "Phone Screen", color: "#3B82F6" },
  { value: "interview", label: "Interview", color: "#F59E0B" },
  { value: "offer", label: "Offer", color: "#10B981" },
  { value: "rejected", label: "Rejected", color: "#EF4444" },
  { value: "withdrawn", label: "Withdrawn", color: "#606078" },
];
