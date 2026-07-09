export type GoogleReview = {
  reviewId: string | null;
  reviewer: {
    profilePhotoUrl: string;
    displayName: string;
    isAnonymous: boolean;
  };
  starRating: number;
  comment: string;
  createTime: string | null;
  updateTime: string | null;
};

export type PlaceSummary = {
  id: string;
  name: string;
  formattedAddress: string;
  averageRating: number | null;
  totalReviewCount: number | null;
  profileUrl: string | null;
};

export type PlaceReviewsPayload = {
  place: PlaceSummary;
  reviews: GoogleReview[];
};
