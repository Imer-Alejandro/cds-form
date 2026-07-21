export interface SurveyQuestion {
  id: string;
  title: string;
  description?: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOX" | "RATING" | "SCALE" | "DATE" | "EMAIL" | "NET_PROMOTER_SCORE";
  required: boolean;
  order: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface SurveyResponse {
  [questionId: string]: string | string[] | number;
}

export interface DashboardStats {
  totalResponses: number;
  completedResponses: number;
  abandonedResponses: number;
  completionRate: number;
  averageCompletionTime?: number;
}

export interface SurveyFilter {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "CLOSED";
  search?: string;
  department?: string;
  sortBy?: "createdAt" | "updatedAt" | "responses";
  sortOrder?: "asc" | "desc";
}
