// Function to convert miles to kilometers
function convertToKilometers(input: string) {
  const miles = parseFloat(input);
  if (!isNaN(miles)) {
    // 1 mile is approximately 1.60934 kilometers
    return (miles * 1.60934).toFixed(2);
  }
  return "N/A"; // Not a valid number
}

export function convertVisibilityInput(input: string): string {
  let output = input;

  // Remove any leading and trailing spaces
  input = input.trim();

  // Check if the input ends with a "+" or "-"
  if (input.endsWith("+")) {
    // Replace the "+" with " or more"
    output = input.replace(/\+$/, " or more");
  } else if (input.endsWith("-")) {
    // Replace the "-" with " or less"
    output = input.replace(/-$/, " or less");
  }

  // Add units to the output, assuming "sm" and "km" as units
  output = `${output} sm (${convertToKilometers(output)} km)`;

  return output;
}
