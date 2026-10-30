# process_data.R
# Prepares aggregated metrics and question breakdowns for the Interactive Brain website

library(tidyverse)
library(jsonlite)

data_path <- "data/ai_cognitive_dependence.csv"
if (!file.exists(data_path)) {
  stop("Data file not found at ", data_path)
}

df <- read_csv(data_path, show_col_types = FALSE)

scale_map <- c(
  "Strongly Disagree" = 1,
  "Disagree" = 2,
  "Neutral" = 3,
  "Agree" = 4,
  "Strongly Agree" = 5
)

clean_q_name <- \(col) {
  str_replace(col, "^[^\\[]+\\[(.*)\\]$", "\\1")
}

region_defs <- list(
  pfc = list(
    id = "pfc",
    name = "Prefrontal Cortex",
    short = "PFC",
    color = "#8b5cf6",
    color_rgb = "139, 92, 246",
    domain = "Critical Thinking",
    role = "Executive function, abstract reasoning, analytical problem-solving, and cognitive effort.",
    neuro_note = "Excessive cognitive offloading to generative AI reduces active prefrontal engagement, diminishing the neural drive for deep analytical synthesis and independent problem solving.",
    prefix = "Critical Thinking"
  ),
  hippocampus = list(
    id = "hippocampus",
    name = "Hippocampus",
    short = "Hippocampus",
    color = "#10b981",
    color_rgb = "16, 185, 129",
    domain = "Academic Decision-Making",
    role = "Episodic memory formation, knowledge consolidation, and academic trajectory planning.",
    neuro_note = "Relying on AI to suggest topics, organize learning, and plan study cycles bypasses hippocampal encoding loops that are fundamental to consolidating durable academic knowledge.",
    prefix = "Academic Decision-Making"
  ),
  acc = list(
    id = "acc",
    name = "Anterior Cingulate Cortex",
    short = "ACC",
    color = "#f43f5e",
    color_rgb = "244, 63, 94",
    domain = "Trust in AI",
    role = "Conflict monitoring, error detection, epistemic vigilance, and intellectual skepticism.",
    neuro_note = "High trust and rarely verifying AI output indicates decreased anterior cingulate conflict signaling, allowing algorithmic errors and hallucinations to pass without cognitive resistance.",
    prefix = "Trust in AI"
  ),
  nac = list(
    id = "nac",
    name = "Nucleus Accumbens",
    short = "Nucleus Accumbens",
    color = "#f59e0b",
    color_rgb = "245, 158, 11",
    domain = "Cognitive Dependence",
    role = "Reward circuitry, dopamine reinforcement, convenience habituation, and workflow reliance.",
    neuro_note = "Instantaneous AI completion creates effortless reward loops in the ventral striatum, conditioning the student brain into uncomfortable withdrawal when AI is unavailable.",
    prefix = "Cognitive Dependence"
  ),
  parietal = list(
    id = "parietal",
    name = "Parietal Cortex",
    short = "Parietal Cortex",
    color = "#0ea5e9",
    color_rgb = "14, 165, 233",
    domain = "AI Usage",
    role = "Tool handling, multisensory task coordination, and execution of academic assignments.",
    neuro_note = "The parietal network mediates practical tool use and task execution. High regular usage across assignments reflects structural integration of AI into students day-to-day work habits.",
    prefix = "AI Usage"
  )
)

categories <- c("Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree")

region_data <- map(region_defs, \(reg) {
  q_cols <- names(df)[str_starts(names(df), fixed(reg$prefix))]
  
  # Question breakdown
  questions <- map(q_cols, \(col) {
    vec <- df[[col]]
    counts <- map_int(categories, \(cat) sum(vec == cat, na.rm = TRUE))
    names(counts) <- categories
    total <- sum(counts)
    pcts <- round(100 * counts / total, 1)
    
    num_vals <- scale_map[vec]
    mean_val <- round(mean(num_vals, na.rm = TRUE), 2)
    agree_pct <- round(100 * sum(vec %in% c("Agree", "Strongly Agree"), na.rm = TRUE) / total, 1)
    
    list(
      question = clean_q_name(col),
      mean = mean_val,
      agree_pct = agree_pct,
      distribution = as.list(counts),
      percentages = as.list(pcts)
    )
  })
  
  # Overall region metrics
  num_mat <- df |>
    select(all_of(q_cols)) |>
    mutate(across(everything(), \(x) scale_map[x])) |>
    as.matrix()
  
  respondent_means <- rowMeans(num_mat, na.rm = TRUE)
  reg_mean <- round(mean(respondent_means, na.rm = TRUE), 2)
  reg_sd <- round(sd(respondent_means, na.rm = TRUE), 2)
  reg_high_pct <- round(100 * mean(respondent_means >= 3.5, na.rm = TRUE), 1)
  
  # By Academic Level
  by_level <- df |>
    mutate(score = respondent_means) |>
    group_by(`Academic Level`) |>
    summarize(
      mean = round(mean(score, na.rm = TRUE), 2),
      n = n(),
      .groups = "drop"
    )
  
  # By University Type
  by_uni <- df |>
    mutate(score = respondent_means) |>
    group_by(`University Type`) |>
    summarize(
      mean = round(mean(score, na.rm = TRUE), 2),
      n = n(),
      .groups = "drop"
    )

  # By Gender
  by_gender <- df |>
    mutate(score = respondent_means) |>
    group_by(Gender) |>
    summarize(
      mean = round(mean(score, na.rm = TRUE), 2),
      n = n(),
      .groups = "drop"
    )

  c(reg, list(
    mean_score = reg_mean,
    sd_score = reg_sd,
    high_dependence_pct = reg_high_pct,
    questions = questions,
    by_academic_level = by_level,
    by_university_type = by_uni,
    by_gender = by_gender
  ))
})

overall_meta <- list(
  sample_size = nrow(df),
  genders = as.list(table(df$Gender)),
  levels = as.list(table(df$`Academic Level`)),
  universities = as.list(table(df$`University Type`)),
  top_departments = as.list(head(sort(table(df$`Department/Discipline`), decreasing = TRUE), 8))
)

output <- list(
  metadata = overall_meta,
  regions = region_data
)

write_json(output, "data/brain_data.json", pretty = TRUE, auto_unbox = TRUE)
cat("Processed data successfully written to data/brain_data.json\n")
