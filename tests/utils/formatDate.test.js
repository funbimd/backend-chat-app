const formatDate = require("../../utils/formatDate");

describe("formatDate utility", () => {
  it("should format a Date object as YYYY-MM-DD", () => {
    const date = new Date(2023, 4, 9); // May 9, 2023 (month is 0-based)
    expect(formatDate(date)).toBe("2023-05-09");
  });

  it("should format a date string as YYYY-MM-DD", () => {
    expect(formatDate("2022-12-01")).toBe("2022-12-01");
    expect(formatDate("March 3, 2021")).toBe("2021-03-03");
  });

  it("should format a timestamp as YYYY-MM-DD", () => {
    const timestamp = new Date("2020-01-15").getTime();
    expect(formatDate(timestamp)).toBe("2020-01-15");
  });

  it("should pad single-digit months and days with zeros", () => {
    expect(formatDate("2023-2-5")).toBe("2023-02-05");
    expect(formatDate("2023-11-3")).toBe("2023-11-03");
  });

  it("should handle invalid dates and return NaN-NaN-NaN", () => {
    expect(formatDate("invalid-date")).toBe("NaN-NaN-NaN");
    expect(formatDate(undefined)).toBe("NaN-NaN-NaN");
  });
});
