// export default function GetAvgRating(ratingArr) {
//   if (ratingArr?.length === 0) return 0
//   const totalReviewCount = ratingArr?.reduce((acc, curr) => {
//     acc += curr.rating
//     return acc
//   }, 0)

//   const multiplier = Math.pow(10, 1)
//   const avgReviewCount =
//     Math.round((totalReviewCount / ratingArr?.length) * multiplier) / multiplier

//   return avgReviewCount
// }

export default function GetAvgRating(ratingArr) {
  if (!Array.isArray(ratingArr) || ratingArr.length === 0) return 0;

  // Filter out invalid ratings
  const validRatings = ratingArr
    .map((item) => Number(item.rating))
    .filter((rating) => !isNaN(rating));

  if (validRatings.length === 0) return 0;

  const total = validRatings.reduce((sum, rating) => sum + rating, 0);

  const multiplier = Math.pow(10, 1); // for 1 decimal point
  const avg = Math.round((total / validRatings.length) * multiplier) / multiplier;

  return avg;
}
