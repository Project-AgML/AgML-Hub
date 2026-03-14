export interface Dataset {
  name: string;
  machine_learning_task: string | null;
  agricultural_task: string | null;
  location: string | null;
  sensor_modality: string | null;
  real_or_synthetic: string | null;
  platform: string | null;
  input_data_format: string | null;
  annotation_format: string | null;
  num_images: number | null;
  documentation: string | null;
  classes: string | null;
  stats_mean: number[] | null;
  stats_std: number[] | null;
  examples_image_url: string | null;
  /** License (e.g. CC BY 4.0). From AgML source_citations.json. */
  license: string | null;
  /** BibTeX or text citation. From AgML source_citations.json. */
  citation: string | null;
}

export interface LeaderboardRow {
  dataset: string;
  task: string;
  metricName: string;
  metricValue: number;
  model?: string;
  epochs?: number;
  mAP50?: number;
  precision?: number;
  recall?: number;
}
