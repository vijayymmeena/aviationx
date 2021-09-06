const LESS_THAN_TWENTY = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

export const num2word = (num: number): string => {
  return LESS_THAN_TWENTY[num] ?? "invalid";
};

export const numSpoke = (num: number): string => {
  return num
    .toString()
    .split("")
    .map((r) => num2word(Number(r)))
    .map((w) => {
      if (w === "invalid") return "point";
      return w;
    })
    .join(" ");
};
