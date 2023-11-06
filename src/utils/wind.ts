import { skyConditions } from "aviationweather";

export function degreesToDirection(degrees: number): string {
  const directions = [
    "North",
    "North-Northeast",
    "Northeast",
    "East-Northeast",
    "East",
    "East-Southeast",
    "Southeast",
    "South-Southeast",
    "South",
    "South-Southwest",
    "Southwest",
    "West-Southwest",
    "West",
    "West-Northwest",
    "Northwest",
    "North-Northwest",
    "North",
  ];

  // Ensure degrees are within the range [0, 360)
  degrees = ((degrees % 360) + 360) % 360;

  // Calculate the index for the direction
  const index = Math.round(degrees / 22.5);

  return directions[index] ?? "-";
}

export function getSky(cover: string): string {
  return (
    skyConditions.find((t) => t.code.toLowerCase() === cover.toLowerCase())
      ?.description ?? "-"
  );
}
